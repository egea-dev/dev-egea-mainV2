# 🚀 Guía de Configuración - Nueva Base de Datos Supabase

## 📋 Requisitos Previos

1. **Cuenta de Supabase**: Crea una cuenta en [supabase.com](https://supabase.com)
2. **CLI de Supabase**: Instala la CLI localmente
   ```bash
   npm install -g supabase
   ```
3. **Node.js**: Versión 18 o superior
4. **Git**: Para control de versiones

## 🏗️ Pasos de Configuración

### 1. Crear Nuevo Proyecto en Supabase

1. Inicia sesión en [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea un nuevo proyecto:
   - **Nombre**: `egea-productivity-v2`
   - **Contraseña de base de datos**: Genera una contraseña segura y guárdala
   - **Región**: Selecciona la región más cercana a tus usuarios
   - **Plan**: Selecciona el plan adecuado (Free para desarrollo)

### 2. Configurar Variables de Entorno Locales

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Para desarrollo local (opcional)
SUPABASE_DB_PASSWORD=your-db-password-here
```

### 3. Vincular Proyecto Local

```bash
# Vincular con el proyecto de Supabase
npx supabase link --project-ref your-project-id

# Verificar conexión
npx supabase test db
```

### 4. Aplicar Migraciones

Las migraciones están organizadas en orden secuencial:

```bash
# Aplicar todas las migraciones en orden
npx supabase db push

# O aplicar una por una si prefieres:
npx supabase migration up 20251006010000_create_core_tables.sql
npx supabase migration up 20251006010001_rls_policies.sql
npx supabase migration up 20251006010002_groups_and_communications.sql
npx supabase migration up 20251006010003_views_and_functions.sql
npx supabase migration up 20251006010004_seed_data.sql
```

### 5. Configurar Edge Functions

#### 5.1 Instalar Supabase CLI (si no lo está)

```bash
npm install -g supabase
```

#### 5.2 Configurar Variables de Entorno para Edge Functions

En Supabase Dashboard > Settings > Edge Functions, añade:

```bash
# Twilio Configuration (para WhatsApp)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# URLs de la aplicación
PUBLIC_SITE_URL=https://your-domain.com
```

#### 5.3 Desplegar Edge Functions

```bash
# Desplegar función de WhatsApp
npx supabase functions deploy send-whatsapp-notification

# Verificar logs
npx supabase functions logs send-whatsapp-notification
```

### 6. Configurar Storage para Avatares

#### 6.1 Crear Bucket

```sql
-- Ejecutar en SQL Editor de Supabase Dashboard
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);
```

#### 6.2 Configurar Políticas de Storage

```sql
-- Política para que los usuarios suban su propio avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para que los usuarios vean su propio avatar
CREATE POLICY "Users can view their own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para que los usuarios actualicen su propio avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 7. Crear Primer Usuario Administrador

#### 7.1 Registrar Usuario

1. Inicia la aplicación localmente:
   ```bash
   npm run dev
   ```
2. Regístrate en la aplicación con tu email
3. Verifica tu email

#### 7.2 Actualizar a Administrador

```sql
-- Ejecutar en SQL Editor de Supabase Dashboard
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### 8. Verificar Configuración

#### 8.1 Verificar Tablas

```sql
-- Listar todas las tablas
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

#### 8.2 Verificar Datos de Ejemplo

```sql
-- Ver usuarios de ejemplo
SELECT id, full_name, email, role, status FROM profiles;

-- Ver tareas de ejemplo
SELECT sd.id, s.screen_group, sd.state, sd.start_date 
FROM screen_data sd 
JOIN screens s ON sd.screen_id = s.id 
LIMIT 5;

-- Ver vehículos de ejemplo
SELECT id, name, type, license_plate FROM vehicles;
```

#### 8.3 Verificar Vistas

```sql
-- Probar vista detailed_tasks
SELECT COUNT(*) FROM detailed_tasks;

-- Probar vista user_workload
SELECT * FROM user_workload LIMIT 3;
```

### 9. Configurar Autenticación

#### 9.1 Configurar Proveedores

En Supabase Dashboard > Authentication > Providers:

1. **Email**: Habilitar y configurar SMTP si es necesario
2. **Social**: Configurar Google, GitHub, etc. si se desea

#### 9.2 Configurar URLs de Redirección

```bash
# URLs de redirección para desarrollo
http://localhost:5173/*
http://localhost:3000/*

# URLs de redirección para producción
https://your-domain.com/*
```

### 10. Configurar Cron Jobs (Opcional)

Si tienes el plan Pro de Supabase, puedes configurar cron jobs:

```sql
-- Habilitar extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configurar archivado automático diario a las 2 AM
SELECT cron.schedule(
  'archive-completed-tasks-daily',
  '0 2 * * *',
  'SELECT public.archive_completed_tasks(7);'
);

-- Configurar limpieza de planes expirados cada 6 horas
SELECT cron.schedule(
  'cleanup-expired-plans',
  '0 */6 * * *',
  'SELECT public.cleanup_expired_shared_plans();'
);
```

## 🔧 Solución de Problemas Comunes

### Problema: Error de RLS (Row Level Security)

**Síntoma**: "Permission denied for table profiles"

**Solución**:
```sql
-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar si RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';
```

### Problema: Edge Function no responde

**Síntoma**: Timeout o error 500

**Solución**:
```bash
# Verificar logs
npx supabase functions logs send-whatsapp-notification

# Verificar variables de entorno
npx supabase secrets list
```

### Problema: Datos no aparecen en el frontend

**Síntoma**: Consultas vacías o errores de permiso

**Solución**:
```sql
-- Verificar que el usuario tenga perfil
SELECT * FROM profiles WHERE auth_user_id = auth.uid();

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'screen_data';
```

## 📊 Monitoreo y Mantenimiento

### Métricas Clave

1. **Rendimiento de consultas**: Monitorizar tiempos de respuesta
2. **Uso de storage**: Espacio utilizado por avatares y archivos
3. **Edge Functions**: Número de invocaciones y errores
4. **Autenticación**: Tasa de éxito de login

### Mantenimiento Programado

1. **Semanal**: Revisar logs de errores
2. **Mensual**: Limpiar datos antiguos si es necesario
3. **Trimestral**: Optimizar índices y consultas

## 🚀 Despliegue a Producción

### 1. Configurar Dominio Personalizado

En Supabase Dashboard > Settings > Custom Domain:
1. Añade tu dominio
2. Configura DNS según instrucciones
3. Espera propagación DNS

### 2. Actualizar Variables de Entorno

```bash
# Producción
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

### 3. Desplegar Aplicación

```bash
# Build para producción
npm run build

# Desplegar en tu plataforma preferida
# (Vercel, Netlify, Railway, etc.)
```

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Storage](https://supabase.com/docs/guides/storage)

---

**Nota**: Esta guía asume que estás partiendo de cero. Si ya tienes un proyecto existente, considera hacer un backup antes de aplicar las migraciones.

**Soporte**: Si encuentras problemas, revisa los logs de Supabase Dashboard o contacta al equipo de desarrollo.