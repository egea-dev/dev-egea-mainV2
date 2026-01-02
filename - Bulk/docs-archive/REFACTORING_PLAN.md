# Plan de Refactorización - Egea Productivity App
## Alpha v1.3 - Roadmap Completo

> **Objetivo General**: Refactorizar y evolucionar la aplicación Egea Productivity para convertirla en una herramienta de gestión robusta, eficiente y escalable.

---

## 📊 Estado Actual del Proyecto

### Estructura de Archivos
- **Framework**: React 18.3 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Estado**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **DnD**: @dnd-kit/core + @dnd-kit/sortable
- **Calendarios**: FullCalendar + date-fns + dayjs

### Páginas Actuales
- `/` - Index.tsx (Landing)
- `/auth` - Auth.tsx (Login/Registro)
- `/admin` - Admin.tsx (Dashboard principal)
- `/admin/installations` - Installations.tsx (Planificación)
- `/admin/data` - DataEntry.tsx (Gestión de datos)
- `/admin/screens` - Display.tsx (Pantallas)
- `/admin/templates` - (No implementado aún)
- `/admin/users` - UsersAndVehiclesPage.tsx (Usuarios y vehículos)
- `/admin/archive` - ArchivePage.tsx (Historial)
- `/admin/settings` - SettingsPage.tsx (Configuración)
- `/shared-plan/:token` - SharedPlanPage.tsx (Plan compartido)

### Componentes Existentes
✅ Ya implementados:
- `StatusBadge.tsx` - Badge para estado de operarios
- `VehicleBadge.tsx` - Badge para vehículos
- `TaskStateBadge.tsx` - Badge para estado de tareas
- Sistema de semáforos en `src/lib/constants.ts`

### Migraciones SQL Existentes
- `20251006000000_unified_rls_policies.sql` ✅ (Nuevo, sin aplicar)
- `20251006000001_create_detailed_tasks_view.sql` ✅ (Nuevo, sin aplicar)
- `20251006000002_indexes_and_cron_jobs.sql` ✅ (Nuevo, sin aplicar)
- Múltiples migraciones anteriores con RLS y políticas

---

## 🏗️ PARTE 1: CIMIENTOS DE LA ARQUITECTURA Y EL DISEÑO

### 1.1. Infraestructura y Backend (Supabase)

#### 1.1.1. Estrategia de Seguridad (RLS) Unificada
**Estado**: ✅ Migración creada, ⏳ Pendiente de aplicar

**Archivo**: `supabase/migrations/20251006000000_unified_rls_policies.sql`

**Tareas**:
- [x] Crear función `is_admin()` con SECURITY DEFINER
- [x] Establecer política base: "Lectura para todos los autenticados"
- [x] Crear política global: "CRUD solo para administradores"
- [x] Añadir excepciones (usuario edita su perfil, etc.)
- [ ] **ACCIÓN REQUERIDA**: Revisar y aplicar la migración con `npx supabase db push`
- [ ] **ACCIÓN REQUERIDA**: Probar todas las políticas en Supabase Dashboard
- [ ] **ACCIÓN REQUERIDA**: Eliminar scripts SQL de corrección antiguos tras validar

**Beneficios**:
- Elimina recursividad infinita en RLS
- Simplifica mantenimiento
- Aumenta seguridad

---

#### 1.1.2. Optimización de Consultas con Vistas
**Estado**: ✅ Migración creada, ⏳ Pendiente de aplicar

**Archivo**: `supabase/migrations/20251006000001_create_detailed_tasks_view.sql`

**Tareas**:
- [x] Crear vista `detailed_tasks`
- [x] Pre-unir `screen_data` con `profiles` y `vehicles`
- [x] Aplanar campos JSON (`data.site -> site`)
- [ ] **ACCIÓN REQUERIDA**: Aplicar migración
- [ ] **ACCIÓN REQUERIDA**: Refactorizar frontend para usar `SELECT * FROM detailed_tasks` en lugar de joins manuales
- [ ] **ACCIÓN REQUERIDA**: Medir mejora de rendimiento (tiempo de carga)

