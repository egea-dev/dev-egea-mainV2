# 🌐 Configuración de Cloudflare Tunnel para Impresora Zebra

**Objetivo**: Hacer accesible la impresora Zebra desde internet de forma segura y gratuita

**Tiempo estimado**: 15-20 minutos

---

## 📋 Pre-requisitos

- ✅ Raspberry Pi con servidor de impresión funcionando (puerto 3001)
- ✅ Cuenta de Cloudflare (gratis en cloudflare.com)
- ✅ Dominio propio (o usar uno gratuito de Cloudflare)
- ✅ Acceso SSH a Raspberry Pi

---

## 🚀 Paso 1: Crear Cuenta en Cloudflare

1. Ve a [cloudflare.com](https://cloudflare.com)
2. Click en "Sign Up" (si no tienes cuenta)
3. Verifica tu email

---

## 🌍 Paso 2: Agregar Dominio (Opcional)

### Opción A: Usar tu dominio existente
1. En Cloudflare Dashboard → "Add a Site"
2. Introduce tu dominio (ej: `tuempresa.com`)
3. Selecciona plan "Free"
4. Cambia los nameservers en tu registrador de dominios

### Opción B: Usar dominio gratuito de Cloudflare
1. Cloudflare te asignará un subdominio automáticamente
2. Formato: `tu-tunel.trycloudflare.com`

---

## 💻 Paso 3: Instalar Cloudflared en Raspberry Pi

### 3.1 Conectar por SSH
```bash
ssh pi@IP_DE_TU_RASPBERRY
```

### 3.2 Descargar cloudflared
```bash
# Para Raspberry Pi 4 (ARM64)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb

# Para Raspberry Pi 3 o anterior (ARM)
# wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
```

### 3.3 Instalar
```bash
sudo dpkg -i cloudflared-linux-arm64.deb

# Verificar instalación
cloudflared --version
```

---

## 🔐 Paso 4: Autenticar con Cloudflare

### 4.1 Ejecutar comando de login
```bash
cloudflared tunnel login
```

### 4.2 Autorizar en navegador
1. Se abrirá automáticamente una URL en tu navegador
2. Si no se abre, copia la URL que aparece en terminal
3. Selecciona tu dominio
4. Click en "Authorize"

### 4.3 Verificar credenciales
```bash
# Debe existir este archivo
ls -la ~/.cloudflared/cert.pem
```

---

## 🛠️ Paso 5: Crear el Túnel

### 5.1 Crear túnel
```bash
cloudflared tunnel create zebra-printer
```

**Output esperado**:
```
Tunnel credentials written to /home/pi/.cloudflared/<TUNNEL-ID>.json
Created tunnel zebra-printer with id <TUNNEL-ID>
```

### 5.2 Guardar el Tunnel ID
```bash
# Listar túneles
cloudflared tunnel list

# Copiar el ID que aparece
```

---

## ⚙️ Paso 6: Configurar el Túnel

### 6.1 Crear archivo de configuración
```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

### 6.2 Contenido del archivo
```yaml
tunnel: <TU-TUNNEL-ID>
credentials-file: /home/pi/.cloudflared/<TU-TUNNEL-ID>.json

ingress:
  # Ruta para la impresora
  - hostname: printer.tudominio.com
    service: http://localhost:3001
  
  # Ruta por defecto (obligatoria)
  - service: http_status:404
```

**Reemplaza**:
- `<TU-TUNNEL-ID>` con el ID del paso 5.1
- `printer.tudominio.com` con tu subdominio deseado

### 6.3 Guardar archivo
```
Ctrl + O (guardar)
Enter
Ctrl + X (salir)
```

---

## 🌐 Paso 7: Configurar DNS en Cloudflare

### 7.1 Crear registro DNS
```bash
cloudflared tunnel route dns zebra-printer printer.tudominio.com
```

**Output esperado**:
```
Created CNAME record for printer.tudominio.com
```

### 7.2 Verificar en Cloudflare Dashboard
1. Ve a tu dominio en Cloudflare
2. Click en "DNS"
3. Deberías ver un registro CNAME: `printer` → `<TUNNEL-ID>.cfargotunnel.com`

---

## 🚀 Paso 8: Ejecutar el Túnel

### 8.1 Test manual
```bash
cloudflared tunnel run zebra-printer
```

**Output esperado**:
```
INF Connection registered connIndex=0
INF Connection registered connIndex=1
```

### 8.2 Probar desde navegador
```
https://printer.tudominio.com/health
```

Deberías ver: `{"status":"ok"}`

---

## 🔄 Paso 9: Configurar como Servicio (Auto-inicio)

### 9.1 Instalar como servicio
```bash
sudo cloudflared service install
```

### 9.2 Habilitar auto-inicio
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 9.3 Verificar estado
```bash
sudo systemctl status cloudflared
```

**Output esperado**:
```
● cloudflared.service - cloudflared
   Loaded: loaded
   Active: active (running)
```

---

## 🌍 Paso 10: Actualizar Frontend (Vercel)

### 10.1 Ir a Vercel Dashboard
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables

### 10.2 Actualizar variable
```
VITE_PRINTER_SERVER_URL=https://printer.tudominio.com
```

### 10.3 Redeploy
1. Deployments → Latest deployment
2. Click en "..." → Redeploy

---

## ✅ Verificación Final

### Test 1: Desde terminal
```bash
curl https://printer.tudominio.com/health
```

### Test 2: Desde tu app web
1. Ir a módulo de producción
2. Generar etiqueta QR
3. Click en "Imprimir"
4. Verificar impresión en Zebra

---

## 🔧 Comandos Útiles

### Ver logs del túnel
```bash
sudo journalctl -u cloudflared -f
```

### Reiniciar servicio
```bash
sudo systemctl restart cloudflared
```

### Detener servicio
```bash
sudo systemctl stop cloudflared
```

### Listar túneles
```bash
cloudflared tunnel list
```

### Eliminar túnel
```bash
cloudflared tunnel delete zebra-printer
```

---

## 🚨 Troubleshooting

### Error: "tunnel credentials file not found"
**Solución**: Verifica la ruta en `config.yml`
```bash
ls -la ~/.cloudflared/*.json
```

### Error: "DNS record already exists"
**Solución**: Elimina el registro CNAME duplicado en Cloudflare Dashboard

### Error: "connection refused"
**Solución**: Verifica que el servidor de impresión esté corriendo
```bash
pm2 list
# Debe mostrar: zebra-print-server (online)
```

### Túnel no inicia automáticamente
**Solución**: Verificar servicio
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 🔒 Seguridad

### Recomendaciones:
1. ✅ **Usar HTTPS** (Cloudflare lo hace automáticamente)
2. ✅ **Limitar acceso** con Cloudflare Access (opcional)
3. ✅ **Monitorear logs** regularmente
4. ✅ **Actualizar cloudflared** periódicamente

### Configurar Cloudflare Access (Opcional)
Para restringir quién puede acceder:
1. Cloudflare Dashboard → Zero Trust
2. Access → Applications → Add an application
3. Configurar reglas de acceso (email, IP, etc.)

---

## 📊 Ventajas de Cloudflare Tunnel

✅ **Gratis** para uso ilimitado  
✅ **Seguro** (HTTPS automático, sin exponer puertos)  
✅ **Rápido** (CDN global de Cloudflare)  
✅ **Confiable** (99.99% uptime)  
✅ **Fácil de mantener** (auto-actualización)  

---

## 📚 Recursos

- [Documentación oficial](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Troubleshooting](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/troubleshooting/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

**Última actualización**: 12 de enero de 2026

**¿Necesitas ayuda?** Revisa la sección de Troubleshooting o contacta soporte.
