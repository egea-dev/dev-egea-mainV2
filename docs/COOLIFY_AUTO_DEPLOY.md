# 🔄 Configurar Auto-Deploy desde GitHub a Coolify

Esta guía te explica cómo configurar el auto-deploy para que cada vez que hagas `git push`, Coolify redespliegue automáticamente tu aplicación.

---

## ✅ **Requisitos Previos**

- [ ] Ya configuraste las variables de entorno en Coolify (primera vez)
- [ ] Tu aplicación ya se desplegó exitosamente al menos una vez
- [ ] Tienes acceso de administrador al repositorio en GitHub

---

## 🔧 **Paso 1: Obtener Webhook URL de Coolify**

### **En la interfaz de Coolify:**

1. Ve a tu aplicación
2. En el menú lateral, haz click en **"Webhooks"**
3. Busca la sección **"GitHub Webhook"** o **"Deploy Webhook"**
4. Click en **"Generate Webhook URL"** o **"Enable Webhook"**
5. Coolify te mostrará una URL como:
   ```
   http://tu-coolify-ip:8000/api/v1/deploy/webhook/xxxxx-xxxxx-xxxxx
   ```
6. **📋 COPIA esa URL** (la necesitarás en el siguiente paso)

---

## 🐙 **Paso 2: Configurar Webhook en GitHub**

### **En tu navegador:**

1. Ve a tu repositorio: `https://github.com/egea-dev/MainControl-Egea`

2. Click en **Settings** (Configuración) → pestaña superior del repositorio

3. En el menú lateral izquierdo, busca **"Webhooks"**

4. Click en **"Add webhook"** (Agregar webhook)

5. Completa el formulario:

   | Campo | Valor |
   |-------|-------|
   | **Payload URL** | Pega la URL que copiaste de Coolify |
   | **Content type** | Selecciona: `application/json` |
   | **Secret** | Déjalo vacío (a menos que Coolify te dé uno) |
   | **SSL verification** | ✅ Enable SSL verification (si tu Coolify tiene HTTPS) <br> ⚠️ Disable (si usas HTTP local) |
   | **Which events would you like to trigger this webhook?** | Selecciona: `Just the push event` |
   | **Active** | ✅ Marcado |

6. Click en **"Add webhook"** (botón verde)

---

## ✅ **Paso 3: Probar el Auto-Deploy**

### **Test 1: Hacer un cambio pequeño**

En tu terminal local:

```bash
# Cambio de prueba
echo "# Test auto-deploy $(date)" >> README.md

# Commit y push
git add README.md
git commit -m "test: Verificar auto-deploy funcionando"
git push egea main
```

### **Test 2: Observar en Coolify**

1. Ve a la interfaz de Coolify
2. Deberías ver que **automáticamente** empieza un nuevo deploy
3. En la sección **"Deployments"** verás el progreso
4. Espera a que complete (3-5 minutos)

### **Test 3: Verificar el Webhook en GitHub**

1. En GitHub, ve a: `Settings` → `Webhooks`
2. Click en el webhook que creaste
3. Scroll down hasta **"Recent Deliveries"**
4. Deberías ver entregas recientes con ✅ (éxito)
5. Si ves ❌ (error), click en la entrega para ver detalles

---

## 🔄 **Flujo de Trabajo Después de Configurar**

### **Desarrollo Normal:**

```bash
# 1. Haces tus cambios en el código
code src/components/MiComponente.tsx

# 2. Guardas y pruebas localmente
npm run dev

# 3. Cuando esté listo, haces commit y push
git add .
git commit -m "feat: Nueva funcionalidad"
git push egea main

# 4. Coolify detecta el push AUTOMÁTICAMENTE
# 5. Coolify hace el build y deploy AUTOMÁTICAMENTE
# 6. En 3-5 minutos tu app está actualizada ✅
```

**✨ No necesitas tocar Coolify manualmente nunca más** (salvo que quieras cambiar variables)

---

## 🚨 **Cuándo SÍ Necesitas Tocar Coolify Manualmente**

### **1. Agregar una nueva variable de entorno**

Si tu código ahora necesita una nueva variable (ej: `VITE_NEW_API_KEY`):

