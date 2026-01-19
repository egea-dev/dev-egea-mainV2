---
description: Desplegar Egea Main Control en Coolify Local desde GitHub
---

# 🚀 Workflow: Deploy en Coolify Local

Este workflow te guía paso a paso para desplegar tu aplicación en Coolify local usando GitHub.

## Pre-requisitos

✅ Coolify instalado y accesible (normalmente en `http://localhost:8000`)
✅ Repositorio sincronizado con GitHub: `https://github.com/egea-dev/MainControl-Egea`
✅ Credenciales de Supabase a mano (Main y Productivity)

---

## Paso 1: Verificar Estado del Repositorio

// turbo
```bash
git status
```

// turbo
```bash
git log --oneline -3
```

**Acción**: Si hay cambios sin commitear, hazlo ahora:
```bash
git add .
git commit -m "chore: Preparar para deploy en Coolify"
git push egea main
```

---

## Paso 2: Preparar Variables de Entorno

**Opción A: Si ya tienes un archivo `.env` configurado:**

// turbo
```bash
pwsh scripts/get-env-for-coolify.ps1
```

Este script te mostrará todas las variables formateadas para Coolify.

**Opción B: Si no tienes `.env`, créalo:**

```bash
cp .env.example .env
notepad .env
```

Completa con tus credenciales de Supabase y guarda el archivo.

---

## Paso 3: Acceder a Coolify

1. Abre tu navegador
2. Ve a: `http://localhost:8000` (o la URL de tu Coolify local)
3. Inicia sesión

---

## Paso 4: Crear Proyecto en Coolify

### En la interfaz web de Coolify:

1. **Dashboard** → **Projects** → **+ Add New Project**
2. **Nombre**: `Egea Main Control`
3. **Descripción**: `Sistema de control empresarial`
4. Click en **Save**

---

## Paso 5: Crear Aplicación

### Dentro del proyecto recién creado:

1. Click en **+ Add Resource** → **Application**
2. Selecciona **Public Repository** (si tu repo es público) o **GitHub** (si es privado)
3. Si es privado, autoriza GitHub en Coolify (primera vez)

---

## Paso 6: Configurar Repositorio

1. **Repository URL**: `https://github.com/egea-dev/MainControl-Egea`
2. **Branch**: `main`
3. **Build Pack**: `Dockerfile`
4. Click en **Continue**

---

## Paso 7: Configurar Build Arguments (⚠️ CRÍTICO)

📌 **MUY IMPORTANTE**: Las variables `VITE_*` deben ir en **Build Arguments**, NO en Environment Variables.

### En Coolify:

1. Ve a la pestaña **Build**
2. Busca **Build Arguments** o **Build-time Variables**
3. Agrega cada una de estas variables:

#### 🔐 Main Database

```
Variable: VITE_SUPABASE_URL
Valor: [Tu URL de Supabase Main]
```

```
Variable: VITE_SUPABASE_ANON_KEY
Valor: [Tu Anon Key de Supabase Main]
```

#### 📊 Productivity Database

```
Variable: VITE_SUPABASE_PRODUCTIVITY_URL
Valor: [Tu URL de Supabase Productivity]
```

```
Variable: VITE_SUPABASE_PRODUCTIVITY_ANON_KEY
Valor: [Tu Anon Key de Supabase Productivity]
```

#### 🖨️ Impresora (Opcional)

```
Variable: VITE_PRINTER_SERVER_URL
Valor: http://192.168.1.236:500
```

**💡 Tip**: Si ejecutaste el script del Paso 2, copia/pega los valores desde la salida del script.

---

## Paso 8: Configurar Puerto

1. Ve a **Network** → **Ports**
2. Verifica que el puerto sea: `80`
3. Coolify debería detectarlo automáticamente del Dockerfile

---

## Paso 9: Desplegar 🎯

1. Click en el botón **Deploy** (esquina superior derecha, generalmente)
2. Observa los logs en tiempo real
3. El build tomará aproximadamente **3-5 minutos**

