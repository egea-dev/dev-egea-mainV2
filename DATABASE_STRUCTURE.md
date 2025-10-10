# 📊 Estructura de Base de Datos - Egea Productivity App

## 🏗️ Overview

Esta documentación describe la estructura completa de la base de datos PostgreSQL para la aplicación Egea Productivity, diseñada para gestionar tareas, usuarios, vehículos y comunicaciones de manera eficiente y segura.

## 📋 Tablas Principales

### 1. `profiles` - Perfiles de Usuario
Gestiona la información de los usuarios del sistema.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'operario' CHECK (role IN ('admin', 'responsable', 'operario')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'vacaciones', 'baja')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos importantes:**
- `auth_user_id`: Relación con la tabla de autenticación de Supabase
- `role`: Define los permisos del usuario (admin, responsable, operario)
- `status`: Estado actual del usuario (activo, vacaciones, baja)

### 2. `vehicles` - Vehículos
Gestiona la flota de vehículos disponibles para asignar a tareas.

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'otro' CHECK (type IN ('jumper', 'camion', 'furgoneta', 'otro')),
  license_plate TEXT,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Tipos de vehículos:**
- `jumper`: Vehículos tipo Jumper (capacidad 2)
- `camion`: Camiones grandes (capacidad 3)
- `furgoneta`: Furgonetas (capacidad 1-2)
- `otro`: Otros tipos de vehículos

### 3. `templates` - Plantillas de Datos
Define estructuras reutilizables para diferentes tipos de tareas.

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  category TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Estructura de `fields`:**
```json
[
  {
    "name": "cliente",
    "label": "Cliente",
    "type": "text"
  },
  {
    "name": "cantidad",
    "label": "Cantidad",
    "type": "number"
  }
]
```

### 4. `screens` - Pantallas de Visualización
Define las pantallas donde se muestran y gestionan los datos.

```sql
CREATE TABLE screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  screen_type TEXT NOT NULL DEFAULT 'data' CHECK (screen_type IN ('data', 'display')),
  screen_group TEXT,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  next_screen_id UUID REFERENCES screens(id) ON DELETE SET NULL,
  refresh_interval_sec INTEGER DEFAULT 30,
  header_color TEXT DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Grupos de pantallas (`screen_group`):**
- `Instalaciones`: Tareas de instalación
- `Confección`: Tareas de confección
- `Tapicería`: Tareas de tapicería

### 5. `screen_data` - Datos de Tareas
Contiene los datos específicos de cada tarea.

```sql
CREATE TABLE screen_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  state TEXT NOT NULL DEFAULT 'pendiente' CHECK (state IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pending', 'acabado', 'en progreso')),
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checkin_token TEXT UNIQUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Estados de tarea (`state`):**
- `pendiente`: Tarea pendiente de comenzar
- `urgente`: Tarea con alta prioridad
- `en fabricacion`: Tarea en proceso
- `a la espera`: Tarea esperando recursos
- `terminado`: Tarea completada
- `incidente`: Tarea con problemas
- `arreglo`: Tarea requiere reparación

## 🔗 Tablas de Relación

### 6. `task_profiles` - Asignación de Operarios
Relación muchos a muchos entre tareas y operarios.

```sql
CREATE TABLE task_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES screen_data(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, profile_id)
);
```

### 7. `task_vehicles` - Asignación de Vehículos
Relación muchos a muchos entre tareas y vehículos.

```sql
CREATE TABLE task_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, vehicle_id)
);
```

## 📁 Tablas de Archivo y Historial

### 8. `archived_tasks` - Tareas Archivadas
Almacena tareas completadas para mantener la tabla principal limpia.

```sql
CREATE TABLE archived_tasks (
  id UUID PRIMARY KEY,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  state TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID,
  responsible_name TEXT,
  assigned_users JSONB DEFAULT '[]'::jsonb,
  assigned_vehicles JSONB DEFAULT '[]'::jsonb,
  archived_by UUID REFERENCES profiles(id)
);
```

### 9. `user_availability` - Disponibilidad de Usuarios
Gestiona la disponibilidad y horarios de los operarios.

```sql
CREATE TABLE user_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'no disponible', 'vacaciones')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🌐 Tablas de Comunicación

### 10. `shared_plans` - Planes Compartidos
Permite compartir planes de trabajo con acceso público vía token.

```sql
CREATE TABLE shared_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  plan_date DATE NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 11. `groups` - Grupos de Operarios
Organiza a los operarios en equipos de trabajo.

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 12. `profile_groups` - Miembros de Grupos
Relación entre perfiles y grupos.

```sql
CREATE TABLE profile_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'miembro' CHECK (role IN ('líder', 'miembro')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, group_id)
);
```

### 13. `task_notifications` - Notificaciones de Tareas
Gestiona las notificaciones enviadas a los operarios.

```sql
CREATE TABLE task_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_ids UUID[] NOT NULL,
  plan_date DATE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES profiles(id)
);
```

### 14. `communication_logs` - Logs de Comunicaciones
Registra todas las comunicaciones enviadas.

```sql
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'push')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## ⚙️ Tablas de Configuración

### 15. `system_config` - Configuración del Sistema
Almacena parámetros configurables del sistema.

```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 16. `role_permissions` - Permisos por Rol
Define permisos granulares por rol y página.

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'responsable', 'operario')),
  page TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, page)
);
```

## 🎯 Vistas Optimizadas

### `detailed_tasks`
Vista que une screen_data con profiles, vehicles y screens para consultas optimizadas.

```sql
CREATE VIEW detailed_tasks AS
SELECT
  sd.id,
  sd.data,
  sd.state,
  sd.start_date,
  sd.end_date,
  s.screen_group,
  rp.full_name AS responsible_name,
  -- Arrays agregados de operarios y vehículos
  assigned_profiles,
  assigned_vehicles,
  -- Indicadores útiles
  is_completed,
  is_urgent,
  is_current,
  is_overdue
