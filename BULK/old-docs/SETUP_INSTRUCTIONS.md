# 🚀 Instrucciones de Configuración - Base de Datos Completa

## 📋 Información del Proyecto

- **Proyecto ID**: `nzoqobkebpabdzhhzoaq`
- **URL**: `https://nzoqobkebpabdzhhzoaq.supabase.co`
- **Versión**: Alpha v1.3
- **Fecha**: 6 de octubre de 2025

---

## 🎯 PASO 1: Acceder a Supabase Dashboard

1. Abre tu navegador y ve a: https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto: **nzoqobkebpabdzhhzoaq**
4. Ve a la sección **SQL Editor** (en el menú lateral izquierdo)

---

## 🎯 PASO 2: Ejecutar el Script Completo

### Opción A: Copiar y Pegar (Recomendado)

1. Abre el archivo `COMPLETE_DATABASE_SETUP.sql`
2. Selecciona todo el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. En el SQL Editor de Supabase, pega todo el contenido (Ctrl+V)
5. Haz clic en **Run** o presiona **Ctrl+Enter**

### Opción B: Subir Archivo

1. En el SQL Editor, haz clic en **Upload file**
2. Selecciona el archivo `COMPLETE_DATABASE_SETUP.sql`
3. Espera a que se cargue el contenido
4. Haz clic en **Run**

---

## 🎯 PASO 3: Verificar la Instalación

Después de ejecutar el script, deberías ver un mensaje como:

```
✅ Base de datos configurada exitosamente:
   - Tablas creadas: 16
   - Vistas creadas: 4
   - Funciones creadas: 7

🎯 Próximos pasos:
   1. Configurar variables de entorno en el frontend
   2. Probar la aplicación con los datos de ejemplo
   3. Configurar Edge Functions para WhatsApp
   4. Establecer cron jobs para mantenimiento automático

📊 Datos de ejemplo insertados:
   - 9 usuarios con diferentes roles
   - 6 vehículos con capacidades variadas
   - 3 plantillas para diferentes tipos de tareas
   - 8 pantallas configuradas
   - 7 tareas de ejemplo con asignaciones
   - 3 grupos de trabajo organizados

🔐 Seguridad configurada:
   - Row Level Security (RLS) habilitado
   - Políticas de acceso por rol
   - Funciones con SECURITY DEFINER

✨ ¡Base de datos lista para producción! ✨
```

---

## 🎯 PASO 4: Configurar Frontend

### Actualizar archivo .env

Asegúrate que tu archivo `.env` contenga:

```env
VITE_SUPABASE_PROJECT_ID="nzoqobkebpabdzhhzoaq"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56b3FvYmtlYnBhYmR6aGh6b2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTUwNDgsImV4cCI6MjA3NTMzMTA0OH0.jCszp2HUEGt1--o_lEYliSLeXvHxgigqA3o_SuEK6A0"
VITE_SUPABASE_URL="https://nzoqobkebpabdzhhzoaq.supabase.co"
VITE_APP_VERSION="1.0.0-alpha"
```

### Probar la Aplicación

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre http://localhost:5173 en tu navegador

3. Inicia sesión con el usuario administrador:
   - **Email**: carlos@egea.com
   - **Contraseña**: (deberás crearla en Authentication > Users)

---

## 🎯 PASO 5: Configurar Edge Functions

### Habilitar Twilio WhatsApp

1. Ve a **Settings** > **Edge Functions**
2. Crea un nuevo archivo `send-whatsapp-notification/index.ts`
3. Copia el contenido desde `supabase/functions/send-whatsapp-notification/index.ts`
4. Configura las variables de entorno:

```bash
npx supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
npx supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
npx supabase secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

5. Despliega la función:
   ```bash
   npx supabase functions deploy send-whatsapp-notification
   ```

---

## 🎯 PASO 6: Configurar Cron Jobs (Opcional)

Si quieres habilitar el mantenimiento automático:

1. Ve a **Database** > **Extensions**
2. Habilita la extensión `pg_cron`
3. En el SQL Editor, ejecuta:

```sql
-- Archivar tareas completadas diariamente a las 2 AM
SELECT cron.schedule(
  'archive-completed-tasks-daily',
  '0 2 * * *',
  'SELECT public.archive_completed_tasks(7);'
);

