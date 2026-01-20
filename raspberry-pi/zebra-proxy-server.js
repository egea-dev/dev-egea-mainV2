// Servidor Proxy para Impresora Zebra
// Recibe requests HTTPS y reenvía a impresora en HTTP

const express = require('express');
const cors = require('cors');
const net = require('net');

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
    res.json({ status: 'ok', printer: `${PRINTER_IP}:${PRINTER_PORT}` });
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

        // Timeout de 5 segundos
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor proxy Zebra iniciado');
    console.log(`📡 Escuchando en puerto ${PORT}`);
    console.log(`🖨️  Impresora: ${PRINTER_IP}:${PRINTER_PORT}`);
    console.log(`🌐 Accesible desde: http://IP_RASPBERRY:${PORT}`);
});
