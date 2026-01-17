# Guía de Despliegue en Coolify

Esta guía explica cómo desplegar la aplicación **Egea Main Control** en Coolify.

## Requisitos Previos

- Acceso a una instancia de Coolify
- Repositorio Git accesible desde Coolify
- Credenciales de Supabase (Main y Productivity)

## Paso 1: Crear el Proyecto

1. En Coolify, ve a **Projects** → **Add New Project**
2. Nombra el proyecto (ej: "Egea Main Control")
3. Selecciona **Docker** como tipo de despliegue

## Paso 2: Configurar el Repositorio

1. Conecta tu repositorio Git
2. Selecciona la rama a desplegar (ej: `main`)
3. Asegúrate de que Coolify detecte el `Dockerfile`

## Paso 3: Configurar Variables de Entorno

> ⚠️ **IMPORTANTE**: Las variables `VITE_*` deben configurarse como **Build Arguments**, no como variables de runtime.

En Coolify, ve a **Variables de Entorno** → **Build Arguments** y agrega:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Main de Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon Key del proyecto Main | `eyJhbGciOiJIUzI1...` |
| `VITE_SUPABASE_PRODUCTIVITY_URL` | URL del proyecto Productivity | `https://yyy.supabase.co` |
| `VITE_SUPABASE_PRODUCTIVITY_ANON_KEY` | Anon Key de Productivity | `eyJhbGciOiJIUzI1...` |
| `VITE_PRINTER_SERVER_URL` | URL del servidor de impresión (opcional) | `https://print.example.com` |

### ¿Por qué Build Arguments?

Las aplicaciones Vite/React son **SPAs (Single Page Applications)**. Las variables de entorno `VITE_*` se incrustan en el código JavaScript durante el proceso de build. Por eso:

- ✅ **Build Arguments**: Se pasan a Docker durante `docker build` y Vite las incorpora al bundle
- ❌ **Variables de Runtime**: No funcionan porque el JavaScript ya está compilado

## Paso 4: Configurar el Puerto

Coolify debería detectar automáticamente el puerto `80` del Dockerfile. Si no:

1. Ve a **Settings** → **Ports**
2. Configura el puerto expuesto como `80`

## Paso 5: Desplegar

1. Haz clic en **Deploy**
2. Espera a que el build complete
3. Verifica que no hay errores en los logs

## Verificación

### Comprobar Health Check

```bash
curl https://tu-dominio.com/health
# Debería responder: "healthy"
```

### Verificar Variables de Entorno

Abre las DevTools del navegador y verifica en la consola:

```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
// Debería mostrar tu URL de Supabase
```

## Solución de Problemas

### Error: "Rollup failed to resolve import @/components/..."

**Causa**: Los archivos `tsconfig.json` o `vite.config.ts` no están disponibles durante el build.

**Solución**: Verifica que `.dockerignore` NO excluya estos archivos:
```
# ❌ MAL - No excluir estos archivos
tsconfig.json
vite.config.ts

# ✅ BIEN - Comentar o eliminar estas líneas
# tsconfig.json
# vite.config.ts
```

### Error: Variables de entorno undefined

**Causa**: Las variables se configuraron como runtime en lugar de build arguments.

**Solución**: 
1. En Coolify, mueve las variables de "Runtime" a "Build Arguments"
2. Vuelve a desplegar

### Error: SecretsUsedInArgOrEnv Warning

Este es un aviso de seguridad, no un error. Las claves `anon` de Supabase son públicas por diseño (se usan en el cliente). Sin embargo, **nunca uses la `service_role` key** en el frontend.

## Despliegue Local con Docker

Para probar localmente antes de subir a Coolify:

```bash
# Crear archivo .env con tus variables
cp .env.example .env
# Editar .env con tus valores reales

# Build
docker-compose build

# Run
docker-compose up -d

# Verificar
curl http://localhost:3000/health
```

## Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────┐
│                      COOLIFY                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Docker Container                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │           Nginx (Puerto 80)             │   │   │
│  │  │  ┌───────────────────────────────────┐  │   │   │
│  │  │  │    Static Files (React SPA)       │  │   │   │
│  │  │  │    - index.html                   │  │   │   │
│  │  │  │    - assets/*.js (con VITE_*)     │  │   │   │
│  │  │  │    - assets/*.css                 │  │   │   │
│  │  │  └───────────────────────────────────┘  │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
              ┌─────────────────────────┐
              │    Supabase (Main)      │
              │    Supabase (Prod)      │
              └─────────────────────────┘
```

## Actualizaciones

Para actualizar la aplicación:

1. Haz push de tus cambios al repositorio
2. En Coolify, haz clic en **Redeploy**
3. Coolify ejecutará un nuevo build con las últimas variables
