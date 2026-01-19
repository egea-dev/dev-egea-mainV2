# 🚀 Guía de Despliegue en Coolify Local desde GitHub

Esta guía te ayudará a desplegar **Egea Main Control** en tu instancia local de Coolify usando GitHub como fuente.

## 📋 Requisitos Previos

- ✅ Coolify instalado en tu máquina local
- ✅ Repositorio en GitHub: `https://github.com/egea-dev/MainControl-Egea`
- ✅ Credenciales de Supabase (Main y Productivity)
- ✅ Docker instalado y funcionando

## 🔍 Estado Actual del Repositorio

Tu repositorio está configurado con los siguientes remotos:

```bash
egea    → https://github.com/egea-dev/MainControl-Egea.git (PRINCIPAL)
origin  → https://github.com/NeuralStories/MainControl.git (ORIGINAL)
backup  → https://github.com/NeuralStories/egea-Main-control-backup-2026 (RESPALDO)
```

**Para Coolify usa**: `https://github.com/egea-dev/MainControl-Egea.git`

---

## 🎯 Paso 1: Asegurar que el Código Esté en GitHub

### Verificar el estado actual

```bash
cd c:\Users\Usuari\Documents\GitHub\MainV2\GitHub_Productivity\egea-Main-control
git status
git log --oneline -3
```

### Si necesitas hacer commit y push de cambios pendientes

```bash
# Ver cambios pendientes
git status

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "chore: Preparar para despliegue en Coolify local"

# Push a GitHub
git push egea main
```

---

## 🐳 Paso 2: Configurar Coolify

### 2.1 Acceder a Coolify

1. Abre tu navegador y accede a tu instancia local de Coolify:
   - Normalmente: `http://localhost:8000` o `http://tu-ip-local:8000`

2. Inicia sesión con tus credenciales

### 2.2 Crear un Nuevo Proyecto

1. **Dashboard** → **Projects** → **+ Add**
2. **Nombre del Proyecto**: `Egea Main Control`
3. **Descripción**: `Sistema de control empresarial con gestión comercial, producción y envíos`
4. Haz clic en **Create Project**

### 2.3 Crear Nueva Aplicación

1. Dentro del proyecto → **+ Add Resource** → **Application**
2. Selecciona **GitHub**
3. **Autoriza GitHub** si es la primera vez:
   - Coolify te pedirá conectar tu cuenta de GitHub
   - Acepta los permisos necesarios

### 2.4 Seleccionar Repositorio

1. **Repository**: `egea-dev/MainControl-Egea`
2. **Branch**: `main`
3. **Build Pack**: Selecciona **Dockerfile**
4. Haz clic en **Continue**

---

## ⚙️ Paso 3: Configurar Build Arguments (CRÍTICO)

⚠️ **MUY IMPORTANTE**: Las variables `VITE_*` deben configurarse como **Build Arguments**, NO como Environment Variables.

### ¿Por qué Build Arguments?

Las aplicaciones Vite compilan las variables de entorno durante el proceso de build, por lo que deben estar disponibles en ese momento.

### 3.1 Acceder a Build Arguments

1. En la configuración de tu aplicación en Coolify
2. Ve a la pestaña **Build**
3. Busca la sección **Build Arguments**

### 3.2 Agregar Variables

Agrega las siguientes variables una por una:

#### 🔐 Base de Datos MAIN (Autenticación)

```
Variable: VITE_SUPABASE_URL
Valor: https://tu-proyecto-main.supabase.co
```

```
Variable: VITE_SUPABASE_ANON_KEY
Valor: tu-anon-key-main-aqui
```

#### 📊 Base de Datos PRODUCTIVITY (Negocio)

```
Variable: VITE_SUPABASE_PRODUCTIVITY_URL
Valor: https://tu-proyecto-productivity.supabase.co
```

```
Variable: VITE_SUPABASE_PRODUCTIVITY_ANON_KEY
Valor: tu-anon-key-productivity-aqui
```

#### 🖨️ Servidor de Impresión (Opcional - Solo si tienes Zebra)

⚠️ **NOTA**: Esta variable es completamente opcional. Solo agrégala si tienes una impresora Zebra configurada.

