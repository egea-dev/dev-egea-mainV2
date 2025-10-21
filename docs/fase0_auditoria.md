# Fase 0 · Auditoría y Cimientos

## 1. Flujo actual de check-in

### Frontend (`src/pages/WorkdayPage.tsx`)
- El botón **"Registrar llegada"** ejecuta `handleCheckIn`, que llama a la RPC `update_user_session` pasando el `profile.id` y el `navigator.userAgent`.
- El mensaje de estado *"Estado actual: En turno"* y la referencia al "último check-in" son literales estáticos; no existe lectura real de la sesión ni del último registro.
- No se muestra ningún indicador de sesión activa ni un botón alternativo de *check-out*. La UI siempre ofrece el mismo CTA, aun cuando el usuario ya se marcó como activo.
- No se captura ubicación ni contexto adicional (dispositivo, coordenadas, tarea asociada).

### Presencia en hooks (`src/hooks/use-communications.ts`)
- `useUserPresence` usa la misma RPC `update_user_session` mediante un `setInterval` cada 2 minutos y fuerza `mark_user_offline` al desmontar.
- El estado de presencia se basa en la tabla `user_sessions`, pero sólo almacena `is_online`, `last_seen`, `user_agent` e `ip_address`. No diferencia entre check-in laboral y simple actividad en la app.

### RPC `update_user_session` (`supabase/migrations/20251006000004_create_communications_tables.sql`)
- Inserta (o actualiza) una fila en `user_sessions` y marca `is_online = TRUE`, actualizando `last_seen`.
- Usa `ON CONFLICT (profile_id)` para hacer *upsert*, por lo que solo existe una fila por usuario. No hay historial de sesiones ni timestamps separados de inicio/fin.
- No retorna datos adicionales (p. ej. token de sesión, ubicación, tarea relacionada). El botón del frontend tampoco espera información para decidir mostrar *check-out*.

**Conclusiones iniciales**
- El check-in actual es en realidad un “ping” de presencia; no distingue entre entrar/salir del turno ni registra duración.
- No se preserva un historial de sesiones, lo que impedirá calcular métricas o auditar asistencias.
- Será necesario separar claramente presencia en tiempo real y sesiones laborales (`work_sessions`) antes de implementar el flujo bidireccional.

## 2. Bug en cambios de estado de tareas

- Las tareas por fecha se cargan con `useTasksByDate` y un `queryKey` formado por `['tasks', dateString]` (`src/hooks/use-supabase.ts:85-103`).
- Los hooks que mutan estado, como `useUpdateTaskState` y `useArchiveTask`, invalidan únicamente `['tasks']` sin el sufijo de fecha (`src/hooks/use-supabase.ts:218-244`).
- Resultado: tras marcar una tarea como `"terminado"` o archivarla, React Query no vuelve a solicitar `['tasks', <fecha>]`, dejando la UI desincronizada hasta un `refetch` manual (o un cambio de fecha).
- `TaskDialog` usa la RPC `upsert_task`, fija `p_state` y `p_status` en `"pendiente"` y confía en un `onSuccess` externo (`src/components/installations/TaskDialog.tsx:129-165`). Si se edita una tarea ya completada, se sobreescribe el estado y, además, se desencadena el mismo problema de invalidación.

**Acciones recomendadas**
1. Ajustar todas las invalidaciones relacionadas con tareas para incluir la fecha (`['tasks', dateString]`) o utilizar `queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })`.
2. Permitir que `TaskDialog` respete `task.state`/`task.status` entrantes o que el backend compute la transición adecuada.
3. Añadir pruebas manuales/regresión que cubran edición y archivado de tareas consecutivos.

## 3. Hooks de comunicaciones: latencia y cuellos de botella

### `useDirectMessages` (`src/hooks/use-direct-messages.ts`)
- `fetchConversations` consulta **toda** la tabla `direct_messages` para el usuario actual (sin `limit` ni paginación) y ordena descendente (`.order('created_at', { ascending: false })`). En entornos con historial largo, esta consulta crecerá linealmente.
- El hook vuelve a ejecutar `fetchConversations` en cada mensaje recibido por Realtime y tras cada envío, provocando múltiples lecturas completas en periodos cortos.
- No hay `select` diferenciado para el destinatario; la consulta trae el `sender` pero no el `recipient`, limitando información útil.
- El conteo de no leídos depende de la RPC `get_unread_count` llamada tras cada evento, sin *debounce*; puede saturar el backend en chats activos.

**Ideas de optimización**
1. Reemplazar la consulta masiva por una RPC/materialized view que devuelva conversaciones agregadas con `last_message` y `unread_count`.
2. Añadir paginación (por ejemplo, cargar solo los últimos N contactos y permitir `fetchNextPage`).
3. Cachear resultados en React Query y usar actualizaciones locales al recibir eventos Realtime.

