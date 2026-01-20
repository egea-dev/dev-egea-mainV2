# 🖨️ Servidor Proxy para Impresora Zebra

**Problema**: La app necesita HTTPS para usar la cámara, pero la impresora solo acepta HTTP.

**Solución**: Servidor Node.js en Raspberry Pi que actúa como proxy.

---

## 📋 Instalación en Raspberry Pi

### 1. Copiar archivos a Raspberry Pi

```bash
# Desde tu PC, copiar la carpeta raspberry-pi
scp -r raspberry-pi pi@192.168.1.XXX:/home/pi/
```

### 2. Instalar dependencias

```bash
# SSH a Raspberry Pi
ssh pi@192.168.1.XXX

# Ir a la carpeta
cd ~/raspberry-pi

# Instalar Node.js (si no está instalado)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar dependencias
npm install
```

### 3. Configurar IP de impresora

Editar `zebra-proxy-server.js`:
```javascript
const PRINTER_IP = '192.168.1.236'; // Tu IP
const PRINTER_PORT = 500;           // Tu puerto
```

### 3.1 (Opcional) Proteger con API key

```bash
# En la Raspberry Pi
export PRINTER_API_KEY=tu-clave-secreta
```

En el frontend, configura:

```env
VITE_PRINTER_API_KEY=tu-clave-secreta
```

### 4. Probar servidor

```bash
# Ejecutar
npm start

# Deberías ver:
# 🚀 Servidor proxy Zebra iniciado
# 📡 Escuchando en puerto 3001
# 🖨️  Impresora: 192.168.1.236:500
```

### 5. Probar desde navegador

```bash
# Health check
curl http://IP_RASPBERRY:3001/health

# Debería responder:
# {"status":"ok","printer":"192.168.1.236:500"}
```

### 6. Configurar auto-inicio con PM2

```bash
# Instalar PM2
sudo npm install -g pm2

# Iniciar servidor
npm run pm2

# Configurar auto-inicio
pm2 startup
pm2 save

# Verificar
pm2 list
```

---

## 🔧 Actualizar Frontend

### Reactivar HTTPS

Editar `vite.config.ts`:
```typescript
server: {
  host: "0.0.0.0",
  port: 8083,
  https: true, // ✅ Reactivar
},
plugins: [react(), basicSsl()], // ✅ Reactivar
```

### Actualizar URL de impresora

Editar `src/pages/ProductionPage.tsx`:
```typescript
// Cambiar de:
const ZEBRA_PRINTER_IP = "192.168.1.236";

// A usar variable de entorno:
const PRINTER_SERVER_URL = import.meta.env.VITE_PRINTER_SERVER_URL || "http://localhost:3001";
```

### Actualizar función de impresión

Editar `src/pages/ProductionPage.tsx`:
```typescript
const printZebraLabel = async () => {
  if (!scannedOrder) return;

  // ... código de generación de ZPL ...

  try {
    // Enviar al servidor proxy en lugar de directamente a impresora
    const response = await fetch(`${PRINTER_SERVER_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: zpl
    });

    if (!response.ok) throw new Error('Error al imprimir');
    
    toast.success('Enviado a impresora Zebra');
    await confirmProductionFinish();
  } catch (error) {
    console.error('Error Zebra:', error);
    toast.error('Error conexión impresora');
  }
};
```

### Configurar variable de entorno

`.env.local`:
```env
VITE_PRINTER_SERVER_URL=http://IP_RASPBERRY:3001
```

---

## ✅ Ventajas de esta Solución

- ✅ **HTTPS funciona**: Puedes usar la cámara
- ✅ **Impresora funciona**: El proxy maneja HTTP
- ✅ **Más robusto**: Mejor manejo de errores
- ✅ **Logs centralizados**: Ver qué se imprime
- ✅ **Fácil debug**: Logs en Raspberry Pi

---

## 🔍 Troubleshooting

### Error: "ECONNREFUSED"
- Verifica que el servidor esté corriendo: `pm2 list`
- Verifica firewall: `sudo ufw allow 3001`

### Error: "Timeout"
- Verifica IP de impresora en `zebra-proxy-server.js`
- Ping a impresora: `ping 192.168.1.236`

### Logs del servidor
```bash
# Ver logs en tiempo real
pm2 logs zebra-printer

# Ver últimos logs
pm2 logs zebra-printer --lines 50
```

---

**Última actualización**: 13 de enero de 2026
