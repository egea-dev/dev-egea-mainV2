# Configuración de Coolify para egea-Main-control

## Build Arguments Requeridos

En Coolify UI, ve a **Application → General → Build Arguments** y añade:

| Variable | Descripción | Obligatorio |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |
| `VITE_SUPABASE_PRODUCTIVITY_URL` | URL Supabase secundario | ❌ |
| `VITE_SUPABASE_PRODUCTIVITY_ANON_KEY` | Clave secundaria | ❌ |
| `VITE_PRINTER_SERVER_URL` | URL del servidor de impresión | ❌ |

> **IMPORTANTE**: Marca todas las claves como **Sensitive** para que no aparezcan en logs.

## Configuración Recomendada

### General
- **Build Pack**: Dockerfile
- **Dockerfile Location**: `Dockerfile`
- **Port Exposes**: `80`

### Health Check
- **Path**: `/health`
- **Interval**: `30s`
- **Timeout**: `3s`

### Resources (Recomendado)
- **CPU Limit**: `1.0`
- **Memory Limit**: `512MB`

## Seguridad Implementada

El Dockerfile incluye:
- ✅ Usuario no-root (`appuser`)
- ✅ Content-Security-Policy para Supabase
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-Frame-Options, X-Content-Type-Options
- ✅ Referrer-Policy
- ✅ Bloqueo de archivos sensibles (`.env`, `.git`)

## Troubleshooting

### Error: Variables VITE_* no definidas
Asegúrate de que las variables están en **Build Arguments**, no en Environment Variables.

### Error: Permission denied
El contenedor ahora corre como `appuser`. Si hay problemas de permisos, verifica que los archivos en `/usr/share/nginx/html` tienen los permisos correctos.

### CSP bloqueando recursos
Si ves errores de CSP en la consola del navegador, puede que necesites ajustar el dominio de Supabase en el header `Content-Security-Policy` del Dockerfile.
