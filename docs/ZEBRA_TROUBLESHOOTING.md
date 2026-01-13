# 🖨️ Troubleshooting - Impresora Zebra

**Problema común**: Error al conectar con la impresora (192.168.1.236)

---

## ❌ Error: "El navegador ha bloqueado la conexión"

### Causa
El navegador bloquea **Mixed Content**: la aplicación corre en HTTPS pero intenta conectar a la impresora en HTTP.

### Solución 1: Desactivar HTTPS en Desarrollo (Recomendado)

**Ya está configurado en el proyecto**, pero verifica:

1. **Detener el servidor** (Ctrl+C)

2. **Verificar vite.config.ts**:
```typescript
server: {
  host: "0.0.0.0",
  port: 8083,
  // HTTPS deshabilitado
  // https: true,
},
plugins: [react()], // Sin basicSsl()
```

3. **Reiniciar servidor**:
```bash
npm run dev
```

4. **Acceder por HTTP**:
```
http://192.168.1.249:8083
```

### Solución 2: Usar IP del PC (No localhost)

Si accedes desde móvil, usa la **IP del PC** en lugar de localhost:
```
http://192.168.1.249:8083
```

---

## ❌ Error: "La conexión ha tardado demasiado (Timeout)"

### Causa
El dispositivo no está en la misma red WiFi que la impresora.

### Solución

1. **Verificar WiFi**:
   - PC/Móvil: Conectado a la misma red que la impresora
   - Impresora Zebra: IP 192.168.1.236

2. **Ping a la impresora** (desde PC):
```bash
ping 192.168.1.236
```

Debe responder. Si no:
- Verifica que la impresora esté encendida
- Verifica que esté en la misma red (192.168.1.x)

3. **Probar endpoint de impresora**:
```bash
curl -X POST http://192.168.1.236:500/pstprnt -d "^XA^FO50,50^A0N,50,50^FDTest^FS^XZ"
```

---

## ❌ Error: "IP es inalcanzable"

### Causa
La impresora no está en la red o tiene otra IP.

### Solución

1. **Encontrar IP de la impresora**:
   - Imprimir configuración de red desde la impresora
   - O escanear la red:
```bash
# En Windows
arp -a | findstr "192.168.1"

# En Linux/Mac
nmap -sn 192.168.1.0/24
```

2. **Actualizar IP en código**:

Editar `src/pages/ProductionPage.tsx`:
```typescript
const ZEBRA_PRINTER_IP = "192.168.1.XXX"; // Nueva IP
```

---

## ✅ Configuración Correcta

### Checklist

- [ ] Servidor corriendo en **HTTP** (no HTTPS)
- [ ] Accediendo por IP del PC (no localhost)
- [ ] PC/Móvil en la misma WiFi que impresora
- [ ] Impresora encendida y conectada a red
- [ ] IP correcta en código (192.168.1.236)

### Verificación

1. **Desde navegador**, ir a:
```
http://192.168.1.236:500
```

Deberías ver la interfaz web de la impresora Zebra.

2. **Desde la app**, click en "Imprimir Zebra"

Debe imprimir la etiqueta.

---

## 🔧 Configuración Avanzada

### Cambiar Puerto de la Impresora

Si la impresora usa otro puerto (ej: 9100):

Editar `src/utils/print.ts`:
```typescript
export const printZplToNetworkPrinter = async (zplParams: {
  ip: string;
  zpl: string;
  port?: number;
}) => {
  const { ip, zpl, port = 9100 } = zplParams; // Cambiar aquí
  // ...
}
```

### Usar Raspberry Pi como Proxy

Si necesitas HTTPS, configura Raspberry Pi:

1. **Instalar servidor Node.js** en Raspberry Pi
2. **Recibir requests HTTPS** en puerto 3001
3. **Reenviar a impresora** en HTTP puerto 500

Ver: `docs/CLOUDFLARE_TUNNEL_SETUP.md`

---

## 📱 Desde Móvil

### Android

1. Conectar a misma WiFi que impresora
2. Abrir Chrome
3. Ir a: `http://192.168.1.249:8083`
4. Permitir "Contenido inseguro" si pregunta

### iOS

1. Conectar a misma WiFi
2. Abrir Safari
3. Ir a: `http://192.168.1.249:8083`
4. Aceptar advertencia de seguridad si aparece

---

## 🚨 Errores Comunes

### "net::ERR_CONNECTION_REFUSED"
- Impresora apagada o IP incorrecta

### "net::ERR_NETWORK_CHANGED"
- Cambiaste de WiFi durante la conexión

### "Mixed Content blocked"
- Estás en HTTPS, necesitas HTTP

---

**Última actualización**: 13 de enero de 2026