FROM screen_data sd
LEFT JOIN screens s ON sd.screen_id = s.id
LEFT JOIN profiles rp ON sd.responsible_profile_id = rp.id;
```

### `user_workload`
Vista que muestra la carga de trabajo de cada usuario.

### `vehicle_utilization`
Vista que muestra la utilización de vehículos.

### `task_summary`
Vista que resume las tareas por grupo y estado.

## 🔐 Seguridad (RLS)

Todas las tablas tienen Row Level Security (RLS) habilitado con las siguientes políticas generales:

- **Lectura**: Usuarios autenticados pueden ver datos públicos
- **Escritura**: Solo administradores pueden modificar datos
- **Propio**: Los usuarios pueden ver/editar su propia información
- **Anónimos**: Acceso limitado a datos públicos (pantallas activas, planes compartidos)

## 📝 Funciones RPC

### `upsert_task()`
Crea o actualiza tareas con sus asignaciones.

### `archive_completed_tasks()`
Archiva automáticamente tareas completadas.

### `generate_checkin_token()`
Genera token único para check-in de tareas.

### `complete_checkin()`
Completa check-in usando token.

### `get_dashboard_stats()`
Obtiene estadísticas del dashboard.

## 🔄 Triggers Automáticos

- **updated_at**: Actualiza automáticamente el timestamp de modificación
- **handle_new_user**: Crea perfil automáticamente cuando un usuario se registra

## 📊 Índices Principales

- **screen_data**: (state, start_date, end_date), (screen_id), (responsible_profile_id)
- **profiles**: (auth_user_id), (role), (status)
- **vehicles**: (type), (is_active)
- **task_profiles**: (task_id), (profile_id)
- **task_vehicles**: (task_id), (vehicle_id)
- **archived_tasks**: (archived_at DESC)
- **shared_plans**: (token), (expires_at)

## 🚀 Edge Functions

### `send-whatsapp-notification`
Envía notificaciones via WhatsApp Business API (Twilio).

**Variables de entorno requeridas:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`

## 📈 Métricas y Monitoreo

La estructura incluye tablas para:
- Logs de comunicaciones
- Estadísticas de uso
- Historial de cambios
- Métricas de rendimiento

## 🔧 Mantenimiento

- **Archivado automático**: Tareas completadas se archivan después de 7 días
- **Limpieza de tokens**: Tokens expirados se eliminan automáticamente
- **Optimización de índices**: Índices compuestos para consultas frecuentes
- **Backups**: Structure completa para recuperación de datos

---

**Última actualización:** 6 de octubre de 2025  
**Versión:** 1.0  
**Base de datos:** PostgreSQL 15+ con Supabase