# 🚨 SOLUCIÓN RÁPIDA - Errores 400

## Problema

Estás viendo estos errores en la consola:
- ❌ `GET .../system_config... 400 (Bad Request)`
- ❌ `POST .../storage/v1/object/avatars... 400 (Bad Request)`
- ❌ `Upload error: StorageApiError: Bucket not found`

---

## ⚡ Solución en 4 Pasos (5 minutos)

### 1️⃣ EJECUTAR SQL - System Config (1 min)

1. Abre tu **Dashboard de Supabase**: https://supabase.com/dashboard
2. Ve a **SQL Editor** → **New query**
3. Copia TODO el contenido de [`supabase/FIX_SYSTEM_CONFIG_AND_AVATARS.sql`](supabase/FIX_SYSTEM_CONFIG_AND_AVATARS.sql)
4. Pégalo y dale **Run** ▶️
5. Espera los mensajes de confirmación

✅ Esto soluciona el error: `GET .../system_config... 400`

---

### 2️⃣ CREAR BUCKET ⚠️ PASO MANUAL OBLIGATORIO (2 min)

**IMPORTANTE**: El bucket NO se puede crear con SQL. Debes hacerlo MANUALMENTE en el dashboard.

**Guía paso a paso detallada**: [`CREAR_BUCKET_AVATARES.md`](CREAR_BUCKET_AVATARES.md) ← **Lee esto si tienes dudas**

**Resumen rápido:**
1. En el mismo dashboard de Supabase, **ve a Storage** en el menú lateral izquierdo
2. **Click en "New bucket"** o "Create a new bucket"
3. **Configura EXACTAMENTE así**:
   ```
   Name: avatars
   Public bucket: ✅ DEBE ESTAR MARCADO (candado abierto 🔓)
   File size limit: 2 MB
   Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
   ```
4. **Click "Create bucket"** o "Save"
5. **Verifica que aparece** el bucket con un icono de **candado abierto** 🔓

---

### 3️⃣ EJECUTAR SQL - Políticas de Storage (1 min)

**IMPORTANTE**: Este paso SOLO después de crear el bucket en el paso 2.

1. Vuelve al **SQL Editor**
2. **New query**
3. Copia TODO el contenido de [`supabase/APLICAR_POLITICAS_STORAGE.sql`](supabase/APLICAR_POLITICAS_STORAGE.sql)
4. Pégalo y dale **Run** ▶️
5. Deberías ver: `✅ Políticas de Storage creadas: 4`

✅ Esto soluciona el error: `new row violates row-level security policy`

---

### 4️⃣ VERIFICAR (1 min)

1. Recarga tu aplicación con `Ctrl + F5`
2. Abre la consola del navegador (`F12`)
3. Los errores 400 deberían **desaparecer completamente**
4. Ve a **Configuración** → **Perfil** y prueba subir un avatar
5. Debería funcionar sin errores ✅

---

## ✅ Listo

Si seguiste estos 3 pasos, los errores deberían estar resueltos.

Si aún hay problemas, consulta [`INSTRUCCIONES_CONFIGURACION_SUPABASE.md`](INSTRUCCIONES_CONFIGURACION_SUPABASE.md) para solución de problemas detallada.

---

## 🔍 Verificación Rápida

### Verifica que system_config funciona:
```sql
-- Ejecuta esto en SQL Editor
SELECT * FROM public.system_config;
```
Deberías ver 8 configuraciones.

### Verifica que el bucket existe:
1. Ve a **Storage**
2. Deberías ver el bucket `avatars` con un icono de **candado abierto** 🔓 (público)

---

## 📞 ¿Problemas?

- **Error persiste**: Re-ejecuta el script SQL (es seguro ejecutarlo múltiples veces)
- **Bucket no aparece**: Verifica que escribiste exactamente `avatars` (sin espacios, en minúsculas)
- **No puedo subir avatar**: Verifica que el bucket está marcado como **Public**
- **Otros errores**: Ver [`INSTRUCCIONES_CONFIGURACION_SUPABASE.md`](INSTRUCCIONES_CONFIGURACION_SUPABASE.md)