**Archivos Frontend a Modificar**:
- `src/pages/Installations.tsx`
- `src/pages/Admin.tsx`
- `src/components/installations/DailyTaskTable.tsx`
- `src/components/installations/AllTasksTable.tsx`

**Beneficios**:
- Reduce complejidad de queries en frontend
- Mejora rendimiento
- Facilita mantenimiento

---

#### 1.1.3. Mantenimiento Automatizado (Cron Jobs)
**Estado**: ✅ Migración creada, ⏳ Pendiente de aplicar

**Archivo**: `supabase/migrations/20251006000002_indexes_and_cron_jobs.sql`

**Tareas**:
- [x] Crear tabla `archived_tasks`
- [x] Crear función `archive_completed_tasks()`
- [x] Configurar Cron Job diario (pg_cron)
- [x] Crear índices en `start_date`, `end_date`, `screen_group`
- [ ] **ACCIÓN REQUERIDA**: Aplicar migración
- [ ] **ACCIÓN REQUERIDA**: Verificar que pg_cron está habilitado en Supabase
- [ ] **ACCIÓN REQUERIDA**: Monitorear logs del Cron Job

**Beneficios**:
- Mantiene `screen_data` limpia
- Mejora velocidad de queries
- Automatiza archivado

---

#### 1.1.4. Lógica de Servidor con Edge Functions
**Estado**: ❌ No implementado

**Archivo**: `supabase/functions/send-whatsapp-notification/index.ts`

**Tareas**:
- [ ] Crear Edge Function `send-whatsapp-notification`
- [ ] Integrar con API de mensajería (Twilio/WhatsApp Business)
- [ ] Almacenar claves de API de forma segura (Supabase Secrets)
- [ ] Crear endpoint para invocar función desde frontend
- [ ] Implementar autenticación con JWT
- [ ] Añadir logs y manejo de errores

**Comandos**:
```bash
npx supabase functions new send-whatsapp-notification
npx supabase secrets set TWILIO_ACCOUNT_SID=xxx
npx supabase secrets set TWILIO_AUTH_TOKEN=xxx
npx supabase secrets set TWILIO_WHATSAPP_NUMBER=xxx
npx supabase functions deploy send-whatsapp-notification
```

**Beneficios**:
- Seguridad (claves no en frontend)
- Escalabilidad
- Control centralizado

---

### 1.2. Framework Visual y de Componentes

#### 1.2.1. Sistema de Semáforos Centralizado
**Estado**: ✅ Implementado en `src/lib/constants.ts`

**Archivo**: [src/lib/constants.ts](src/lib/constants.ts)

**Semáforos Definidos**:
✅ **Instalaciones**:
  - URGENTE → Rojo
  - EN_FABRICACION → Naranja
  - A_LA_ESPERA → Azul
  - TERMINADO → Verde

✅ **Tapicería**:
  - EN_FABRICACION → Morado
  - A_LA_ESPERA → Amarillo

✅ **Usuarios**:
  - ACTIVO → Verde
  - VACACIONES → Naranja
  - BAJA → Rojo

✅ **Vehículos**:
  - JUMPER → Azul claro
  - CAMION → Amarillo claro
  - FURGONETA → Morado claro
  - OTRO → Gris

**Tareas**:
- [x] Definir constantes de semáforos
- [x] Crear funciones helper (getTaskStateColor, getUserStatusColor, etc.)
- [ ] **ACCIÓN REQUERIDA**: Revisar y ajustar colores según imagen de referencia
- [ ] **ACCIÓN REQUERIDA**: Añadir estados adicionales si es necesario (ej: INCIDENTE, ARREGLO)

---

#### 1.2.2. Componentes de Estado Reutilizables
**Estado**: ✅ Implementados

**Archivos**:
- [src/components/badges/StatusBadge.tsx](src/components/badges/StatusBadge.tsx)
- [src/components/badges/VehicleBadge.tsx](src/components/badges/VehicleBadge.tsx)
- [src/components/badges/TaskStateBadge.tsx](src/components/badges/TaskStateBadge.tsx)

