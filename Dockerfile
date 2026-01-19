# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS builder

# Declarar explícitamente las variables que Coolify debe pasar
# Coolify puede inyectarlas como Build Arguments o Environment Variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_MAIN_ANON_KEY
ARG VITE_SUPABASE_PRODUCTIVITY_URL
ARG VITE_SUPABASE_PRODUCTIVITY_ANON_KEY
ARG VITE_PRINTER_SERVER_URL
ARG VITE_APP_VERSION

# Convertirlas en variables de entorno para el build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_MAIN_ANON_KEY=$VITE_SUPABASE_MAIN_ANON_KEY
ENV VITE_SUPABASE_PRODUCTIVITY_URL=$VITE_SUPABASE_PRODUCTIVITY_URL
ENV VITE_SUPABASE_PRODUCTIVITY_ANON_KEY=$VITE_SUPABASE_PRODUCTIVITY_ANON_KEY
ENV VITE_PRINTER_SERVER_URL=$VITE_PRINTER_SERVER_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

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

# Verificar que el build generó los archivos (debug)
RUN ls -la /app/dist && \
    test -f /app/dist/index.html || (echo "ERROR: index.html not found!" && exit 1)

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
    listen 8050;
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
    
    # Content Security Policy para Vite + Supabase + Zebra + Google Fonts
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co https://api.qrserver.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://192.168.1.236:3003; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;

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

# Verificar que los archivos se copiaron correctamente (debug)
RUN ls -la /usr/share/nginx/html && \
    test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html not found in nginx html!" && exit 1)

# Cambiar permisos para usuario no-root
RUN chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appgroup /var/run/nginx.pid

# Cambiar a usuario no-root
USER appuser

EXPOSE 8050

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8050/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
