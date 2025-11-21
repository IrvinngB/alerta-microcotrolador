const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Variables globales
let qrCodeData = null;
let isClientReady = false;
let client = null;

// Inicializar cliente de WhatsApp
const initializeWhatsAppClient = () => {
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './sessions'
        }),
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // Evento: QR generado
    client.on('qr', async (qr) => {
        console.log('📱 QR Code generado');
        qrCodeData = qr;
        try {
            // Generar imagen QR en base64
            qrCodeData = await qrcode.toDataURL(qr);
        } catch (err) {
            console.error('Error generando QR:', err);
        }
    });

    // Evento: Cliente listo
    client.on('ready', () => {
        console.log('✅ Cliente de WhatsApp listo!');
        isClientReady = true;
        qrCodeData = null; // Limpiar QR cuando está conectado
    });

    // Evento: Autenticación exitosa
    client.on('authenticated', () => {
        console.log('🔐 Autenticación exitosa');
    });

    // Evento: Desconexión
    client.on('disconnected', (reason) => {
        console.log('❌ Cliente desconectado:', reason);
        isClientReady = false;
        qrCodeData = null;
    });

    // Evento: Error de autenticación
    client.on('auth_failure', (msg) => {
        console.error('❌ Error de autenticación:', msg);
        isClientReady = false;
    });

    // Inicializar cliente
    client.initialize();
};

// Función para leer configuración
const readConfig = () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo config.json:', error);
        return { numero_destino: '', mensaje: '' };
    }
};

// Función para guardar configuración
const saveConfig = (config) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error guardando config.json:', error);
        return false;
    }
};

// Función para formatear número de teléfono
const formatPhoneNumber = (number) => {
    // Remover caracteres no numéricos excepto el +
    let formatted = number.replace(/[^\d+]/g, '');

    // Si no tiene +, agregarlo
    if (!formatted.startsWith('+')) {
        formatted = '+' + formatted;
    }

    // Agregar @c.us para WhatsApp
    return formatted.substring(1) + '@c.us';
};

// Función para enviar mensaje
const sendWhatsAppMessage = async (numero, mensaje) => {
    if (!isClientReady) {
        throw new Error('Cliente de WhatsApp no está listo');
    }

    try {
        const chatId = formatPhoneNumber(numero);
        await client.sendMessage(chatId, mensaje);
        console.log(`✅ Mensaje enviado a ${numero}`);
        return true;
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        throw error;
    }
};

// ==================== ENDPOINTS ====================

// GET /qr - Obtener código QR
app.get('/qr', (req, res) => {
    if (isClientReady) {
        return res.json({
            success: true,
            connected: true,
            message: 'WhatsApp ya está conectado'
        });
    }

    if (qrCodeData) {
        return res.json({
            success: true,
            qr: qrCodeData,
            connected: false
        });
    }

    return res.json({
        success: false,
        message: 'QR no disponible aún. Espere unos segundos...',
        connected: false
    });
});

// GET /status - Estado de conexión
app.get('/status', (req, res) => {
    res.json({
        connected: isClientReady,
        status: isClientReady ? 'conectado' : 'desconectado'
    });
});

// POST /send - Enviar mensaje manual
app.post('/send', async (req, res) => {
    const { numero, mensaje } = req.body;

    if (!numero || !mensaje) {
        return res.status(400).json({
            success: false,
            error: 'Faltan parámetros: numero y mensaje son requeridos'
        });
    }

    try {
        await sendWhatsAppMessage(numero, mensaje);
        res.json({
            success: true,
            message: 'Mensaje enviado correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /event - Trigger desde microcontrolador
app.post('/event', async (req, res) => {
    const { trigger } = req.body;

    if (trigger !== true) {
        return res.status(400).json({
            success: false,
            error: 'El parámetro trigger debe ser true'
        });
    }

    try {
        // Leer configuración
        const config = readConfig();

        if (!config.numero_destino || !config.mensaje) {
            return res.status(400).json({
                success: false,
                error: 'Configuración incompleta. Configure número y mensaje primero.'
            });
        }

        // Enviar mensaje
        await sendWhatsAppMessage(config.numero_destino, config.mensaje);

        res.json({
            success: true,
            message: 'Alerta enviada correctamente',
            numero: config.numero_destino
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /config - Obtener configuración
app.get('/config', (req, res) => {
    const config = readConfig();
    res.json(config);
});

// POST /config - Actualizar configuración
app.post('/config', (req, res) => {
    const { numero_destino, mensaje } = req.body;

    if (!numero_destino || !mensaje) {
        return res.status(400).json({
            success: false,
            error: 'Faltan parámetros: numero_destino y mensaje son requeridos'
        });
    }

    const config = { numero_destino, mensaje };
    const saved = saveConfig(config);

    if (saved) {
        res.json({
            success: true,
            message: 'Configuración guardada correctamente',
            config
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error guardando configuración'
        });
    }
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📱 Inicializando cliente de WhatsApp...`);
    initializeWhatsAppClient();
});
