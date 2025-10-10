# 🪣 CREAR BUCKET DE AVATARES - Guía Visual

## ⚠️ ERROR ACTUAL

```
POST .../storage/v1/object/avatars/... 400 (Bad Request)
Upload error: StorageApiError: Bucket not found
```

**CAUSA**: El bucket `avatars` no existe en Storage de Supabase.

**SOLUCIÓN**: Debes crearlo MANUALMENTE (los buckets NO se pueden crear con SQL).

---

## 📋 PASOS DETALLADOS (3 minutos)

### PASO 1: Abrir Dashboard de Supabase

1. Ve a: https://supabase.com/dashboard
2. **Inicia sesión** si es necesario
3. **Selecciona tu proyecto** (haz click en el proyecto que estás usando)

---

### PASO 2: Ir a Storage

1. En el **menú lateral izquierdo**, busca el icono de carpeta 📁
2. Click en **"Storage"**
3. Deberías ver una página con un botón **"New bucket"** o **"Create a new bucket"**

---

### PASO 3: Crear el Bucket

1. **Click en el botón verde "New bucket"** (esquina superior derecha)

2. **Aparecerá un formulario**. Rellénalo EXACTAMENTE así:

   ```
   ┌─────────────────────────────────────────┐
   │ Create a new bucket                     │
   ├─────────────────────────────────────────┤
   │                                         │
   │ Name *                                  │
   │ ┌─────────────────────────────────┐   │
   │ │ avatars                         │   │  ← Escribe exactamente "avatars"
   │ └─────────────────────────────────┘   │
   │                                         │
   │ ☑ Public bucket                        │  ← ¡MUY IMPORTANTE! MARCA ESTA CASILLA
   │                                         │
   │ File size limit                         │
   │ ┌─────────────────────────────────┐   │
   │ │ 2                               │ MB │
   │ └─────────────────────────────────┘   │
   │                                         │
   │ Allowed MIME types (optional)          │
   │ ┌─────────────────────────────────┐   │
   │ │ image/jpeg, image/jpg,          │   │
   │ │ image/png, image/webp           │   │
   │ └─────────────────────────────────┘   │
   │                                         │
   │        [Cancel]  [Create bucket]       │
   └─────────────────────────────────────────┘
   ```

3. **Verifica que:**
   - ✅ Name = `avatars` (todo en minúsculas, sin espacios)
   - ✅ Public bucket = **MARCADO** ☑ (candado abierto)
   - ✅ File size limit = `2 MB`
   - ✅ MIME types = `image/jpeg, image/jpg, image/png, image/webp`

4. **Click en "Create bucket"**

---

### PASO 4: Verificar que se Creó

Deberías ver el nuevo bucket en la lista:

```
┌────────────────────────────────────────────┐
│ Storage                                    │
├────────────────────────────────────────────┤
│                                            │
│ 🔓 avatars                    Public       │  ← Debe aparecer aquí
│                                            │
└────────────────────────────────────────────┘
```

**IMPORTANTE**: El icono debe ser un **candado abierto** 🔓 o decir **"Public"**.

Si ves un candado cerrado 🔒, el bucket NO es público y tendrás que editarlo.

---

### PASO 5: Probar en la Aplicación

1. **Vuelve a tu aplicación** (en el navegador)
2. **Recarga la página** con `Ctrl + F5` (o `Cmd + Shift + R` en Mac)
3. **Ve a Configuración** → **Perfil**
4. **Intenta subir un avatar**
5. **Debería funcionar** ✅

---

## 🔍 VERIFICACIÓN RÁPIDA

### ✅ Si el bucket está correcto, verás:

En Supabase Storage:
```
🔓 avatars (Public)
```

En la consola del navegador (`F12`):
```
✅ No más errores de "Bucket not found"
```

En tu aplicación:
```
✅ Puedes subir avatares sin errores
✅ Los avatares se muestran correctamente
```

---

## ❌ Problemas Comunes

### Problema 1: "No encuentro el botón 'New bucket'"

**Solución:**
- Asegúrate de estar en la sección **Storage** (icono 📁)
- El botón suele estar en la esquina **superior derecha**
- Si no lo ves, puede que necesites permisos de administrador en el proyecto

### Problema 2: "El bucket se creó pero sigue dando error"

**Posibles causas:**
1. ❌ El bucket NO está marcado como **Public**
   - **Solución**: Ve a Storage → avatars → Settings → Marca "Public bucket"

2. ❌ El nombre NO es exactamente `avatars`
   - **Solución**: Elimina el bucket y créalo de nuevo con el nombre correcto

3. ❌ Las políticas de Storage no se crearon
   - **Solución**: Ejecuta el SQL de las políticas (está en el script)

### Problema 3: "Dice que el bucket ya existe"

**Solución:**
1. Ve a **Storage**
2. Busca el bucket `avatars` en la lista
3. Si existe pero NO es público:
   - Click en el bucket → **Settings** → Marca **"Public bucket"**
4. Si existe y ES público, el problema está en las políticas (ejecuta el SQL de políticas)

### Problema 4: "Error 403 Forbidden" al subir

**Causa**: Las políticas de Storage no están configuradas.

**Solución**: Ejecuta este SQL en el **SQL Editor**:

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

## 📞 ¿Sigue sin funcionar?

Si después de seguir todos estos pasos el error persiste:

1. **Captura de pantalla** de tu Storage en Supabase (muestra el bucket)
2. **Captura de pantalla** del error en la consola del navegador
3. **Verifica** que ejecutaste el script SQL completo
4. **Comprueba** que estás autenticado en la aplicación

---

## ✅ Resumen

Para que los avatares funcionen necesitas:

1. ✅ Ejecutar el script SQL [`FIX_SYSTEM_CONFIG_AND_AVATARS.sql`](supabase/FIX_SYSTEM_CONFIG_AND_AVATARS.sql)
2. ✅ Crear el bucket `avatars` **MANUALMENTE** en Storage
3. ✅ Marcar el bucket como **PUBLIC** 🔓
4. ✅ Las políticas de Storage (se crean con el script SQL)

**Sin estos 4 pasos, los avatares NO funcionarán.**