**Tareas**:
- [x] Crear `StatusBadge.tsx`
- [x] Crear `VehicleBadge.tsx`
- [x] Crear `TaskStateBadge.tsx`
- [ ] **ACCIÓN REQUERIDA**: Revisar diseño visual (tamaño, padding, bordes)
- [ ] **ACCIÓN REQUERIDA**: Añadir iconos opcionales a los badges
- [ ] **ACCIÓN REQUERIDA**: Implementar variantes (outline, solid, dot)

**Uso en Componentes**:
- Reemplazar badges genéricos en todas las páginas
- Asegurar consistencia visual

---

#### 1.2.3. Tema y Estilo Global
**Estado**: ⚠️ Parcialmente configurado

**Archivo**: [src/index.css](src/index.css)

**Tareas**:
- [ ] **ACCIÓN REQUERIDA**: Ajustar `--background` a gris muy claro (según imagen de referencia)
- [ ] **ACCIÓN REQUERIDA**: Ajustar `--card` a blanco puro
- [ ] **ACCIÓN REQUERIDA**: Aumentar espaciado global (gap, padding, margin)
- [ ] **ACCIÓN REQUERIDA**: Definir paleta de colores primaria/secundaria
- [ ] **ACCIÓN REQUERIDA**: Revisar tipografía (tamaños, pesos, familias)
- [ ] **ACCIÓN REQUERIDA**: Configurar sombras y bordes redondeados

**Variables CSS a Revisar**:
```css
:root {
  --background: /* Gris muy claro */
  --card: /* Blanco */
  --primary: /* Naranja (según imagen) */
  --radius: /* Border radius */
}
```

---

## 🎨 PARTE 2: PLAN DE IMPLEMENTACIÓN POR VISTAS

### 2.1. Dashboard (/admin)
**Estado**: ⚠️ Funcional, necesita mejoras

**Archivo**: [src/pages/Admin.tsx](src/pages/Admin.tsx)

#### 2.1.1. Cabecera
**Tareas**:
- [ ] Aumentar tamaño de fuente del reloj (text-4xl o mayor)
- [ ] Aumentar tamaño de fuente del calendario (text-2xl)
- [ ] Hacer que el avatar del usuario se gestione desde `/admin/settings`
- [ ] Añadir nombre del usuario junto al avatar
- [ ] Implementar menú dropdown en avatar (perfil, cerrar sesión)

#### 2.1.2. Calendario
**Lógica de Colores**:
- [ ] **HOY**: Fondo naranja (`--primary`)
- [ ] **Días Pasados con Tareas Pendientes**: Fondo naranja claro + borde naranja
  - Condición: Si existe una tarea de "Instalaciones" con `state != 'terminado'` y `start_date < today`
- [ ] Implementar función `getDayStatus(date)` que devuelva el estado del día
- [ ] Aplicar clases condicionales en el componente Calendar

**Archivos a Modificar**:
- `src/pages/Admin.tsx`
- Posiblemente `src/components/ui/calendar.tsx`

#### 2.1.3. Widgets (Confección y Tapicería)
**Lógica**:
- [ ] Mostrar **4 tareas pendientes más próximas** a la fecha actual
- [ ] Ordenar por fecha ASC
- [ ] **PRIORIDAD**: Tareas marcadas como `urgente` siempre aparecen primero
- [ ] Filtrar por `screen_group = 'Confección'` y `screen_group = 'Tapicería'`
- [ ] Usar vista `detailed_tasks` para optimizar

**Query SQL Ejemplo**:
```sql
SELECT * FROM detailed_tasks
WHERE screen_group = 'Confección'
  AND state != 'terminado'
ORDER BY
  CASE WHEN state = 'urgente' THEN 0 ELSE 1 END,
  start_date ASC
LIMIT 4;
```

#### 2.1.4. Tabla de Tareas Pendientes
**Tareas**:
- [ ] Filtro por defecto: `screen_group = 'Instalaciones'`
- [ ] Añadir toggle "Mostrar Acabadas" (incluir `state = 'terminado'`)
- [ ] Implementar acción "Terminar" en cada fila
  - Al hacer clic:
    1. Actualizar `state = 'terminado'`
    2. Archivar automáticamente (copiar a `archived_tasks`)
    3. Si hay `next_screen_id`, mover a esa pantalla
