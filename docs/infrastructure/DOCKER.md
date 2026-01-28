# 🐳 Docker Deployment Guide

## Requisitos Previos

- Docker 20.10+
- Docker Compose 2.0+ (opcional, pero recomendado)

## 🚀 Construcción y Despliegue

### Opción 1: Usando Docker Compose (Recomendado)

```bash
# Construir y levantar el contenedor
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener el contenedor
docker-compose down
```

### Opción 2: Usando Docker directamente

```bash
# Construir la imagen
docker build -t egea-main-control:latest .

# Ejecutar el contenedor
docker run -d \
  --name egea-app \
  -p 3000:80 \
  --restart unless-stopped \
  egea-main-control:latest

# Ver logs
docker logs -f egea-app

# Detener y eliminar el contenedor
docker stop egea-app
docker rm egea-app
```

## 🔧 Configuración

### Variables de Entorno

Si necesitas configurar variables de entorno, crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

Luego modifica el `docker-compose.yml` para incluir:

```yaml
services:
  egea-app:
    env_file:
      - .env
```

### Puertos

Por defecto, la aplicación se expone en el puerto **3000**. Para cambiar el puerto:

```bash
# Docker Compose: Edita docker-compose.yml
ports:
  - "8080:80"  # Cambia 3000 por el puerto deseado

# Docker directo:
docker run -d -p 8080:80 egea-main-control:latest
```

## 🏥 Health Check

El contenedor incluye un endpoint de health check en `/health`:

```bash
curl http://localhost:3000/health
# Respuesta: healthy
```

## 📊 Monitoreo

### Ver estado del contenedor

```bash
docker ps
docker-compose ps
```

### Ver uso de recursos

```bash
docker stats egea-app
```

### Inspeccionar logs

```bash
# Últimas 100 líneas
docker logs --tail 100 egea-app

# Seguir logs en tiempo real
docker logs -f egea-app
```

## 🔄 Actualización

Para actualizar la aplicación con nuevos cambios:

```bash
# Opción 1: Docker Compose
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Opción 2: Docker directo
docker stop egea-app
docker rm egea-app
docker build -t egea-main-control:latest .
docker run -d --name egea-app -p 3000:80 egea-main-control:latest
```

## 🐛 Troubleshooting

### El contenedor no inicia

```bash
# Ver logs de error
docker logs egea-app

# Verificar que el puerto no esté en uso
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac
```

### Problemas de build

```bash
# Limpiar cache de Docker
docker builder prune -a

# Rebuild sin cache
docker build --no-cache -t egea-main-control:latest .
```

### Acceder al contenedor

```bash
# Abrir shell dentro del contenedor
docker exec -it egea-app sh
```

## 🏗️ Arquitectura del Dockerfile

El Dockerfile utiliza **multi-stage build** para optimizar el tamaño final:

1. **Stage 1 (Builder)**: 
   - Node.js 20 Alpine
   - Instala dependencias
   - Compila la aplicación

2. **Stage 2 (Production)**:
   - Nginx Alpine (imagen ligera)
   - Solo contiene archivos estáticos compilados
   - Configuración optimizada con gzip y headers de seguridad

**Tamaño aproximado**: ~50MB (vs ~500MB sin multi-stage)

## 📦 Optimizaciones Incluidas

- ✅ Compresión Gzip automática
- ✅ Cache de assets estáticos (1 año)
- ✅ Headers de seguridad (X-Frame-Options, X-XSS-Protection, etc.)
- ✅ SPA routing (fallback a index.html)
- ✅ Health check endpoint
- ✅ Logs estructurados de Nginx

## 🌐 Despliegue en Producción

### Docker Hub

```bash
# Tag de la imagen
docker tag egea-main-control:latest neuralstories/egea-main-control:latest

# Push a Docker Hub
docker push neuralstories/egea-main-control:latest
```

### Servidor Remoto

```bash
# En el servidor
docker pull neuralstories/egea-main-control:latest
docker run -d -p 80:80 --name egea-app neuralstories/egea-main-control:latest
```

## 📝 Notas Adicionales

- La aplicación se sirve en el puerto **80** dentro del contenedor
- Nginx está configurado para servir la aplicación como SPA
- Los logs de Nginx se envían a stdout/stderr para Docker
- El contenedor se reinicia automáticamente si falla (restart policy)
