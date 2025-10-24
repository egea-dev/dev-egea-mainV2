# Fase 1 – Integridad de datos y normalización

## Objetivo
- Garantizar que los datos consumidos por el dashboard y el calendario de instalaciones sean coherentes y estén normalizados antes de modificar UI o añadir estados nuevos.
- Corregir inconsistencias en la lógica “Maps ON/OFF” mediante una única fuente de verdad para ubicaciones (strings y coordenadas).
- Reducir la huella de consultas (Supabase/PostgREST) y preparar tests que aseguren la nueva normalización.

## Alcance y sistemas implicados
- **Tablas/vistas**: `screen_data`, `detailed_tasks`, `screens`, `task_profiles`, `task_vehicles`.
- **Hooks**: `src/hooks/use-detailed-tasks.ts`, `src/hooks/use-installations.ts`, `src/hooks/use-work-session.ts` (para validar dependencias con ubicaciones).
- **Utilidades**: `src/utils/task.ts` (`normalizeTaskLocation`), `src/utils/maps.ts`.
- **Componentes**: sección pendiente del `Admin.tsx` (badges Maps), tarjetas Confección/Tapicería (resaltados dependen de estado normalizado).
- **SQL/RPC**: confirmar que `work_sessions_functions.sql` y `work_sessions_incidents_locations.sql` siguen usando campos coherentes (ubicación en JSON).

## Trabajo planificado
1. **Auditoría de campos y mapping**  
   - Extraer metadatos de `screen_data` y `detailed_tasks` (tipos, defaults, RLS relevantes).  
   - Documentar en tabla de referencia qué columnas alimentan `locationLabel`, `siteLabel`, `assigned_profiles` y estados (`state`, `status`).  
   - Verificar si existen disparadores o materializaciones que mantengan `detailed_tasks` actualizado al modificar `screen_data`.

2. **Definir normalización canónica de ubicaciones**  
   - Diseñar helper que reciba un `DetailedTask` y devuelva `{ label, coordinates?, url }`, reutilizando `normalizeTaskLocation` + `buildMaps*`.  
   - Decidir precedencia de campos (`screen_data.location`, `data->site`, `data->address`, `task_profiles`?) y registrar la regla.  
   - Identificar registros con `location` inválido (null, texto vacío, strings tipo `"N/A"`) para planear backfill/manual fix.

3. **Corregir lógica Maps ON/OFF**  
   - Reemplazar comprobaciones dispersas por `hasValidLocation` derivado del helper anterior.  
   - Determinar si el toggle debe apoyarse también en coordenadas guardadas en `metadata` o `work_sessions`.  
   - Preparar fallback UI (tooltip o badge “Ubicación pendiente”) cuando no existan datos válidos.

4. **Optimizar consultas y hooks**  
   - Revisar `useInstallations`: ajustar `select` para evitar traer columnas no utilizadas; convertir `planId` estático en dependencia real o removerlo.  
   - Evaluar suscripción realtime: filtrar por `event` específico o desplazar a `screen_data`-`detailed_tasks` consistente para reducir tráfico.  
   - En `useDashboardTasks`, centralizar filtros por estado/ubicación y evitar filtrado redundante en cliente si se puede parametrizar la vista.  
   - Preparar memoización/utilización de `useMemo` donde proceda para minimizar renders al normalizar datos.

5. **Plan de saneamiento de datos**  
   - Diseñar script SQL/consulta para detectar valores anómalos (`state` fuera del conjunto esperado, fechas invertidas, `assigned_profiles` vacíos cuando `state` ≠ terminado).  
   - Enumerar acciones correctivas (backfill, migración puntual, validaciones en triggers) y decidir si forman parte de la fase o se delegan a operaciones.

6. **Diseño de pruebas**  
   - Unit tests para helpers de normalización (`normalizeTaskLocation`, nuevo helper `resolveTaskLocationData`).  
   - Tests de hook con mock Supabase (React Testing Library + MSW/spy) para validar filtros de `useInstallations`.  
   - Checklist manual: comparar dataset antes/después en Admin (`Maps ON/OFF`, badges resaltados) y calendario de instalaciones según estados.