-- Limpiar planes expirados cada 6 horas
SELECT cron.schedule(
  'cleanup-expired-plans',
  '0 */6 * * *',
  'DELETE FROM public.shared_plans WHERE expires_at < NOW();'
);
```

---

## 🎯 PASO 7: Configurar Storage

### Crear Bucket para Avatares

1. Ve a **Storage** > **Policies**
2. Crea un nuevo bucket llamado `avatars`
3. Configura la política de acceso:

```sql
-- Permitir a usuarios subir su propio avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir a usuarios ver su propio avatar
CREATE POLICY "Users can view their own avatar" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🔍 Verificación Final

### Revisar Tablas Creadas

En el **Table Editor**, deberías ver estas tablas:

- ✅ `profiles` (9 usuarios)
- ✅ `vehicles` (6 vehículos)
- ✅ `templates` (3 plantillas)
- ✅ `screens` (8 pantallas)
- ✅ `screen_data` (7 tareas)
- ✅ `task_profiles` (asignaciones de operarios)
- ✅ `task_vehicles` (asignaciones de vehículos)
- ✅ `groups` (3 grupos)
- ✅ `profile_groups` (membresías de grupos)
- ✅ `archived_tasks` (vacía inicialmente)
- ✅ `shared_plans` (vacía inicialmente)
- ✅ `system_config` (configuración del sistema)
- ✅ `role_permissions` (permisos por rol)

### Revisar Vistas Creadas

En el **SQL Editor**, prueba estas consultas:

```sql
-- Ver tareas detalladas
SELECT * FROM public.detailed_tasks LIMIT 5;

-- Ver carga de trabajo de usuarios
SELECT * FROM public.user_workload;

-- Ver utilización de vehículos
SELECT * FROM public.vehicle_utilization;

-- Ver resumen de tareas
SELECT * FROM public.task_summary;
```

### Revisar Funciones

Prueba las funciones RPC:

```sql
-- Obtener estadísticas del dashboard
SELECT * FROM public.get_dashboard_stats();

-- Obtener grupos de un usuario
SELECT * FROM public.get_user_groups('00000000-0000-0000-0000-000000000001');

-- Verificar permisos
SELECT public.has_permission('admin', '/admin', 'edit');
```

---

## 🚨 Solución de Problemas

### Error: "permission denied for table"

**Solución**: Asegúrate de que las políticas RLS se hayan aplicado correctamente. Ejecuta el script de nuevo.

### Error: "function does not exist"

**Solución**: Verifica que las funciones se hayan creado correctamente en el esquema `public`.

### Error: "relation does not exist"

**Solución**: Algunas tablas no se crearon. Ejecuta el script completo nuevamente.

### Error: "duplicate key value violates unique constraint"

**Solución**: Los datos de ejemplo ya existen. Puedes ignorar este error o limpiar la base de datos primero.

---

## 📞 Soporte

Si encuentras algún problema:

1. Revisa los logs en **Database** > **Logs**
2. Verifica que todas las tablas se crearon correctamente
3. Asegúrate de que las variables de entorno sean correctas
4. Consulta la documentación completa en `IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist Final

- [ ] Script SQL ejecutado sin errores
- [ ] Variables de entorno configuradas
- [ ] Aplicación frontend inicia correctamente
- [ ] Login funciona con usuarios de ejemplo
- [ ] Dashboard muestra datos correctamente
- [ ] Tareas se crean y editan correctamente
- [ ] Asignaciones de operarios y vehículos funcionan
- [ ] Grupos de trabajo visibles
- [ ] Edge Functions configuradas (opcional)
- [ ] Cron jobs configurados (opcional)

---

## 🎉 ¡Felicidades!

Tu base de datos Supabase está completamente configurada y lista para producción con:

- ✅ **16 tablas** completamente normalizadas
- ✅ **4 vistas optimizadas** para consultas eficientes
- ✅ **7 funciones RPC** para operaciones complejas
- ✅ **Row Level Security** completamente configurado
- ✅ **Datos de ejemplo realistas** para pruebas
- ✅ **Documentación completa** para mantenimiento

¡Ahora puedes empezar a usar la aplicación Egea Productivity App Alpha v1.3! 🚀