- [ ] Añadir columna "Acciones" con botones (Editar, Terminar, Ver Detalles)
- [ ] Implementar paginación si hay más de 25 tareas

**Componente a Modificar**:
- `src/components/installations/AllTasksTable.tsx` (o crear nuevo)

---

### 2.2. Instalaciones (/admin/installations)
**Estado**: ✅ Funcional, necesita mejoras visuales y WhatsApp

**Archivo**: [src/pages/Installations.tsx](src/pages/Installations.tsx)

#### 2.2.1. Barra Lateral (Operarios y Vehículos)
**Diseño**:
- [ ] Fijar ancho de ambas tarjetas (`w-64` o similar)
- [ ] Botón "Editar" solo visible en hover
- [ ] Al arrastrar, mostrar réplica del Badge con nombre
- [ ] Implementar `DragOverlay` de @dnd-kit/core

**Lógica de Sobrecarga**:
- [ ] Mostrar círculo rojo con número si operario tiene > 1 tarea en día seleccionado
- [ ] Ejemplo: "Juan Pérez 🔴 3"
- [ ] Query: Contar tareas por `profile_id` y `plan_date`

**Componentes a Modificar**:
- `src/components/installations/DraggableSidebarItem.tsx`
- `src/pages/Installations.tsx`

#### 2.2.2. Tabla de Planificación
**Diseño**:
- [ ] Permitir expansión vertical de celda de operarios
  - Hasta 2 operarios: 1 línea
  - Más de 2: 2 líneas
- [ ] Usar `flex-wrap` en la celda
- [ ] Ajustar altura automáticamente

**Componente a Modificar**:
- `src/components/installations/DailyTaskTable.tsx`
- `src/components/installations/DraggableTableRow.tsx`

#### 2.2.3. Nueva Funcionalidad: Compartir por WhatsApp (FASE 2)
**Estado**: ❌ No implementado

##### Backend
**Tareas**:
- [ ] Crear tabla `task_notifications`
  ```sql
  CREATE TABLE task_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id),
    task_ids UUID[] NOT NULL,
    plan_date DATE NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    viewed_at TIMESTAMP
  );
  ```
- [ ] Crear RPC `send_daily_plan_notifications(plan_date DATE)`
  - Agrupar tareas por operario
  - Generar token único para cada operario
  - Insertar en `task_notifications`
  - Llamar Edge Function `send-whatsapp-notification`
- [ ] Añadir índices en `task_notifications`

##### Frontend
**Tareas**:
- [ ] Añadir botón "Compartir Plan del Día" en `/admin/installations`
- [ ] Al hacer clic:
  1. Llamar RPC `send_daily_plan_notifications(selectedDate)`
  2. Mostrar toast de confirmación
  3. Actualizar estado (mostrar que se envió)
- [ ] Crear nueva página `/mis-tareas/:token`
  - **Archivo**: `src/pages/MyTasksPage.tsx`
  - **Ruta Pública** (sin AuthGuard)
  - Obtener tareas asociadas al token
  - Mostrar lista de tareas con:
    - Dirección + enlace a Google Maps
    - Hora estimada
    - Vehículo asignado
    - Botón "Tarea Retrasada"
    - Botón "Tarea Terminada"
  - Al hacer clic en botones:
    - Actualizar `state` en `screen_data`
    - Mostrar feedback visual

**Tiempo Real**:
- [ ] Implementar Supabase Realtime para `screen_data`
- [ ] Actualizar panel del admin en tiempo real cuando operario cambia estado
- [ ] Añadir indicador visual de "actualizado hace X segundos"

**Componentes a Crear**:
- `src/pages/MyTasksPage.tsx`
- `src/components/tasks/TaskCard.tsx` (para operarios)
- `src/components/tasks/TaskActionButtons.tsx`

**Archivos a Modificar**:
- `src/main.tsx` (añadir ruta)
- `src/pages/Installations.tsx` (botón compartir)

---

### 2.3. Gestión de Datos (/admin/data)
**Estado**: ⚠️ Funcional, faltan flujos completos

