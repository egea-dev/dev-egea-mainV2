# 🔍 Dónde Configurar Variables en Coolify

## ✅ Solución Actualizada (Después del cambio en Dockerfile)

Ahora que hemos actualizado el `Dockerfile` para aceptar variables explícitamente, puedes configurarlas en **cualquiera** de estas ubicaciones en Coolify:

---

## 📍 **Ubicaciones Posibles en Coolify**

### **Opción 1: Environment Variables (MÁS COMÚN)** ✅

Esta es la opción más fácil y la que funciona en todas las versiones de Coolify:

1. **Ve a tu aplicación** en Coolify
2. Busca la pestaña o sección **"Environment"** o **"Environment Variables"**
3. Click en **"+ Add"** o **"+ New Variable"**
4. Agrega cada variable:

```
Name: VITE_SUPABASE_URL
Value: https://jyaudpctcqcuskzwmism.supabase.co
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: [Tu Anon Key completa]
```

```
Name: VITE_SUPABASE_MAIN_ANON_KEY
Value: [Tu Main Anon Key completa]
```

```
Name: VITE_SUPABASE_PRODUCTIVITY_URL
Value: [Tu URL de Productivity]
```

```
Name: VITE_SUPABASE_PRODUCTIVITY_ANON_KEY
Value: [Tu Productivity Anon Key]
```

```
Name: VITE_PRINTER_SERVER_URL
Value: http://192.168.1.236:5000  # Puerto típico (opcional)
```

```
Name: VITE_APP_VERSION
Value: 2.0.1-dev
```

5. **Guarda** los cambios
6. Haz **Deploy** o **Redeploy**

---

### **Opción 2: Build Arguments (Si está disponible)**

Si ves una sección específica para **Build Arguments**:

1. Ve a **Build** → **Build Arguments**
2. O busca **Configuration** → **Build Settings**
3. Agrega las mismas variables de arriba

---

### **Opción 3: Archivo .env en Coolify (Algunas versiones)**

Algunas versiones de Coolify permiten pegar todo el contenido de un archivo `.env`:

1. Busca un campo de texto grande que diga **"Environment File"** o **".env content"**
2. Pega todo el contenido de tu archivo `.env` local
3. Guarda

---

## 📋 **Lista de Variables a Configurar**

Copia y pega estas líneas directamente si encuentras la opción de archivo `.env`:

```env
VITE_SUPABASE_URL=https://jyaudpctcqcuskzwmism.supabase.co
VITE_SUPABASE_ANON_KEY=[tu-anon-key-main]
VITE_SUPABASE_MAIN_ANON_KEY=[tu-main-anon-key]
VITE_SUPABASE_PRODUCTIVITY_URL=[tu-url-productivity]
VITE_SUPABASE_PRODUCTIVITY_ANON_KEY=[tu-productivity-anon-key]
VITE_PRINTER_SERVER_URL=http://192.168.1.236:5000  # OPCIONAL
VITE_APP_VERSION=2.0.1-dev
```

**⚠️ IMPORTANTE**: Reemplaza los valores entre `[corchetes]` con tus valores reales de `.env`

---

## 🎯 **Cómo Verificar que Funcionó**

Después de configurar las variables y hacer deploy:

### 1. **Verifica que el build completó exitosamente**
   - Los logs no deben mostrar errores de variables undefined
   - El build debe completar las 2 etapas (Build y Production)

### 2. **Verifica en el navegador**
   ```javascript
   // Abre DevTools (F12) → Console
   console.log(import.meta.env.VITE_SUPABASE_URL);
   // Debería mostrar tu URL de Supabase
   ```

### 3. **Prueba el login**
   - Si el login funciona, las variables están correctamente configuradas

---

## 🆘 **Si Aún No Funciona**

Si después de configurar las variables el build falla o las variables siguen `undefined`:

### **Verifica los logs de build:**

En Coolify, ve a **Logs** o **Build Logs** y busca:

```
✅ CORRECTO:
Successfully compiled with x warnings
Built for production

❌ ERROR:
import.meta.env.VITE_SUPABASE_URL is undefined
```

### **Si aparece "undefined":**

1. Verifica que las variables estén **guardadas** en Coolify
2. Verifica que el nombre sea **exactamente** igual (case-sensitive)
3. Haz un **nuevo deploy** (no redeploy, sino Stop → Start)
4. Verifica que el `Dockerfile` actualizado esté en GitHub:

```bash
git add Dockerfile
git commit -m "fix: Actualizar Dockerfile para aceptar variables de Coolify"
git push egea main
```

---

## 📸 **Capturas de Referencia**

La interfaz de Coolify puede verse así:

```
┌─────────────────────────────────────────────┐
│  Egea Main Control                          │
├─────────────────────────────────────────────┤
│  [General] [Environment] [Build] [Deploy]  │ ← Pestañas
├─────────────────────────────────────────────┤
│                                             │
│  Environment Variables                      │
│  ┌────────────────────────────────────────┐│
│  │ Name                    Value          ││
│  │ ──────────────────────────────────────││
│  │ VITE_SUPABASE_URL      https://...    ││
│  │ VITE_SUPABASE_ANON_KEY eyJhbGc...     ││
│  │                                        ││
│  │ [+ Add Variable]                      ││
│  └────────────────────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ **Resumen Simplificado**

1. **Busca "Environment" o "Environment Variables"** en Coolify
2. **Agrega cada variable** VITE_* de tu archivo `.env`
3. **Guarda**
4. **Deploy** o **Redeploy**
5. **Verifica** que el build complete sin errores

---

**Fecha**: 2026-01-19  
**Actualizado**: Dockerfile modificado para soportar variables de Environment