```
Variable: VITE_PRINTER_SERVER_URL
Valor: http://192.168.1.236:5000  # Puerto típico, verifica tu configuración
```

### 3.3 Cómo Obtener las Credenciales de Supabase

1. **Main Database**:
   - Ve a tu proyecto Main en Supabase
   - **Settings** → **API**
   - Copia `URL` y `anon` key

2. **Productivity Database**:
   - Ve a tu proyecto Productivity en Supabase
   - **Settings** → **API**
   - Copia `URL` y `anon` key

---

## 🌐 Paso 4: Configurar Dominio y Puerto

### 4.1 Puerto

Coolify debería detectar automáticamente el puerto `80` del Dockerfile. Verifica:

1. Ve a **Network**
2. Asegúrate de que **Port** esté configurado como `80`

### 4.2 Dominio (Opcional)

Si quieres acceder con un dominio local:

1. **Network** → **Domains**
2. Puedes agregar un dominio local como:
   - `egea-control.local`
   - `control.localhost`
3. O simplemente usa la IP que Coolify te asigne

---

## 🚀 Paso 5: Desplegar

### 5.1 Iniciar el Build

1. Haz clic en el botón **Deploy** (generalmente en la parte superior derecha)
2. Coolify comenzará el proceso de build

### 5.2 Monitorear el Build

1. Ve a la pestaña **Logs** o **Build Logs**
2. Observa el progreso:
   ```
   ✅ Cloning repository...
   ✅ Building Docker image...
   ✅ Stage 1: Build (npm install, vite build)
   ✅ Stage 2: Production (nginx setup)
   ✅ Starting container...
   ```

3. El build completo puede tomar **3-5 minutos** la primera vez

### 5.3 Verificar el Estado

Una vez completado:
- Estado debería ser: **✅ Running**
- Health Check: **✅ Healthy**

---

## ✅ Paso 6: Verificación Post-Despliegue

### 6.1 Verificar Health Check

Abre tu terminal:

```bash
# Reemplaza con tu URL de Coolify
curl http://tu-dominio-coolify/health
```

Deberías recibir: `ok`

### 6.2 Verificar la Aplicación

1. Abre el navegador en la URL que te proporcionó Coolify
2. Deberías ver la página de login de **Egea Main Control**

### 6.3 Verificar Variables de Entorno en el Navegador

1. Abre DevTools (`F12`)
2. Ve a la **Consola**
3. Escribe:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL);
   ```
4. Deberías ver tu URL de Supabase

### 6.4 Probar Login

1. Intenta iniciar sesión con un usuario de prueba
2. Verifica que la conexión con Supabase funcione correctamente

---

## 🔄 Paso 7: Configurar Auto-Deploy (Opcional)

Para que Coolify redespliegue automáticamente cuando hagas push a GitHub:

### 7.1 Habilitar Webhooks

1. En Coolify, ve a **GitHub** → **Webhooks**
2. Haz clic en **Enable Webhook**
3. Coolify te dará una URL de webhook

### 7.2 Configurar en GitHub

1. Ve a tu repositorio en GitHub: `https://github.com/egea-dev/MainControl-Egea`
2. **Settings** → **Webhooks** → **Add webhook**
3. **Payload URL**: Pega la URL que te dio Coolify
4. **Content type**: `application/json`
5. **Which events**: Selecciona `Just the push event`
6. **Active**: ✅
7. Haz clic en **Add webhook**

### 7.3 Probar el Auto-Deploy

```bash
# Haz un cambio pequeño
echo "# Test auto-deploy" >> README.md
git add README.md
git commit -m "test: Verificar auto-deploy en Coolify"
git push egea main

# Observa Coolify - debería iniciar un nuevo build automáticamente
```

---

## 🛠️ Solución de Problemas Comunes

### ❌ Error: "Rollup failed to resolve import @/components/..."

**Causa**: Los archivos `tsconfig.json` o `vite.config.ts` están siendo excluidos.

**Solución**: Verifica `.dockerignore` - estos archivos NO deben estar excluidos.

### ❌ Error: Variables de entorno `undefined`

**Causa**: Las variables se configuraron como Runtime en lugar de Build Arguments.

**Solución**:
1. En Coolify, mueve TODAS las `VITE_*` a **Build Arguments**
2. Haz clic en **Redeploy**