**Archivo**: [src/pages/DataEntry.tsx](src/pages/DataEntry.tsx)

**Tareas**:
- [ ] **CRÍTICO**: Reintegrar flujo "Añadir Tabla de Datos" (crear Screen)
  - Parece que fue removido o está incompleto
  - Revisar componente `DataManagement.tsx`
- [ ] Implementar lógica de flujo al cambiar estado:
  - Si `state = 'terminado'` Y `next_screen_id` existe:
    1. Copiar tarea a pantalla `next_screen_id`
    2. Resetear `state` en la nueva pantalla
    3. Mantener datos (cliente, dirección, etc.)
- [ ] Al marcar tarea como `terminado`:
  - Crear copia en `archived_tasks`
  - Incluir timestamp `archived_at`
- [ ] Añadir botón "Ver Flujo" que muestre el recorrido de una tarea

**Componentes a Modificar**:
- `src/components/data/DataManagement.tsx`
- `src/components/data/DataEntryDialog.tsx`

**Lógica de Archivado a Implementar**:
```typescript
async function completeTask(taskId: string, nextScreenId?: string) {
  // 1. Archivar
  await supabase.from('archived_tasks').insert({...task, archived_at: new Date()});

  // 2. Si hay next_screen_id, copiar a nueva pantalla
  if (nextScreenId) {
    await supabase.from('screen_data').insert({
      ...task,
      id: undefined, // Nuevo ID
      screen_id: nextScreenId,
      state: 'pendiente',
    });
  }

  // 3. Eliminar de screen_data actual
  await supabase.from('screen_data').delete().eq('id', taskId);
}
```

---

### 2.4. Pantallas (/admin/screens)
**Estado**: ⚠️ Funcional, necesita mejoras

**Archivo**: [src/pages/Display.tsx](src/pages/Display.tsx)

**Tareas**:
- [ ] Añadir campo `screen_group` en `ScreenDialog.tsx`
  - Dropdown con opciones: Instalaciones, Confección, Tapicería
  - Almacenar en columna `screen_group` de tabla `screens`
- [ ] Aumentar márgenes de la página (`p-8` → `p-12`)
- [ ] Implementar paginación:
  - Mostrar 25 pantallas inicialmente
  - Paginar de 15 en 15
  - Usar componente `Pagination` de shadcn/ui
- [ ] Añadir buscador de pantallas (filtrar por nombre, grupo)
- [ ] Añadir indicador visual del `screen_group` (badge de color)

**Componentes a Modificar**:
- `src/components/screens/ScreenDialog.tsx`
- `src/components/screens/ScreenList.tsx`
- `src/pages/Display.tsx`

**Migración SQL Requerida** (si no existe):
```sql
ALTER TABLE screens ADD COLUMN IF NOT EXISTS screen_group TEXT;
```

---

### 2.5. Plantillas (/admin/templates)
**Estado**: ❌ No implementado completamente

**Archivo**: Crear `src/pages/TemplatesPage.tsx`

**Tareas**:
- [ ] Crear página `/admin/templates`
- [ ] **CRÍTICO**: Depurar `TemplateDialog.tsx`
  - Revisar lógica de creación de plantillas
  - Verificar inserción en base de datos
  - Añadir logs de error detallados
  - Probar flujo completo
- [ ] Crear componente `TemplateList.tsx` (parece que ya existe)
- [ ] Implementar:
  - Crear plantilla desde cero
  - Crear plantilla desde tarea existente
  - Editar plantilla
  - Eliminar plantilla
  - Aplicar plantilla (crear tarea desde plantilla)
- [ ] Añadir categorías de plantillas

**Componentes Existentes a Revisar**:
- [src/components/templates/TemplateDialog.tsx](src/components/templates/TemplateDialog.tsx)
- [src/components/templates/TemplateList.tsx](src/components/templates/TemplateList.tsx)

**Archivos a Crear**:
- `src/pages/TemplatesPage.tsx`

**Archivos a Modificar**:
- `src/main.tsx` (añadir ruta)
- `src/components/layout/SidebarContent.tsx` (añadir enlace)

