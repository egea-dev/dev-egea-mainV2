# 🔧 Solución de Errores: System Config y Avatares

## 🚨 Errores Actuales

1. **Error 400 en `system_config`**: 
   ```
   GET https://...supabase.co/rest/v1/system_config?select=*&order=category.asc%2Ckey.asc 400 (Bad Request)
   ```

2. **Error en Storage de Avatares**: 
   ```
   POST https://...supabase.co/storage/v1/object/avatars/... 400 (Bad Request)
   Upload error: StorageApiError: Bucket not found
   ```

---

## ✅ Solución Completa (Paso a Paso)

### 📋 PASO 1: Ejecutar el Script SQL

1. **Abre tu Dashboard de Supabase**
   - Ve a tu proyecto en https://supabase.com/dashboard
   
2. **Ve al SQL Editor**
   - En el menú lateral: **SQL Editor**
   - Click en **"New query"**

3. **Copia y pega el contenido del archivo**
   - Abre el archivo [`supabase/FIX_SYSTEM_CONFIG_AND_AVATARS.sql`](supabase/FIX_SYSTEM_CONFIG_AND_AVATARS.sql)
   - Copia TODO el contenido
   - Pégalo en el SQL Editor

4. **Ejecuta el script**
   - Click en el botón **"Run"** (▶️)
   - Espera a que termine (verás mensajes de confirmación)

5. **Verifica los mensajes**
   - Deberías ver:
     - ✅ `Configuraciones creadas: 8`
     - ✅ `Políticas RLS activas: 4`

---

### 🪣 PASO 2: Crear el Bucket de Avatares

⚠️ **IMPORTANTE**: Los buckets de Storage NO se pueden crear con SQL. Debes hacerlo manualmente.

1. **Ve a Storage**
   - En el menú lateral de Supabase: **Storage**

2. **Crea un nuevo bucket**
   - Click en **"New bucket"** o **"Create a new bucket"**

3. **Configura el bucket con estos valores exactos:**
   ```
   Name: avatars
   Public bucket: ✅ SÍ (IMPORTANTE: marcar esta casilla)
   File size limit: 2 MB
   Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
   ```

4. **Crear el bucket**
   - Click en **"Create bucket"** o **"Save"**

---

### 🔐 PASO 3: Verificar las Políticas de Storage

Las políticas de Storage deberían haberse creado automáticamente con el script del PASO 1. Vamos a verificarlo:

1. **Ve a Storage → Policies**
   - En Storage, busca la pestaña **"Policies"** o **"Configuration"**
   - O ve directamente a: **Storage** → Click en el bucket **avatars** → **Policies**

2. **Verifica que existen estas 4 políticas:**
   - ✅ `Users can upload their own avatar` (INSERT)
   - ✅ `Users can update their own avatar` (UPDATE)
   - ✅ `Users can delete their own avatar` (DELETE)
   - ✅ `Avatars are publicly accessible` (SELECT)

3. **Si NO están creadas, ejecútalas manualmente:**

   Vuelve al **SQL Editor** y ejecuta SOLO esta parte:

   ```sql
   -- Permitir a usuarios autenticados subir sus propios avatares
   CREATE POLICY "Users can upload their own avatar"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'avatars' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );

   -- Permitir a usuarios autenticados actualizar sus propios avatares
   CREATE POLICY "Users can update their own avatar"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'avatars' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );

   -- Permitir a usuarios autenticados eliminar sus propios avatares
   CREATE POLICY "Users can delete their own avatar"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'avatars' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );

   -- Permitir lectura pública de avatares
   CREATE POLICY "Avatars are publicly accessible"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'avatars');
   ```

---

### 🧪 PASO 4: Verificar que Funciona

1. **Recarga la aplicación**
   - Presiona `Ctrl + F5` o `Cmd + Shift + R` para forzar recarga

2. **Verifica la consola del navegador**
   - Presiona `F12` para abrir DevTools
   - Ve a la pestaña **Console**
   - El error 400 de `system_config` debería **desaparecer**

3. **Prueba subir un avatar**
   - Ve a **Configuración** → **Perfil**
   - Click en "Cambiar Avatar"
   - Selecciona una imagen
   - Debería subirse correctamente

---

## 📁 Estructura de Archivos de Avatares

Los avatares se guardan automáticamente con esta estructura:

```
avatars/
  └── {profile_id}/
      └── {timestamp}.{ext}
```