### ❌ Error: "SecretsUsedInArgOrEnv" Warning

**Explicación**: Es solo una advertencia de seguridad. Las `anon` keys de Supabase son públicas por diseño (se usan en el cliente).

⚠️ **NUNCA uses** la `service_role` key en el frontend.

### ❌ Build muy lento o falla

**Causas posibles**:
- Falta de recursos (RAM/CPU) en tu máquina local
- Problemas de red al descargar dependencias

**Solución**:
1. Verifica recursos disponibles: `docker stats`
2. Si es necesario, aumenta los recursos asignados a Docker
3. Reinicia Docker Desktop

### ❌ No puedo acceder a la aplicación

**Verificar**:
1. Estado del contenedor: `docker ps | grep egea`
2. Logs del contenedor en Coolify
3. Puerto correcto (80)
4. Firewall local

---

## 📊 Arquitectura del Despliegue

```
┌─────────────────────────────────────────────────────────┐
│              TU MÁQUINA LOCAL                           │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │              COOLIFY                           │   │
│  │  ┌──────────────────────────────────────────┐ │   │
│  │  │     Docker Container (Egea Control)      │ │   │
│  │  │  ┌────────────────────────────────────┐  │ │   │
│  │  │  │      Nginx (Puerto 80)             │  │ │   │
│  │  │  │  ┌──────────────────────────────┐  │  │ │   │
│  │  │  │  │  React SPA (Build de Vite) │  │  │ │   │
│  │  │  │  │  - Variables VITE_* injected│  │  │ │   │
│  │  │  │  └──────────────────────────────┘  │  │ │   │
│  │  │  └────────────────────────────────────┘  │ │   │
│  │  └──────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTPS (Internet)
                        ▼
         ┌──────────────────────────────┐
         │   Supabase Cloud             │
         │   ├─ Main DB (Auth)          │
         │   └─ Productivity DB (Data)  │
         └──────────────────────────────┘
```

---

## 🔄 Flujo de Actualización

### Método 1: Manual

```bash
# 1. Hacer cambios en tu código local
# 2. Commit y push
git add .
git commit -m "feat: Nueva funcionalidad"
git push egea main

# 3. En Coolify, hacer clic en "Redeploy"
```

### Método 2: Automático (con webhook configurado)

```bash
# Solo necesitas hacer push
git add .
git commit -m "feat: Nueva funcionalidad"
git push egea main

# Coolify detecta el push y redesplega automáticamente
```

---

## 📝 Checklist Final

Antes de dar por completado el despliegue, verifica:

- [ ] La aplicación está corriendo en Coolify (estado: Running)
- [ ] Health check responde correctamente
- [ ] Puedes acceder a la aplicación desde el navegador
- [ ] El login funciona (conexión con Supabase Main)
- [ ] Los módulos cargan datos (conexión con Supabase Productivity)
- [ ] Las variables de entorno se inyectaron correctamente
- [ ] (Opcional) El webhook de auto-deploy está configurado
- [ ] (Opcional) La impresora Zebra funciona (si está en la misma red)

---

## 🆘 Soporte Adicional

### Logs útiles

```bash
# Ver logs del contenedor
docker logs <container-id>

# Ver logs en tiempo real
docker logs -f <container-id>

# Ver logs de Coolify
# Desde la interfaz web: Logs → Application Logs
```

### Archivos de Referencia

- 📄 `Dockerfile` - Configuración del contenedor
- 📄 `docs/COOLIFY_DEPLOYMENT.md` - Guía general de Coolify
- 📄 `docs/COOLIFY_SECURITY_GUIDE.md` - Buenas prácticas de seguridad
- 📄 `.env.example` - Ejemplo de variables de entorno

---

## 🎉 ¡Listo!

Si todo está funcionando correctamente, tu aplicación **Egea Main Control** ahora está desplegada en Coolify local y sincronizada con GitHub.

**Próximos pasos sugeridos**:
1. Configurar backup automático de la base de datos Supabase
2. Implementar monitoreo con logs centralizados
3. Configurar SSL/HTTPS si expones la aplicación a internet
4. Documentar el flujo de trabajo del equipo

---

**Fecha de creación**: 2026-01-19  
**Última actualización**: 2026-01-19  
**Versión**: 1.0
