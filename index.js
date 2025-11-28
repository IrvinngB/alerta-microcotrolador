const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const KeepAlive = require('./utils/keepAlive');
const MemoryOptimizer = require('./utils/memoryOptimizer');
const MQTTClientHandler = require('./utils/mqttClient');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Variables globales
let qrCodeData = null;
let isClientReady = false;
let client = null;

// Inicializar optimizador de memoria
const memoryOptimizer = new MemoryOptimizer({
    maxMemoryMB: 450,
    checkIntervalMs: 60000,
    gcThresholdPercent: 75
});

// Inicializar keep-alive (solo en producción)
let keepAlive = null;
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    keepAlive = new KeepAlive(APP_URL, 10);
}

// Inicializar cliente MQTT
const mqttClient = new MQTTClientHandler({
    broker: process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org',
    topic: process.env.MQTT_TOPIC || 'canaleta/alerta',
    clientId: `nodejs-hydrowatch-${Math.random().toString(16).slice(2, 8)}`
});

let lastAlertTime = 0;

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
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
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
        qrCodeData = null;
        
        memoryOptimizer.optimizeWhatsAppClient(client);
    });

    // Evento: Desconexión
    client.on('disconnected', (reason) => {
        console.log('❌ Cliente desconectado:', reason);
        isClientReady = false;
        qrCodeData = null;
    });

    // Evento: Error de autenticación
    client.on('auth_failure', (msg) => {
        console.error('❌ Fallo de autenticación:', msg);
        isClientReady = false;
    });

    // Evento: Mensaje recibido (para comandos)
    client.on('message', async (msg) => {
        const config = readConfig();
        const msgBody = msg.body.toLowerCase().trim();
        
        if (msgBody === config.comando_desactivar.toLowerCase()) {
            config.alertas_activas = false;
            saveConfig(config);
            await msg.reply('❌ Alertas desactivadas. Envía "' + config.comando_activar + '" para reactivarlas.');
            console.log('🔕 Alertas desactivadas por comando de WhatsApp');
        } else if (msgBody === config.comando_activar.toLowerCase()) {
            config.alertas_activas = true;
            saveConfig(config);
            await msg.reply('✅ Alertas activadas. Recibirás notificaciones cuando el nivel sea crítico.');
            console.log('🔔 Alertas activadas por comando de WhatsApp');
        } else if (msgBody === 'estado' || msgBody === 'status') {
            const estado = config.alertas_activas ? '✅ Activas' : '❌ Desactivadas';
            const cooldown = config.cooldown_minutos || 5;
            await msg.reply(`📊 Estado del sistema:\n\nAlertas: ${estado}\nCooldown: ${cooldown} minutos\n\nComandos:\n- ${config.comando_activar}\n- ${config.comando_desactivar}\n- estado`);
        }
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

// Función helper para enviar mensajes con reintentos
const sendWhatsAppMessageSafe = async (numero, mensaje, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (!isClientReady || !client) {
                throw new Error('Cliente de WhatsApp no está listo');
            }
            
            const chatId = numero.includes('@c.us') ? numero : `${numero}@c.us`;
            await client.sendMessage(chatId, mensaje);
            console.log(`✅ Mensaje enviado a ${numero}`);
            return true;
        } catch (error) {
            console.error(`❌ Intento ${attempt}/${maxRetries} falló:`, error.message);
            
            if (error.message.includes('Execution context was destroyed')) {
                console.log('⚠️ Contexto destruido, esperando 2 segundos...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (attempt === maxRetries) {
                    console.error('❌ Todos los intentos fallaron. El mensaje no se envió.');
                    return false;
                }
            } else {
                throw error;
            }
        }
    }
    return false;
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

// Función para enviar mensaje (usa la versión segura con reintentos)
const sendWhatsAppMessage = async (numero, mensaje) => {
    if (!isClientReady) {
        throw new Error('Cliente de WhatsApp no está listo');
    }

    try {
        const chatId = formatPhoneNumber(numero);
        return await sendWhatsAppMessageSafe(chatId, mensaje);
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

// GET /health - Health check para keep-alive
app.get('/health', (req, res) => {
    const memoryUsage = memoryOptimizer.getMemoryUsage();
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        memory: memoryUsage,
        whatsapp: isClientReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// GET /stats - Estadísticas del sistema
app.get('/stats', (req, res) => {
    const memoryStats = memoryOptimizer.getStats();
    const keepAliveStatus = keepAlive ? keepAlive.getStatus() : null;
    const mqttStatus = mqttClient.getStatus();
    
    res.json({
        memory: memoryStats,
        keepAlive: keepAliveStatus,
        mqtt: mqttStatus,
        whatsapp: {
            connected: isClientReady,
            hasQR: !!qrCodeData
        },
        uptime: process.uptime()
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
    const { numero_destino, mensaje, cooldown_minutos, alertas_activas, comando_activar, comando_desactivar } = req.body;

    if (!numero_destino || !mensaje) {
        return res.status(400).json({
            success: false,
            error: 'Faltan parámetros: numero_destino y mensaje son requeridos'
        });
    }

    const config = { 
        numero_destino, 
        mensaje,
        cooldown_minutos: cooldown_minutos || 5,
        alertas_activas: alertas_activas !== false,
        comando_activar: comando_activar || 'activar alertas',
        comando_desactivar: comando_desactivar || 'desactivar alertas'
    };
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

// ==================== MQTT HANDLER ====================

mqttClient.onMessage(async (topic, message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n🔔 [${timestamp}] PROCESANDO MENSAJE MQTT`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Contenido: "${message}"`);
    
    if (message === 'true') {
        console.log(`🚨 ¡ALERTA TRUE RECIBIDA DEL ESP32!`);
        
        try {
            const config = readConfig();
            
            if (!config.alertas_activas) {
                console.log('🔕 Alertas desactivadas en configuración, ignorando');
                return;
            }
            
            const cooldownMs = (config.cooldown_minutos || 5) * 60 * 1000;
            const now = Date.now();
            
            if (now - lastAlertTime < cooldownMs) {
                const minutosRestantes = Math.ceil((cooldownMs - (now - lastAlertTime)) / 60000);
                console.log(`⏱️ Cooldown activo (${minutosRestantes} min restantes)`);
                return;
            }
            
            if (!config.numero_destino || !config.mensaje) {
                console.log('⚠️ Configuración incompleta:');
                console.log(`   Número: ${config.numero_destino || 'NO CONFIGURADO'}`);
                console.log(`   Mensaje: ${config.mensaje ? 'OK' : 'NO CONFIGURADO'}`);
                return;
            }
            
            if (!isClientReady) {
                console.log('⚠️ WhatsApp NO conectado - Alerta registrada pero no enviada');
                console.log(`   Número destino: ${config.numero_destino}`);
                console.log(`   Mensaje: ${config.mensaje.substring(0, 50)}...`);
                lastAlertTime = now;
                return;
            }
            
            lastAlertTime = now;
            await sendWhatsAppMessage(config.numero_destino, config.mensaje);
            console.log(`✅ Alerta enviada por WhatsApp (próxima en ${config.cooldown_minutos} min)`);
        } catch (error) {
            console.error('❌ Error procesando alerta:', error.message);
        }
    } else {
        console.log(`ℹ️ Mensaje ignorado (no es "true"): "${message}"`);
    }
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en ${APP_URL}`);
    console.log(`📱 Inicializando cliente de WhatsApp...`);
    
    initializeWhatsAppClient();
    
    memoryOptimizer.startMonitoring();
    console.log('📊 Monitoreo de memoria activado');
    
    mqttClient.connect();
    console.log('📡 Cliente MQTT iniciado');
    
    if (keepAlive) {
        setTimeout(() => {
            keepAlive.start();
            console.log('💚 Keep-alive activado');
        }, 30000);
    }
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido, cerrando servidor...');
    memoryOptimizer.stopMonitoring();
    if (keepAlive) keepAlive.stop();
    mqttClient.disconnect();
    if (client) client.destroy();
    process.exit(0);
});

// Manejadores de errores globales
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    if (reason && reason.message && reason.message.includes('Execution context was destroyed')) {
        console.log('⚠️ Error de contexto de Puppeteer detectado, continuando...');
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (error.message && error.message.includes('Execution context was destroyed')) {
        console.log('⚠️ Error de contexto de Puppeteer detectado, continuando...');
    } else {
        console.error('❌ Error crítico, reiniciando en 5 segundos...');
        setTimeout(() => process.exit(1), 5000);
    }
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recibido, cerrando servidor...');
    memoryOptimizer.stopMonitoring();
    if (keepAlive) keepAlive.stop();
    mqttClient.disconnect();
    if (client) client.destroy();
    process.exit(0);
});
