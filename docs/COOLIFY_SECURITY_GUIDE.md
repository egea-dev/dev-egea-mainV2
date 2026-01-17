# Guía de Seguridad para Git en Coolify

## Resumen Ejecutivo

Esta guía establece las mejores prácticas de Platform Engineering y Ciberseguridad para un servidor Git local montado en Coolify.

---

## 1. Seguridad de Acceso

### 1.1 Llaves SSH
```bash
# Generar llave SSH Ed25519 (más segura que RSA)
ssh-keygen -t ed25519 -C "deploy@coolify-local" -f ~/.ssh/coolify_deploy

# Añadir al ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/coolify_deploy

# Copiar clave pública a Coolify
cat ~/.ssh/coolify_deploy.pub
```

### 1.2 Autenticación 2FA
- Habilitar 2FA en GitHub/GitLab para todas las cuentas con acceso
- Usar aplicaciones TOTP (Authy, Google Authenticator) en lugar de SMS

### 1.3 Políticas de Tokens (PAT)
| Tipo | Alcance | Expiración | Uso |
|------|---------|------------|-----|
| Deploy Token | `read_repository` | 90 días | Coolify deploys |
| CI Token | `read/write` | 30 días | GitHub Actions |
| Personal | Mínimo necesario | 7 días | Desarrollo local |

---

## 2. Protección de Ramas

### Reglas para `main`
```yaml
# En GitHub: Settings > Branches > Branch protection rules
branch: main
rules:
  - require_pull_request: true
  - required_reviewers: 1
  - require_status_checks: true
  - require_linear_history: true
  - block_force_push: true
  - block_deletions: true
```

---

## 3. Higiene de Secretos

### 3.1 .gitignore (ya configurado)
```gitignore
.env
.env.local
.env.*.local
!.env.example
```

### 3.2 Escaneo con Gitleaks
```bash
# Instalar gitleaks
# Windows: scoop install gitleaks
# macOS: brew install gitleaks

# Escanear repositorio
gitleaks detect --source . --verbose

# Escanear antes de cada commit (hook)
gitleaks protect --staged
```

### 3.3 Variables en Coolify
> **IMPORTANTE**: Nunca hardcodear secretos en el código.

En Coolify UI:
1. Application → Environment Variables
2. Añadir cada variable de Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Marcar como "Build Time" si se necesitan durante el build

---

## 4. Estrategia GitFlow Simplificada

```
main ─────●─────●─────●─────●───── (producción, auto-deploy)
           \   /     /     /
develop ────●─●─────●─────●─────── (staging, integración)
             \     /     /
feature/* ────●───●     /
               \       /
hotfix/* ───────────●─────────────
```

| Rama | Propósito | Deploy |
|------|-----------|--------|
| `main` | Producción estable | Auto (Coolify) |
| `develop` | Integración | Manual/Staging |
| `feature/*` | Nuevas funciones | No deploy |
| `hotfix/*` | Fixes urgentes | Merge directo a main |

---

## 5. Flujo con Coolify Webhooks

### Configuración Segura
```yaml
# En Coolify Application Settings
webhook:
  url: https://coolify.tudominio.com/api/v1/deploy
  secret: ${WEBHOOK_SECRET}  # Generado automáticamente
  events:
    - push
  branches:
    - main  # SOLO main dispara deploy
```

### Validación Pre-Deploy
Coolify solo desplegará si:
1. El push es a la rama `main`
2. El webhook secret coincide
3. El build pasa exitosamente

---

## 6. Hook de Pre-commit Completo

### Archivo: `.husky/pre-commit`
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Iniciando validaciones de seguridad y código..."

# 1. Escaneo de secretos
if command -v gitleaks &> /dev/null; then
  echo "🔐 Escaneando secretos..."
  gitleaks protect --staged --verbose || {
    echo "❌ Se detectaron secretos en el código. Commit bloqueado."
    exit 1
  }
fi

# 2. Linting
echo "📝 Ejecutando linter..."
npm run lint || {
  echo "❌ Errores de linting encontrados."
  exit 1
}

# 3. Type checking
echo "🔷 Verificando tipos TypeScript..."
npm run type-check || {
  echo "❌ Errores de TypeScript encontrados."
  exit 1
}

# 4. Build de prueba (opcional pero recomendado)
echo "🏗️ Simulando build de producción..."
npm run build || {
  echo "❌ El build falló. Commit bloqueado."
  exit 1
}

echo "✅ Todas las validaciones pasaron. Commit permitido."
```

### Activar Husky
```bash
npm install -D husky
npx husky install
npx husky add .husky/pre-commit "npm run validate"
```

---

## 7. Seguridad de Red en Coolify

### Docker Network Interna
```yaml
# docker-compose.yml (Coolify lo genera automáticamente)
services:
  app:
    networks:
      - coolify-internal
  
networks:
  coolify-internal:
    internal: true  # No accesible desde fuera
```

### Webhooks Internos
```bash
# URL interna (más segura, menor latencia)
http://coolify-proxy:8000/api/v1/deploy

# En lugar de
https://ip-publica:8000/api/v1/deploy
```