### Progreso esperado:
```
✅ Cloning repository from GitHub...
✅ Building image...
✅ Stage 1/2: Building (npm install, vite build)
✅ Stage 2/2: Production (nginx)
✅ Starting container...
✅ Health check passed
```

---

## Paso 10: Verificar el Deploy

### 10.1 Verificar Health Check

// turbo
```bash
# Reemplaza con la URL que te dio Coolify
curl http://localhost:PORT/health
```

Deberías ver: `ok`

### 10.2 Abrir en el Navegador

1. Coolify te mostrará la URL de la aplicación
2. Ábrela en tu navegador
3. Deberías ver la pantalla de login de **Egea Main Control**

### 10.3 Verificar Variables (En el navegador)

1. Abre DevTools (`F12`)
2. Ve a **Console**
3. Ejecuta:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```
4. Deberías ver tu URL de Supabase

### 10.4 Probar Login

1. Inicia sesión con un usuario válido
2. Verifica que carguen los módulos correctamente

---

## Paso 11: Configurar Auto-Deploy (Opcional)

Para que Coolify redespliegue automáticamente cuando hagas `git push`:

### En Coolify:

1. Ve a **Webhooks** o **Git Integration**
2. Click en **Enable Webhook** o **Add Webhook**
3. Copia la URL del webhook que te proporciona Coolify

### En GitHub:

1. Ve a: `https://github.com/egea-dev/MainControl-Egea/settings/hooks`
2. Click en **Add webhook**
3. **Payload URL**: [Pega la URL de Coolify]
4. **Content type**: `application/json`
5. **Which events**: Selecciona `Just the push event`
6. **Active**: ✅ (marcado)
7. Click en **Add webhook**

### Probar el Auto-Deploy:

```bash
echo "# Test auto-deploy" >> README.md
git add README.md
git commit -m "test: Verificar auto-deploy"
git push egea main
```

Observa Coolify - debería iniciar un nuevo build automáticamente.

---

## ✅ Checklist Final

Antes de dar por completado el deploy:

- [ ] Estado del contenedor: **Running**
- [ ] Health check: **Passing** (`/health` responde `ok`)
- [ ] La aplicación carga en el navegador
- [ ] El login funciona correctamente
- [ ] Los módulos cargan datos de Supabase
- [ ] Las variables de entorno se inyectaron correctamente
- [ ] (Opcional) Webhook de auto-deploy configurado
- [ ] (Opcional) Impresora funciona (si está en la misma red)

---

## 🆘 Troubleshooting

### ❌ Error: "Rollup failed to resolve import @/..."

**Solución**: Verifica que `.dockerignore` NO excluya `tsconfig.json` ni `vite.config.ts`

### ❌ Variables `undefined` en el navegador

**Solución**: 
1. Verifica que las variables estén en **Build Arguments**, NO en Environment Variables
2. Haz **Redeploy** en Coolify

### ❌ Build falla con error de memoria

**Solución**:
```bash
# Verifica recursos de Docker
docker system df
docker system prune -a
```

### ❌ No puedo acceder a la aplicación

**Verificar**:
1. Estado del contenedor: `docker ps`
2. Logs en Coolify
3. Firewall local
4. Puerto correcto (80)

---

## 📚 Recursos Adicionales

- 📖 `docs/COOLIFY_LOCAL_DEPLOY.md` - Guía detallada completa
- 📖 `docs/COOLIFY_DEPLOYMENT.md` - Guía general de Coolify
- 📖 `docs/COOLIFY_SECURITY_GUIDE.md` - Seguridad y buenas prácticas
- 📄 `.env.example` - Plantilla de variables de entorno
- 🐳 `Dockerfile` - Configuración del contenedor

---

## 🎉 ¡Deploy Completado!

Tu aplicación **Egea Main Control** ahora está corriendo en Coolify local, conectada a GitHub para actualizaciones automáticas.

**Próximos pasos recomendados**:
1. Configurar backup de Supabase
2. Implementar monitoreo de logs
3. Configurar SSL si expones a internet
4. Documentar flujo de trabajo del equipo

---

**Creado**: 2026-01-19  
**Versión**: 1.0