---

### 2.6. Usuarios (/admin/users)
**Estado**: ⚠️ Funcional, necesita expansión a 4 columnas

**Archivo**: [src/pages/UsersAndVehiclesPage.tsx](src/pages/UsersAndVehiclesPage.tsx)

#### Rediseño de Layout (4 Columnas)

##### Columna 1: Gestionar Operarios
**Estado**: ✅ Implementada

**Tareas**:
- [x] UserList actual funcionando
- [ ] Aplicar nuevos `StatusBadge`
- [ ] Envolver en `ScrollArea`
- [ ] Mejorar diseño visual (espaciado, hover states)

##### Columna 2: Gestionar Vehículos
**Estado**: ✅ Implementada

**Tareas**:
- [x] VehicleList actual funcionando
- [ ] Aplicar nuevos `VehicleBadge`
- [ ] Envolver en `ScrollArea`
- [ ] Mejorar diseño visual

##### Columna 3: Gestionar Grupos (NUEVO)
**Estado**: ❌ No implementado

**Backend**:
- [ ] Crear tabla `groups`
  ```sql
  CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Crear tabla `profile_groups`
  ```sql
  CREATE TABLE profile_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE(profile_id, group_id)
  );
  ```
- [ ] Añadir RLS policies

**Frontend**:
- [ ] Crear componente `GroupManagement.tsx`
- [ ] Funcionalidades:
  - Crear grupo (nombre + color)
  - Eliminar grupo
  - Asignar operarios a grupos (drag & drop o checkboxes)
  - Visualizar como organigrama simple (tree view)
- [ ] Añadir a `UsersAndVehiclesPage.tsx` como columna 3

**Componentes a Crear**:
- `src/components/groups/GroupManagement.tsx`
- `src/components/groups/GroupDialog.tsx`
- `src/components/groups/GroupTree.tsx`

##### Columna 4: Gestionar Comunicaciones (NUEVO)
**Estado**: ❌ No implementado

**Backend**:
- [ ] Implementar Supabase Realtime Presence
- [ ] Crear tabla `user_sessions` (opcional, para logs)
  ```sql
  CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id),
    last_seen TIMESTAMP DEFAULT NOW(),
    is_online BOOLEAN DEFAULT TRUE
  );
  ```
- [ ] Crear trigger para actualizar `last_seen` en cada actividad

**Frontend**:
- [ ] Crear componente `CommunicationManagement.tsx`
- [ ] Mostrar lista de usuarios con:
  - Indicador online/offline (punto verde/gris)
  - Indicador de si ha visto su enlace de tareas (consultar `task_notifications.viewed_at`)
  - Última actividad (timestamp)
- [ ] Botones por usuario:
  - "Reenviar Notificación" (reenviar WhatsApp)
  - "Enviar Mensaje Ad-hoc" (abrir dialog para mensaje personalizado)
- [ ] Implementar lógica de Realtime:
  ```typescript
  const channel = supabase.channel('online-users')
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // Actualizar UI
    });
  ```

**Componentes a Crear**:
- `src/components/communications/CommunicationManagement.tsx`
- `src/components/communications/UserStatusIndicator.tsx`
- `src/components/communications/SendMessageDialog.tsx`

**Archivos a Modificar**:
- `src/pages/UsersAndVehiclesPage.tsx` (layout 4 columnas)

---

### 2.7. Historial (/admin/archive)
**Estado**: ⚠️ Funcional, necesita gráficos y filtros

**Archivo**: [src/pages/ArchivePage.tsx](src/pages/ArchivePage.tsx)

**Tareas**:
- [ ] Añadir gráfico de barras (usando Recharts)
  - Eje X: Meses
  - Eje Y: Total de tareas archivadas
  - Barras apiladas por categoría (Instalaciones, Confección, Tapicería)
- [ ] Implementar buscador de texto libre
  - Buscar en: cliente, dirección, notas, vehículo
- [ ] Implementar filtros:
  - Por categoría (screen_group)
  - Por rango de fechas (DatePicker con from/to)
  - Por estado final (terminado, incidente, etc.)
- [ ] Añadir paginación (table con 50 filas)
- [ ] Permitir exportar a Excel/CSV

**Componentes a Crear**:
- `src/components/archive/ArchiveChart.tsx`
- `src/components/archive/ArchiveFilters.tsx`
- `src/components/archive/ArchiveTable.tsx`

**Archivos a Modificar**:
- `src/pages/ArchivePage.tsx`

**Query SQL Ejemplo (Gráfico)**:
```sql
SELECT
  DATE_TRUNC('month', archived_at) AS month,
  screen_group,
  COUNT(*) as total
