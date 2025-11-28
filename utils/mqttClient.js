const mqtt = require('mqtt');

class MQTTClientHandler {
    constructor(options = {}) {
        this.broker = options.broker || 'mqtt://test.mosquitto.org';
        this.topic = options.topic || 'alerta/sensor';
        this.clientId = options.clientId || `nodejs-${Math.random().toString(16).slice(2, 8)}`;
        this.client = null;
        this.isConnected = false;
        this.lastMessage = null;
        this.messageCallback = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    connect() {
        console.log(`🔌 Conectando a MQTT broker: ${this.broker}`);
        
        this.client = mqtt.connect(this.broker, {
            clientId: this.clientId,
            clean: true,
            connectTimeout: 30000,
            reconnectPeriod: 5000,
            keepalive: 60
        });

        this.client.on('connect', () => {
            console.log('✅ Conectado a MQTT broker');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            const topics = [this.topic, 'canaleta/alerta', 'alerta/#'];
            
            topics.forEach(t => {
                this.client.subscribe(t, (err) => {
                    if (err) {
                        console.error(`❌ Error suscribiéndose a ${t}:`, err);
                    } else {
                        console.log(`📡 Suscrito al topic: ${t}`);
                    }
                });
            });
            
            console.log('👂 Esperando mensajes MQTT...');
        });

        this.client.on('message', (topic, message) => {
            const msg = message.toString().trim().toLowerCase();
            const timestamp = new Date().toLocaleTimeString();
            
            this.lastMessage = {
                topic,
                message: msg,
                timestamp: new Date()
            };
            
            console.log(`\n${'='.repeat(50)}`);
            console.log(`📨 [${timestamp}] MENSAJE MQTT RECIBIDO`);
            console.log(`   Topic: ${topic}`);
            console.log(`   Mensaje: "${msg}"`);
            console.log(`   Longitud: ${msg.length} caracteres`);
            
            if (msg === 'true') {
                console.log(`🚨 ¡ALERTA DETECTADA! Valor: true`);
            } else {
                console.log(`ℹ️  Mensaje recibido (no es alerta): "${msg}"`);
            }
            console.log(`${'='.repeat(50)}\n`);
            
            if (this.messageCallback) {
                this.messageCallback(topic, msg);
            }
        });

        this.client.on('error', (error) => {
            console.error('❌ Error MQTT:', error.message);
        });

        this.client.on('reconnect', () => {
            this.reconnectAttempts++;
            console.log(`🔄 Reintentando conexión MQTT (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ Máximo de reintentos alcanzado. Deteniendo reconexión.');
                this.client.end();
            }
        });

        this.client.on('close', () => {
            console.log('🔌 Conexión MQTT cerrada');
            this.isConnected = false;
        });

        this.client.on('offline', () => {
            console.log('📴 Cliente MQTT offline');
            this.isConnected = false;
        });
    }

    onMessage(callback) {
        this.messageCallback = callback;
    }

    publish(topic, message) {
        if (!this.isConnected) {
            console.error('❌ No se puede publicar: cliente MQTT no conectado');
            return false;
        }

        this.client.publish(topic, message, (err) => {
            if (err) {
                console.error('❌ Error publicando mensaje:', err);
            } else {
                console.log(`📤 Mensaje publicado [${topic}]: ${message}`);
            }
        });
        return true;
    }

    disconnect() {
        if (this.client) {
            console.log('🛑 Desconectando cliente MQTT...');
            this.client.end();
            this.isConnected = false;
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            broker: this.broker,
            topic: this.topic,
            clientId: this.clientId,
            lastMessage: this.lastMessage,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

module.exports = MQTTClientHandler;
