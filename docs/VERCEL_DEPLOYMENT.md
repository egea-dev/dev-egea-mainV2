# 🚀 Guía de Deployment en Vercel

**Fecha**: 12 de enero de 2026  
**Proyecto**: egea-Main-control

---

## 📋 Pre-requisitos

- ✅ Cuenta de Vercel
- ✅ Repositorio en GitHub
- ✅ Bases de datos Supabase configuradas
- ✅ Raspberry Pi con servidor de impresión (opcional)

---

## 🔧 Variables de Entorno en Vercel

### 1. Configurar en Vercel Dashboard

Ve a: **Project Settings → Environment Variables**

Agrega las siguientes variables:

#### MAIN Database (Autenticación)
```env
VITE_SUPABASE_URL=https://tu-proyecto-main.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-main
```

#### PRODUCTIVITY Database (Módulos de negocio)
```env
VITE_SUPABASE_PRODUCTIVITY_URL=https://tu-proyecto-productivity.supabase.co
VITE_SUPABASE_PRODUCTIVITY_ANON_KEY=tu-anon-key-productivity
```

#### Impresora Zebra (Opcional)
```env
VITE_PRINTER_SERVER_URL=http://TU_IP_RASPBERRY:3001
```

> [!IMPORTANT]
> Reemplaza `TU_IP_RASPBERRY` con la IP local de tu Raspberry Pi (ej: `192.168.1.100`)

---

## 📦 Deployment Automático

### Opción 1: Desde GitHub (Recomendado)

1. **Conectar repositorio**:
   - Ve a [vercel.com/new](https://vercel.com/new)
   - Selecciona tu repositorio de GitHub
   - Click en "Import"

2. **Configurar proyecto**:
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Agregar variables de entorno** (ver sección anterior)

4. **Deploy**:
   - Click en "Deploy"
   - Espera ~2-3 minutos

### Opción 2: Desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 🗄️ Setup de Bases de Datos

### ANTES del primer deployment

1. **Ejecutar scripts SQL** en Supabase:

#### MAIN Database
```sql
-- 1. Schema
supabase/final-scripts/MAIN/01_schema.sql

-- 2. RLS Policies
supabase/final-scripts/MAIN/02_rls_policies.sql
```

#### PRODUCTIVITY Database
```sql
-- 1. Schema
supabase/final-scripts/PRODUCTIVITY/01_schema.sql

-- 2. RLS Policies
supabase/final-scripts/PRODUCTIVITY/02_rls_policies.sql
```

2. **Crear usuario administrador**:
```sql
-- En MAIN Database
INSERT INTO public.profiles (
  auth_user_id,
  email,
  full_name,
  role,
  status
) VALUES (
  'auth-user-id-from-supabase-auth',
  'admin@tuempresa.com',
  'Administrador',
  'admin',
  'active'
);
```

> [!NOTE]
> Sigue la guía completa: [DATABASE_SETUP_GUIDE.md](file:///C:/Users/Usuari/.gemini/antigravity/brain/794af314-9ceb-47f8-b99e-209329f9a810/DATABASE_SETUP_GUIDE.md)

---

## 🖨️ Configuración de Impresora Zebra

### Raspberry Pi (Servidor de Impresión)

1. **Asegurar que el servidor está corriendo**:
```bash
# SSH a Raspberry Pi
ssh pi@192.168.X.X

# Verificar servidor
pm2 list
# Debe mostrar: zebra-print-server (online)
```

2. **IP Estática** (Recomendado):
   - Configura IP fija en tu router para Raspberry Pi
   - Actualiza `VITE_PRINTER_SERVER_URL` en Vercel

3. **Firewall**:
```bash
# Abrir puerto 3001
sudo ufw allow 3001
```

### Frontend (Vercel)

La app ya está configurada para usar la variable de entorno:
```typescript
const PRINTER_URL = import.meta.env.VITE_PRINTER_SERVER_URL;
```

> [!WARNING]
> **Limitación de red local**: La impresora solo funcionará desde dispositivos en la misma red que la Raspberry Pi. Para acceso externo, considera:
> - VPN a tu red local
> - Túnel SSH reverso
> - Servicio de túnel (ngrok, cloudflare tunnel)

---

## ✅ Checklist de Deployment

### Pre-deployment
- [ ] Scripts SQL ejecutados en Supabase
- [ ] Usuario admin creado
- [ ] Variables de entorno configuradas en Vercel
- [ ] Raspberry Pi con IP estática (si usas impresora)
- [ ] Servidor de impresión corriendo en Raspberry Pi

### Durante deployment
- [ ] Build exitoso en Vercel
- [ ] Sin errores en logs
- [ ] Deployment completado

### Post-deployment
- [ ] Login funciona
- [ ] Dashboard carga correctamente
- [ ] Módulos accesibles según rol
- [ ] Impresora funciona (si aplica)
- [ ] RLS bloquea accesos no autorizados

---

## 🔍 Verificación Post-Deployment

### 1. Test de Autenticación
```
1. Ir a https://tu-app.vercel.app/auth
2. Login con usuario admin
3. Verificar redirección a dashboard
```

### 2. Test de Permisos
```
1. Login como operario
2. Verificar que solo ve sus páginas permitidas
3. Intentar acceder a /settings (debe denegar)
```

### 3. Test de Impresora (Opcional)
```
1. Ir a módulo de producción
2. Generar etiqueta QR
3. Click en "Imprimir"
4. Verificar impresión en Zebra
```

---

## 🚨 Troubleshooting

### Error: "Supabase client not configured"
- **Causa**: Variables de entorno no configuradas
- **Solución**: Verificar en Vercel → Settings → Environment Variables

### Error: "Failed to fetch" en impresora
- **Causa**: Raspberry Pi no accesible
- **Solución**: 
  1. Verificar que Raspberry Pi está en la misma red
  2. Verificar IP correcta en `VITE_PRINTER_SERVER_URL`
  3. Verificar servidor corriendo: `pm2 list`

### Error: "Row Level Security policy violation"
- **Causa**: RLS bloqueando acceso
- **Solución**: Verificar que usuario tiene rol correcto en `profiles`

### Build falla en Vercel
- **Causa**: Dependencias o TypeScript errors
- **Solución**: 
  1. Verificar `npm run build` localmente
  2. Revisar logs de Vercel
  3. Asegurar todas las dependencias en `package.json`

---

## 📊 Métricas de Performance

**Targets esperados**:
- ⚡ First Contentful Paint: < 1.5s
- ⚡ Time to Interactive: < 3.5s
- ⚡ Lighthouse Score: > 90

**Optimizaciones aplicadas**:
- ✅ Code splitting automático (Vite)
- ✅ Tree shaking
- ✅ Minificación
- ✅ Lazy loading de componentes

---

## 🔄 Actualizaciones Futuras

### Deployment automático
Cada push a `main` en GitHub desplegará automáticamente en Vercel.

### Rollback
```bash
# Desde Vercel Dashboard
Deployments → [Deployment anterior] → Promote to Production
```

---

## 📚 Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [DATABASE_SETUP_GUIDE.md](file:///C:/Users/Usuari/.gemini/antigravity/brain/794af314-9ceb-47f8-b99e-209329f9a810/DATABASE_SETUP_GUIDE.md)
- [SECURITY_MATRIX.md](file:///c:/Users/Usuari/Documents/GitHub/MainV2/v3/egea-Main-control/docs/SECURITY_MATRIX.md)

---

**Última actualización**: 12 de enero de 2026