### `useCommunicationLogs` (`src/hooks/use-communications.ts:318-368`)
- Aplica `.limit(50)` pero sin mecanismo para paginar históricamente; los usuarios no pueden navegar más allá de los 50 registros más recientes.
- El filtro por `profileId` construye un `OR` manual con expresiones sobre `metadata->>` (JSON). Sin índices en `metadata`, Supabase ejecuta un `seq scan` que se degrada cuando los logs crezcan.
- Cada llamada vuelve a normalizar objetos aunque sólo se use un subconjunto en la vista de operario.

**Ideas de optimización**
1. Definir índices parciales sobre las rutas JSON más consultadas (`(metadata->>'profile_id')`, etc.) y/o almacenar esos valores en columnas denormalizadas.
2. Exponer una RPC que encapsule la lógica de filtros y permita `range`/`cursor` para paginar.
3. Reducir el payload en vistas operario (select explícito de columnas necesarias).

## 4. Propuesta inicial de tablas y metadatos

### 4.1 `work_sessions`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | `default uuid_generate_v4()` |
| `profile_id` | `uuid` FK→`profiles.id` | Operario que inicia la sesión |
| `task_id` | `uuid` FK→`screen_data.id` opcional | Vincula la sesión a una tarea activa |
| `started_at` / `ended_at` | `timestamptz` | `ended_at` nullable hasta check-out |
| `start_location` / `end_location` | `geography(Point, 4326)` o `jsonb` | Guardar lat/lng y precisión |
| `device_info` | `jsonb` | User-agent, app version, modo |
| `status` | `text` | `active`, `completed`, `aborted` |
| `metadata` | `jsonb` | Campos flexibles (turno, notas) |
| `created_at` / `updated_at` | `timestamptz` | Trigger para mantener consistencia |

**Apoyos**
- RPC `start_work_session(profile_id, task_id, location, device)` → crea fila y cierra sesiones activas previas.
- RPC `end_work_session(session_id, location)` → fija `ended_at`, `status`.
- Índices: `(profile_id, status)`, `(task_id)`, `GIN` sobre `metadata`.

### 4.2 `incident_reports`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `session_id` | `uuid` FK→`work_sessions.id` | Garantiza que haya sesión activa |
| `reported_by` | `uuid` FK→`profiles.id` | Operario autor |
| `incident_type` | `text` | Catálogo acordado con negocio |
| `severity` | `text` | `low`, `medium`, `high`, `critical` |
| `description` | `text` | Formulario rápido |
| `attachments` | `jsonb` | URLs de archivos/fotos |
| `status` | `text` | `new`, `in_review`, `resolved` |
| `metadata` | `jsonb` | Campos específicos (equipo, turno) |
| `created_at` / `updated_at` | `timestamptz` | |

**Complementos**
- Tabla relacional `incident_events` (estado, actor, nota, timestamp) para auditoría.
- Vista o RPC para mostrar incidentes asociados a la tarea en *“Ver detalles”*.

### 4.3 `location_updates`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `session_id` | `uuid` FK→`work_sessions.id` nullable | Permite peticiones fuera de sesión |
| `profile_id` | `uuid` FK→`profiles.id` | Quien recibe/aplica la ubicación |
| `requested_by` | `uuid` FK→`profiles.id` | Usuario administrador que envía |
| `location` | `geography(Point, 4326)` o `jsonb` | lat/lng, precisión, proveedor |
| `note` | `text` | Instrucciones adicionales |
| `delivery_channel` | `text` | `in_app`, `whatsapp`, etc. |
| `acknowledged_at` | `timestamptz` | Cuando el operario confirma |
| `expires_at` | `timestamptz` | Para caducar órdenes viejas |
| `metadata` | `jsonb` | Campos extensibles |
| `created_at` | `timestamptz` | |

**Realtime**
- Canal `location_updates` para avisar al operario y al panel admin.
- RPC `send_location_update(requested_by, profile_id, location, note)` que registre y dispare notificación.

### 4.4 Metadatos compartidos
- Definir catálogo `incident_types` y `session_reasons` administrable (tabla + seeds).
- Reutilizar `metadata` como JSON controlado, pero mover a columnas físicas los campos que participen en filtros frecuentes.
- Documentar en el “plan maestro” cómo se relacionan sesiones, incidentes y ubicaciones con tareas y comunicaciones.

---

Estos hallazgos y propuestas cubren el alcance de la Fase 0 y habilitan el arranque de la Fase 1 (sesiones bidireccionales) y la Fase 2 (incidencias) con menor incertidumbre técnica.
