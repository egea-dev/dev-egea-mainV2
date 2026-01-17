# Lista de Tareas: Seguridad Coolify

> **Para ejecutar por un agente**: Esta lista está diseñada para ser ejecutada paso a paso por un modelo de IA más económico (ej: Sonnet).

---

## Fase 1: Configuración de Husky y Pre-commit

- [ ] **1.1** Instalar Husky como dependencia de desarrollo
  ```bash
  cd c:\Users\Usuari\Documents\GitHub\MainV2\v5-final\egea-Main-control
  npm install -D husky
  ```

- [ ] **1.2** Inicializar Husky
  ```bash
  npx husky install
  ```

- [ ] **1.3** Crear el hook pre-commit
  ```bash
  npx husky add .husky/pre-commit "npm run validate"
  ```

- [ ] **1.4** Verificar que el script `validate` existe en `package.json`
  - Ya existe: `"validate": "npm run lint && npm run type-check && npm run build"`

- [ ] **1.5** Hacer el hook ejecutable (Linux/Mac)
  ```bash
  chmod +x .husky/pre-commit
  ```

---

## Fase 2: Configuración de Gitleaks

- [ ] **2.1** Verificar que `.gitleaks.toml` existe en el proyecto
  - Ruta: `c:\Users\Usuari\Documents\GitHub\MainV2\v5-final\egea-Main-control\.gitleaks.toml`

- [ ] **2.2** Instalar gitleaks (Windows)
  ```powershell
  # Opción 1: Scoop
  scoop install gitleaks
  
  # Opción 2: Descargar binario desde GitHub releases
  # https://github.com/gitleaks/gitleaks/releases
  ```

- [ ] **2.3** Ejecutar escaneo inicial del repositorio
  ```bash
  gitleaks detect --source . --verbose
  ```

- [ ] **2.4** Si hay secretos detectados, rotarlos inmediatamente

---

## Fase 3: Configuración en GitHub

- [ ] **3.1** Ir a GitHub > Settings > Branches
- [ ] **3.2** Añadir regla de protección para `main`:
  - ✅ Require pull request before merging
  - ✅ Require approvals (1)
  - ✅ Require status checks to pass
  - ✅ Require linear history
  - ✅ Do not allow force pushes
  - ✅ Do not allow deletions

---

## Fase 4: Variables de Entorno en Coolify

- [ ] **4.1** Acceder a Coolify Dashboard
- [ ] **4.2** Ir a Application > Environment Variables
- [ ] **4.3** Añadir las siguientes variables:
  ```
  VITE_SUPABASE_URL=<valor>
  VITE_SUPABASE_ANON_KEY=<valor>
  ```
- [ ] **4.4** Marcar como "Build Time" = true
- [ ] **4.5** Guardar y redesplegar

---

## Fase 5: Webhook de Coolify

- [ ] **5.1** En Coolify, ir a Application > Webhooks
- [ ] **5.2** Copiar el Webhook URL y Secret
- [ ] **5.3** En GitHub, ir a Settings > Webhooks > Add webhook
- [ ] **5.4** Configurar:
  - Payload URL: `<Coolify Webhook URL>`
  - Content type: `application/json`
  - Secret: `<Coolify Secret>`
  - Events: Just the push event
- [ ] **5.5** Guardar y verificar conexión (ping)

---

## Fase 6: Actualizar Hook Pre-commit con Gitleaks

- [ ] **6.1** Editar `.husky/pre-commit` con el script completo:
  ```bash
  #!/bin/sh
  . "$(dirname "$0")/_/husky.sh"

  echo "🔍 Validaciones de seguridad..."

  # Escaneo de secretos (si gitleaks instalado)
  if command -v gitleaks &> /dev/null; then
    gitleaks protect --staged || exit 1
  fi

  # Validaciones de código
  npm run validate || exit 1

  echo "✅ Commit permitido."
  ```

---

## Fase 7: Commit y Push de Configuración

- [ ] **7.1** Añadir archivos de configuración
  ```bash
  git add .husky/ docs/
  ```

- [ ] **7.2** Commit
  ```bash
  git commit -m "chore: Add Husky pre-commit hooks and security docs"
  ```

- [ ] **7.3** Push
  ```bash
  git push origin main
  ```

---

## Verificación Final

- [ ] Hacer un cambio de prueba y verificar que el hook pre-commit se ejecuta
- [ ] Intentar commit con un secreto falso y verificar que gitleaks lo bloquea
- [ ] Verificar que el webhook de Coolify dispara el deploy automático
