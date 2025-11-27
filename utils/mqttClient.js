const mqtt = require('mqtt');

class MQTTClientHandler {
    constructor(options = {}) {
        this.broker = options.broker || 'mqtt://test.mosquitto.org';
        this.topic = options.topic || 'canaleta/alerta';
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
            
            this.client.subscribe(this.topic, (err) => {
                if (err) {
                    console.error('❌ Error suscribiéndose al topic:', err);
                } else {
                    console.log(`📡 Suscrito al topic: ${this.topic}`);
                }
            });
        });

        this.client.on('message', (topic, message) => {
            const msg = message.toString();
            this.lastMessage = {
                topic,
                message: msg,
                timestamp: new Date()
            };
            
            console.log(`📨 Mensaje recibido [${topic}]: ${msg}`);
            
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
