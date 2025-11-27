const axios = require('axios');

class KeepAlive {
    constructor(url, intervalMinutes = 10) {
        this.url = url;
        this.interval = intervalMinutes * 60 * 1000;
        this.timer = null;
        this.isRunning = false;
        this.lastPing = null;
        this.failCount = 0;
        this.maxFails = 3;
    }

    async ping() {
        try {
            const startTime = Date.now();
            const response = await axios.get(`${this.url}/health`, {
                timeout: 10000,
                headers: { 'User-Agent': 'KeepAlive-Bot' }
            });
            
            const responseTime = Date.now() - startTime;
            this.lastPing = new Date();
            this.failCount = 0;
            
            console.log(`✅ Keep-alive ping exitoso (${responseTime}ms) - ${this.lastPing.toLocaleTimeString()}`);
            return true;
        } catch (error) {
            this.failCount++;
            console.error(`❌ Keep-alive ping falló (${this.failCount}/${this.maxFails}):`, error.message);
            
            if (this.failCount >= this.maxFails) {
                console.warn('⚠️ Múltiples fallos detectados. El servidor puede estar caído.');
            }
            return false;
        }
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Keep-alive ya está corriendo');
            return;
        }

        console.log(`🚀 Iniciando keep-alive cada ${this.interval / 60000} minutos`);
        this.isRunning = true;
        
        this.ping();
        
        this.timer = setInterval(() => {
            this.ping();
        }, this.interval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this.isRunning = false;
            console.log('🛑 Keep-alive detenido');
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastPing: this.lastPing,
            failCount: this.failCount,
            intervalMinutes: this.interval / 60000
        };
    }
}

module.exports = KeepAlive;