## Entregables
- Documento de mapping (puede ser tabla en `docs/fase1.md` ampliado o anexo CSV).  
- Helper(s) de normalización + refactor en hooks/Componentes (cuando se autorice implementación).  
- Scripts/queries de diagnóstico (guardar en `supabase/sql/diagnostics_fase1.sql` o similar).  
- Suite de tests actualizada (`__tests__/utils/task-location.test.ts`, `__tests__/hooks/use-installations.test.tsx`).  
- Checklist de QA específico para mapas e instalaciones.

## Dependencias y riesgos
- Necesitamos confirmación de campos reales en `screen_data.data` (depende de migraciones previas) y acceso a ejemplos de datos.  
- Cambios en la vista `detailed_tasks` impactan endpoints existentes; coordinar con fases posteriores para evitar regresiones.  
- Actualizar RLS/funciones puede requerir despliegue coordinado con Supabase (ventana controlada).

## Métricas de éxito
- 100 % de tareas relevantes muestran estado consistente y `Maps ON/OFF` correcto tras normalización (según muestra de QA).  
- Reducción del payload medio de la consulta en `useInstallations` (objetivo ≥20 %).  
- Tests nuevos cubren al menos los casos de ubicación que provocaban errores.  
- No se registran advertencias en consola relacionadas con ubicaciones o estados durante smoke test.

## Próximos pasos
1. Validar este plan contigo y ajustar prioridades (p.ej., si el backfill de ubicaciones debe adelantarse).  
2. Preparar queries de auditoría y la tabla de mapeo de campos (iniciará la fase).  
3. Tras tu aprobación, implementar helpers/tests y correcciones en hooks antes de tocar componentes de UI.

---

## 1. Mapeo de campos clave

| Flujo / Uso | Campo principal | Alternativas / Fallback | Normalización actual | Observaciones |
|-------------|-----------------|-------------------------|-----------------------|---------------|
| Badge `Maps ON/OFF` (Admin) | `screen_data.location` | `detailed_tasks.site`, `detailed_tasks.address`, `detailed_tasks.data->>'location'`, `detailed_tasks.data->>'address'`, `detailed_tasks.data->>'direccion'`, `detailed_tasks.data->>'ubicacion'` | `normalizeTaskLocation` recorre array fija de candidatos y delega a `formatLocationLabel` | No diferencia entre URL y etiqueta; no detecta coordenadas explícitas. |
| Calendario Instalaciones | `detailed_tasks.start_date` / `end_date` | `screen_data.start_date` (origen), `screen_data.state` | `useInstallations` filtra `state != 'terminado'` y ordena en cliente | Escribe en `screen_data` al mover eventos; depende de sincronía vista-vista. |
| Responsable/Operarios asignados | `detailed_tasks.assigned_profiles` (jsonb) | `task_profiles` join | `normalizeAssignedProfiles` valida id/full_name | Vista `detailed_tasks` arma JSON ordenado; cambios requieren refresh de vista. |
| Estados para tarjetas destacadas | `detailed_tasks.state` | — | Comparación manual a strings (`urgente`, `incidente`, `arreglo`) | Necesita incluir nuevo estado `incidencia` sin romper normalización histórica. |
| Vehículos | `detailed_tasks.assigned_vehicles` | `task_vehicles` join, `detailed_tasks.vehicle_type` | `normalizeAssignedVehicles` limpia id/name | Para `Maps ON/OFF` no aplica, pero se usa en la misma tabla. |
| Sesiones activas | `work_sessions.status`, `started_at`, `ended_at` | — | `useDashboardTasks` consolida en `sessionInfoByTask` | Cualquier backfill de fechas debe mantener integridad con tareas. |

### Resumen de triggers/vistas
- `detailed_tasks` se actualiza cada vez que se modifica `screen_data` mediante `20251011071500_refresh_detailed_tasks_view.sql`. No hay trigger directo, se apoya en vista que consulta `screen_data` + joins; cualquier actualización en `screen_data` es visible inmediatamente.
- `screen_data` cuenta con trigger `handle_screen_data_updated_at` (ver `migrations/20251006010000_create_core_tables.sql`) que mantiene `updated_at`.