FROM archived_tasks
WHERE archived_at >= NOW() - INTERVAL '12 months'
GROUP BY month, screen_group
ORDER BY month DESC;
```

---

### 2.8. Configuración (/admin/settings)
**Estado**: ⚠️ Funcional, necesita nuevas funcionalidades

**Archivo**: [src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx)

#### 2.8.1. Gestión de Usuarios (Admin)
**Tareas**:
- [ ] Sección "Invitar Nuevos Usuarios"
  - Input de email
  - Botón "Enviar Invitación"
  - Usar Supabase Auth: `supabase.auth.admin.inviteUserByEmail()`
  - Mostrar lista de invitaciones pendientes
- [ ] Sección "Activar/Desactivar Cuentas"
  - Lista de todos los usuarios
  - Toggle para activar/desactivar
  - Usar `supabase.auth.admin.updateUserById(id, { banned: true/false })`

**Componentes a Crear**:
- `src/components/settings/UserInvitation.tsx`
- `src/components/settings/UserActivation.tsx`

#### 2.8.2. Perfiles
**Tareas**:
- [ ] Implementar subida de imagen de perfil
  - Usar Supabase Storage (bucket `avatars`)
  - Crear componente `AvatarUpload.tsx`
  - Guardar URL en `profiles.avatar_url`
  - Permitir recorte de imagen (opcional: usar react-image-crop)
- [ ] Mostrar avatar en:
  - Header del Dashboard
  - Sidebar
  - Página de configuración

**Componentes a Crear**:
- `src/components/settings/AvatarUpload.tsx`

**Storage Policy Requerida**:
```sql
-- Permitir subir avatares solo al usuario autenticado
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### 2.8.3. Control de Acceso (Admin)
**Estado**: ❌ No implementado

**Tareas**:
- [ ] Crear tabla `role_permissions`
  ```sql
  CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role TEXT NOT NULL, -- admin, responsable, operario
    page TEXT NOT NULL, -- /admin, /admin/installations, etc.
    can_view BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE
  );
  ```
- [ ] Seedear permisos por defecto
- [ ] Crear componente `RolePermissionsManager.tsx`
  - Tabla de roles x páginas
  - Checkboxes para can_view, can_edit, can_delete
  - Guardar cambios en `role_permissions`
- [ ] Implementar middleware en frontend
  - Hook `usePermissions(page)`
  - Verificar permisos antes de renderizar componentes
  - Ocultar botones de edición/eliminación si no tiene permisos

**Componentes a Crear**:
- `src/components/settings/RolePermissionsManager.tsx`
- `src/hooks/usePermissions.ts`

**Archivos a Modificar**:
- Todos los componentes que requieran verificación de permisos
- `src/components/AuthGuard.tsx` (añadir lógica de permisos)

---

## 📋 CHECKLIST GENERAL DE IMPLEMENTACIÓN

### Fase 1: Backend y Migraciones (CRÍTICO)
- [ ] Aplicar migración `20251006000000_unified_rls_policies.sql`
- [ ] Aplicar migración `20251006000001_create_detailed_tasks_view.sql`
- [ ] Aplicar migración `20251006000002_indexes_and_cron_jobs.sql`
- [ ] Verificar que pg_cron está habilitado
- [ ] Probar todas las políticas RLS en Supabase Dashboard
- [ ] Crear Edge Function `send-whatsapp-notification`
- [ ] Configurar Supabase Storage (bucket `avatars`)