**Ejemplo:**
```
avatars/ed21c5d2-67d5-4c00-b0ae-cedcbb50d3df/1760016160668.png
```

Esto permite:
- ✅ Cada usuario tiene su propia carpeta
- ✅ Se eliminan automáticamente avatares antiguos
- ✅ Los nombres son únicos (por timestamp)

---

## ✅ Validaciones Implementadas

- ✅ **Tamaño máximo**: 2MB
- ✅ **Formatos permitidos**: JPG, JPEG, PNG, WEBP
- ✅ **Seguridad**: Solo puedes editar tu propio avatar
- ✅ **Limpieza automática**: Elimina avatar anterior al subir uno nuevo
- ✅ **Mensajes de error descriptivos**
- ✅ **Indicador de carga** durante la subida

---

## 🔒 Seguridad

### System Config
- ❌ **Usuarios normales**: Solo pueden LEER configuraciones
- ✅ **Admins**: Pueden crear, editar y eliminar configuraciones

### Avatares
- ✅ **Cualquier usuario autenticado**: Puede subir/editar/eliminar SU PROPIO avatar
- ✅ **Lectura pública**: Los avatares son públicamente accesibles (necesario para mostrarlos)
- ❌ **No puedes modificar avatares de otros usuarios**

---

## 🐛 Solución de Problemas

### ❌ Si sigue apareciendo error 400 en system_config:

1. **Verifica que la tabla existe**
   - Ve a **Table Editor** en Supabase
   - Busca la tabla `system_config`
   - Debería tener 8 filas de configuración

2. **Verifica que tienes permisos**
   - Ve a **Table Editor** → `profiles`
   - Busca tu usuario (por email)
   - Tu campo `role` debe ser `'admin'` o `'user'`

3. **Verifica las políticas RLS**
   - Ve a **Database** → **Tables** → `system_config` → **Policies**
   - Deberían aparecer 4 políticas activas

4. **Re-ejecuta el script**
   - Vuelve a ejecutar [`FIX_SYSTEM_CONFIG_AND_AVATARS.sql`](supabase/FIX_SYSTEM_CONFIG_AND_AVATARS.sql)
   - El script está diseñado para ser idempotente (se puede ejecutar múltiples veces)

---

### ❌ Si los avatares NO se suben:

1. **Verifica el bucket**
   - Ve a **Storage**
   - Debe existir un bucket llamado exactamente `avatars`
   - Debe estar marcado como **Public** ✅

2. **Verifica las políticas de Storage**
   - **Storage** → bucket `avatars` → **Policies**
   - Deben existir las 4 políticas mencionadas arriba

3. **Verifica el error exacto**
   - Abre la consola del navegador (`F12`)
   - Intenta subir un avatar
   - Mira el error exacto que aparece
   - Común: `"Bucket not found"` → El bucket no existe o tiene otro nombre

4. **Verifica el tamaño de la imagen**
   - Máximo: 2MB
   - Si es mayor, comprime la imagen primero

5. **Verifica el formato**
   - Solo: JPG, JPEG, PNG, WEBP
   - Si es otro formato (GIF, BMP, etc.), convierte primero

---

### ❌ Si ves errores de permisos:

1. **Verifica que estás autenticado**
   - Cierra sesión y vuelve a iniciar
   - Ve a **Authentication** → **Users** en Supabase
   - Confirma que tu usuario existe

2. **Verifica las políticas RLS**
   - **Database** → **Tables** → `system_config` → **Policies**
   - **Storage** → bucket `avatars` → **Policies**
   - Todas deben estar **habilitadas** (Enable RLS: ON)

3. **Verifica tu rol**
   - Para modificar `system_config` necesitas rol `admin`
   - Para avatares solo necesitas estar autenticado

---

## 📞 Soporte

Si después de seguir todos los pasos siguen habiendo errores:

1. **Revisa los logs de Supabase**
   - **Logs** → **Postgres Logs**
   - Busca errores relacionados con `system_config` o `storage`

2. **Exporta tu esquema**
   - Ve al **SQL Editor**
   - Ejecuta: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
   - Verifica que existen las políticas

3. **Contacta con el equipo de desarrollo**
   - Incluye capturas de pantalla de los errores
   - Menciona qué pasos has seguido
   - Incluye los logs de la consola del navegador

---

## 📚 Referencias

- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)
- [Documentación de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control)