## 2. Helper de normalización propuesto

Diseñar función `resolveTaskLocation(task: DetailedTask | Task)` que retorne un objeto:

```ts
type ResolvedTaskLocation = {
  rawLabel: string | null;
  normalizedLabel: string | null;
  coordinates: { lat: number; lng: number } | null;
  url: string | null;
  source: 'screen_data.location' | 'data.location' | 'data.address' | 'data.site' | 'fallback';
};
```

Reglas:
- Prioridad de campos: `screen_data.location` → `data.location` → `data.address` → `data.direccion` → `data.ubicacion` → `task.site` → `task.address` → `task.client`.
- Detectar coordenadas con `extractCoordinates` (ya usada por `buildMapsSearchUrl`) para poblar `coordinates`.
- `normalizedLabel` usará `formatLocationLabel` si el valor no es URL; si es URL, el label se mantiene como `rawLabel`.
- `url` será:
  - Valor original si ya es URL válida (http/maps).
  - `buildMapsSearchUrl(normalizedLabel)` si hay texto.
  - `null` si no se obtiene dato válido.

Uso previsto:
- `Admin.tsx`: badge `Maps ON/OFF` se reemplaza por comprobación `resolved.url !== null`.
- `useInstallations`: filtrar o mostrar `resolved.normalizedLabel`; evitar que strings inválidas (e.g., `"N/A"`, `"--"`) activen Maps.
- `use-work-session`: aprovechar `resolved.coordinates` como fallback para `start_location`.

### Casuística a cubrir en tests
- Strings vacíos o `"N/A"` → retornan `null`.
- Coordenadas `"-34.62,-58.38"` → `coordinates` detectadas, URL de direcciones con lat/lng.
- URLs de Google Maps → `url` igual al original, label limpio.
- Campos en `task.data` con claves en mayúsculas/minúsculas → normalizar buscando variantes (`location`, `Location`, `LOCATION`).

## 3. Queries de auditoría (diagnóstico inicial)

Archivo sugerido: `supabase/sql/diagnostics_fase1.sql` con:
- Conteo de tareas por estado y detección de estados fuera de lista esperada (`urgente`, `incidente`, `arreglo`, `terminado`, `en fabricacion`, `a la espera`, `pendiente`).
- Listado de tareas con `location` nulo pero `data->>'address'` o `data->>'site'` presente (para evaluar backfill).
- Listado de tareas con `location` presente pero que contenga textos inválidos (`'N/A'`, `'sin direccion'`, `'pendiente'`).
- Conteo de tareas en `detailed_tasks` sin perfiles asignados pese a no estar terminadas (posible anomalía para vista operario).

## 4. Checklist previo a implementación
- Ejecutar queries de auditoría y archivar resultados (capturas o CSV).
- Validar con dataset real la prioridad de campos propuesta.
- Confirmar que `work_sessions` almacena `start_location`/`end_location` como JSON (reafirmado en `work_sessions_functions.sql`) para que el helper pueda extenderse si se decide serializar coordenadas.

## Resultados preliminares de auditoría
- **Tareas activas sin operarios asignados:** más de 80 registros con `state` pendiente/arreglo y `profiles_assigned = 0`, concentrados en `screen_id` `cdfab21f-…`, `ce7a171f-…`, `febc2fc8-…` y casos aislados como `a1e24d68-…`. Requiere confirmar con negocio si deben asignarse automáticamente o cerrarse.
- **Estados fuera de catálogo:** pendientes de análisis; ejecutar segunda query para validar si existen valores adicionales antes de introducir `INCIDENCIA`.
- **Ubicaciones inconsistentes:** aún sin revisar; comparar resultados con umbral tolerable y planear backfill (`location` vacía pero con `data->>'address'` o `site`).

### Seguimiento sugerido
- Definir corrección para inserciones masivas que omiten `task_profiles` (trigger o proceso ETL).
- Mostrar badge “Sin operario asignado” en UI para estas tareas mientras se corrigen datos.
- Registrar any acciones de limpieza aplicadas antes de pasar a Fase 2 para mantener trazabilidad.