1. Ve a Coolify → **"Environment Variables"**
2. Agrega la nueva variable
3. Haz **"Redeploy"** manualmente (solo esta vez)
4. Los siguientes pushes serán automáticos de nuevo

### **2. Cambiar el valor de una variable existente**

Si cambias la URL de Supabase o una API key:

1. Ve a Coolify → **"Environment Variables"**
2. Edita el valor de la variable
3. Guarda
4. Haz **"Redeploy"**

### **3. Cambiar configuración del contenedor**

- Cambiar puerto expuesto
- Modificar límites de recursos (RAM, CPU)
- Cambiar dominio

---

## 📊 **Diagrama del Flujo Automático**

```
┌─────────────────────────────────────────────────────────────┐
│                    TÚ (Desarrollador)                       │
│                                                             │
│  git add .                                                  │
│  git commit -m "feat: Nueva funcionalidad"                 │
│  git push egea main                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitHub                                   │
│                                                             │
│  1. Recibe el push                                          │
│  2. Detecta el webhook configurado                          │
│  3. Envía POST a Coolify con info del commit                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Coolify                                  │
│                                                             │
│  1. ✅ Recibe webhook de GitHub                             │
│  2. 📦 Clone del repo (rama main)                           │
│  3. 🔧 Lee variables guardadas (Environment Variables)      │
│  4. 🏗️  Ejecuta: docker build (con Dockerfile)              │
│  5. 🚀 Ejecuta: docker run (nuevo contenedor)               │
│  6. 🏥 Health check (/health)                               │
│  7. ✅ Swap: contenedor viejo → nuevo                       │
│  8. 🎉 Deploy completado                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Tu Aplicación Actualizada                      │
│              http://tu-coolify-url                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆘 **Troubleshooting**

### **❌ El webhook no se dispara**

**Verificar:**
1. En GitHub → Settings → Webhooks → Recent Deliveries
2. Si ves errores de red, verifica:
   - ¿Tu Coolify es accesible desde internet?
   - Si es local (localhost), GitHub no puede alcanzarlo
   - Solución: Usa ngrok o Cloudflare Tunnel

### **❌ El deploy falla automáticamente pero funciona manual**

**Posibles causas:**
1. Alguna variable de entorno falta
2. El Dockerfile cambió y necesita ajustes
3. Revisa los logs del deploy en Coolify

### **❌ GitHub muestra error 404 en el webhook**

**Causa:** La URL del webhook está incorrecta  
**Solución:** Verifica que copiaste la URL completa desde Coolify

---

## 💡 **Tips Profesionales**

### **1. Branch específico**

Si quieres que solo despliegue de una rama específica:

- En Coolify, verifica que esté configurado para escuchar solo la rama `main`
- Los pushes a otras ramas (ej: `develop`) no dispararán el deploy

### **2. Notificaciones**

Configura notificaciones en Coolify para recibir alertas:
- Deploy exitoso ✅
- Deploy fallido ❌
- Puedes usar: Email, Discord, Slack

### **3. Rollback rápido**

Si un deploy automático rompe algo:
1. Ve a Coolify → **"Deployments"**
2. Encuentra el deploy anterior (que funcionaba)
3. Click en **"Redeploy"** en ese deploy

---

## 📚 **Resumen**

| Acción | ¿Automático? | Frecuencia |
|--------|--------------|------------|
| Configurar variables de entorno | ❌ Manual | Solo primera vez |
| Git push → Deploy | ✅ Automático | Cada push a `main` |
| Agregar nueva variable | ❌ Manual | Cuando sea necesario |
| Actualizar código | ✅ Automático | Cada push a `main` |
| Cambiar valor de variable | ❌ Manual | Cuando cambies credenciales |

---

## 🎉 **¡Listo!**

Con esto configurado:
- ✅ Tu código se despliega automáticamente al hacer push
- ✅ Las variables se mantienen seguras (no en GitHub)
- ✅ Solo tocas Coolify cuando cambias configuración
- ✅ Flujo de desarrollo ágil y profesional

---

**Creado**: 2026-01-19  
**Actualizado**: 2026-01-19  
**Versión**: 1.0
