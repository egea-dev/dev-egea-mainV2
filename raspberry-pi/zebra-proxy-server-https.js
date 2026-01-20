// Servidor Proxy HTTPS para Impresora Zebra
const express = require('express');
const https = require('https');
const cors = require('cors');
const net = require('net');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Configuración de la impresora
const PRINTER_IP = '192.168.1.236';
const PRINTER_PORT = 500;

// Middleware
app.use(cors());
app.use(express.text({ type: '*/*', limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', printer: `${PRINTER_IP}:${PRINTER_PORT}`, secure: true });
});

// Endpoint para imprimir ZPL
app.post('/print', async (req, res) => {
    const zpl = req.body;

    if (!zpl || typeof zpl !== 'string') {
        return res.status(400).json({ error: 'ZPL content required' });
    }

    console.log(`📄 Recibido ZPL (${zpl.length} bytes)`);
    console.log(`🖨️  Enviando a impresora ${PRINTER_IP}:${PRINTER_PORT}`);

    try {
        await sendToZebra(zpl);
        console.log('✅ Enviado exitosamente');
        res.json({ success: true, message: 'Enviado a impresora Zebra' });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Función para enviar ZPL a impresora vía socket TCP
function sendToZebra(zpl) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let timeout;

        timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('Timeout: La impresora no respondió'));
        }, 5000);

        client.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log('🔌 Conectado a impresora');
            client.write(zpl);
        });

        client.on('data', (data) => {
            console.log('📥 Respuesta de impresora:', data.toString());
            clearTimeout(timeout);
            client.destroy();
            resolve();
        });

        client.on('close', () => {
            clearTimeout(timeout);
            resolve();
        });

        client.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error(`Error de conexión: ${err.message}`));
        });
    });
}

// Leer certificados SSL (auto-firmados para desarrollo)
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

let server;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    // Usar HTTPS si existen los certificados
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    server = https.createServer(options, app);
    console.log('🔒 Servidor HTTPS configurado');
} else {
    // Fallback a HTTP si no hay certificados
    const http = require('http');
    server = http.createServer(app);
    console.log('⚠️  Certificados no encontrados, usando HTTP');
    console.log('💡 Genera certificados con: npm run generate-cert');
}

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor proxy Zebra iniciado');
    console.log(`📡 Escuchando en puerto ${PORT}`);
    console.log(`🖨️  Impresora: ${PRINTER_IP}:${PRINTER_PORT}`);
    const protocol = fs.existsSync(certPath) ? 'https' : 'http';
    console.log(`🌐 Accesible desde: ${protocol}://192.168.1.236:${PORT}`);
});