### Fase 2: Framework Visual (ALTA PRIORIDAD)
- [ ] Ajustar tema global en `src/index.css`
- [ ] Revisar y mejorar componentes Badge
- [ ] Crear nuevos componentes (StatusBadge, VehicleBadge, TaskStateBadge) ✅
- [ ] Aplicar diseño consistente en todas las páginas

### Fase 3: Refactorización de Vistas (POR PRIORIDAD)
1. [ ] Dashboard (/admin) - ALTA
2. [ ] Instalaciones (/admin/installations) - ALTA
3. [ ] Gestión de Datos (/admin/data) - CRÍTICA
4. [ ] Pantallas (/admin/screens) - MEDIA
5. [ ] Plantillas (/admin/templates) - CRÍTICA
6. [ ] Usuarios (/admin/users) - MEDIA
7. [ ] Historial (/admin/archive) - BAJA
8. [ ] Configuración (/admin/settings) - MEDIA

### Fase 4: Nuevas Funcionalidades (FEATURE)
- [ ] Compartir Plan por WhatsApp (Instalaciones)
- [ ] Gestión de Grupos (Usuarios)
- [ ] Gestión de Comunicaciones (Usuarios)
- [ ] Control de Acceso por Rol (Configuración)
- [ ] Subida de Avatares (Configuración)
- [ ] Gráficos en Historial

### Fase 5: Optimización y Pulido
- [ ] Refactorizar queries para usar vista `detailed_tasks`
- [ ] Implementar Supabase Realtime en páginas clave
- [ ] Añadir indicadores de carga (Skeleton, Spinners)
- [ ] Mejorar manejo de errores (toast, error boundaries)
- [ ] Añadir tests unitarios (opcional)
- [ ] Optimizar bundle size (lazy loading, code splitting)

---

## 🔧 COMANDOS ÚTILES

### Supabase
```bash
# Aplicar migraciones
npx supabase db push

# Ver diferencias
npx supabase db diff

# Generar tipos TypeScript
npx supabase gen types typescript --local > src/types/supabase.ts

# Ver logs
npx supabase functions logs send-whatsapp-notification

# Crear nueva migración
npx supabase migration new <nombre>
```

### Desarrollo
```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build producción
npm run build

# Lint
npm run lint
```

---

## 📊 MÉTRICAS DE ÉXITO

### Rendimiento
- [ ] Tiempo de carga inicial < 2s
- [ ] Queries a base de datos < 500ms
- [ ] Lighthouse Score > 90

### Usabilidad
- [ ] Todas las acciones principales en < 3 clics
- [ ] Feedback visual inmediato en todas las acciones
- [ ] Responsive en móvil, tablet, desktop

### Escalabilidad
- [ ] Soportar > 1000 tareas sin degradación
- [ ] Soportar > 50 usuarios concurrentes
- [ ] Archivado automático funcional

---

## 🐛 BUGS CONOCIDOS A RESOLVER

- [ ] Recursividad infinita en RLS (⚠️ CRÍTICO)
- [ ] TemplateDialog no crea plantillas correctamente
- [ ] Flujo de "Añadir Tabla de Datos" incompleto
- [ ] Archivado manual no copia a archived_tasks
- [ ] Next_screen_id no se respeta al finalizar tarea

---

## 📝 NOTAS ADICIONALES

### Dependencias a Considerar Añadir
- `react-image-crop` - Para recorte de avatares
- `react-hot-toast` - Alternativa a sonner (opcional)
- `react-to-print` - Para exportar PDFs
- `@tanstack/react-table` - Para tablas avanzadas (opcional)

### Supabase Extensions Requeridas
- `pg_cron` - Para Cron Jobs
- `uuid-ossp` - Para generar UUIDs

### Variables de Entorno
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

1. **Revisar y aplicar las 3 migraciones SQL nuevas**
2. **Ajustar tema global (index.css)**
3. **Refactorizar Dashboard con nuevos requisitos**
4. **Depurar TemplateDialog**
5. **Implementar flujo completo de Gestión de Datos**

---

**Última Actualización**: 6 de octubre de 2025
**Versión del Plan**: 1.0
**Autor**: Claude Code Assistant
**Proyecto**: Egea Productivity App - Alpha v1.3
