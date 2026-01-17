# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS builder

# Variables de entorno para Vite se pasan via Coolify Build Arguments
# NO declarar ARG aquí - Coolify los inyecta automáticamente

WORKDIR /app

# Copiar archivos de dependencias primero (cache layer)
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Build de la aplicación
# Coolify inyecta VITE_* como Build Args automáticamente
RUN npm run build

# ================================
# Stage 2: Production (Hardened)
# ================================
FROM nginx:1.25-alpine AS production

# Instalar curl para healthchecks y limpiar cache
RUN apk add --no-cache curl \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root para nginx
RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S appuser -G appgroup

# Copiar configuración de nginx hardened
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # ================================
    # Compression
    # ================================
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/json application/xml+rss;

    # ================================
    # Security Headers (HARDENED)
    # ================================
    
    # Prevenir clickjacking
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Prevenir MIME sniffing
    add_header X-Content-Type-Options "nosniff" always;
    
    # XSS Protection (legacy, pero útil para navegadores antiguos)
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Política de referrer
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # HSTS - Forzar HTTPS (max-age 1 año)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Permissions Policy (reemplaza Feature-Policy)
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self), payment=()" always;
    
    # Content Security Policy para Vite + Supabase
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;

    # ================================
    # Caching
    # ================================
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ================================
    # SPA Fallback
    # ================================
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ================================
    # Health Check (minimalista)
    # ================================
    location /health {
        access_log off;
        return 200 "ok";
        add_header Content-Type text/plain;
    }
    
    # ================================
    # Bloquear acceso a archivos sensibles
    # ================================
    location ~ /\. {
        deny all;
        return 404;
    }
}
EOF

# Copiar archivos build
COPY --from=builder /app/dist /usr/share/nginx/html

# Cambiar permisos para usuario no-root
RUN chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appgroup /var/run/nginx.pid

# Cambiar a usuario no-root
USER appuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
