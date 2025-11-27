class MemoryOptimizer {
    constructor(options = {}) {
        this.maxMemoryMB = options.maxMemoryMB || 450;
        this.checkIntervalMs = options.checkIntervalMs || 30000;
        this.gcThresholdPercent = options.gcThresholdPercent || 80;
        this.timer = null;
        this.isMonitoring = false;
        this.stats = {
            totalChecks: 0,
            gcTriggered: 0,
            maxMemoryUsed: 0,
            lastCheck: null
        };
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
            arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
        };
    }

    getMemoryPercent() {
        const usage = this.getMemoryUsage();
        return Math.round((usage.heapUsed / this.maxMemoryMB) * 100);
    }

    forceGarbageCollection() {
        if (global.gc) {
            console.log('🧹 Ejecutando garbage collection manual...');
            global.gc();
            return true;
        } else {
            console.warn('⚠️ Garbage collection no disponible. Ejecuta Node con --expose-gc');
            return false;
        }
    }

    checkMemory() {
        this.stats.totalChecks++;
        this.stats.lastCheck = new Date();

        const usage = this.getMemoryUsage();
        const percent = this.getMemoryPercent();

        if (usage.heapUsed > this.stats.maxMemoryUsed) {
            this.stats.maxMemoryUsed = usage.heapUsed;
        }

        console.log(`📊 Memoria: ${usage.heapUsed}MB/${this.maxMemoryMB}MB (${percent}%) | RSS: ${usage.rss}MB`);

        if (percent >= this.gcThresholdPercent) {
            console.warn(`⚠️ Uso de memoria alto (${percent}%). Intentando liberar memoria...`);
            
            if (this.forceGarbageCollection()) {
                this.stats.gcTriggered++;
                const newUsage = this.getMemoryUsage();
                const freed = usage.heapUsed - newUsage.heapUsed;
                console.log(`✅ Memoria liberada: ${freed}MB (${newUsage.heapUsed}MB restantes)`);
            }
        }

        if (percent >= 95) {
            console.error('🚨 ALERTA: Memoria crítica! Considera reiniciar el servidor.');
        }

        return { usage, percent };
    }

    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Monitoreo de memoria ya está activo');
            return;
        }

        console.log(`🔍 Iniciando monitoreo de memoria cada ${this.checkIntervalMs / 1000}s`);
        console.log(`📏 Límite configurado: ${this.maxMemoryMB}MB | Umbral GC: ${this.gcThresholdPercent}%`);
        
        this.isMonitoring = true;
        this.checkMemory();

        this.timer = setInterval(() => {
            this.checkMemory();
        }, this.checkIntervalMs);
    }

    stopMonitoring() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this.isMonitoring = false;
            console.log('🛑 Monitoreo de memoria detenido');
        }
    }

    getStats() {
        return {
            ...this.stats,
            currentUsage: this.getMemoryUsage(),
            currentPercent: this.getMemoryPercent(),
            isMonitoring: this.isMonitoring
        };
    }

    optimizeWhatsAppClient(client) {
        if (!client) return;

        console.log('🔧 Optimizando cliente de WhatsApp...');
        
        try {
            if (client.pupBrowser) {
                const pages = client.pupBrowser.pages();
                if (pages && pages.length > 0) {
                    pages.forEach(page => {
                        page.setDefaultNavigationTimeout(30000);
                        page.setDefaultTimeout(30000);
                    });
                }
            }
        } catch (error) {
            console.error('Error optimizando cliente:', error.message);
        }
    }

    clearCache() {
        console.log('🗑️ Limpiando caché...');
        
        if (require.cache) {
            const cacheKeys = Object.keys(require.cache);
            const before = cacheKeys.length;
            
            cacheKeys.forEach(key => {
                if (!key.includes('node_modules')) {
                    delete require.cache[key];
                }
            });
            
            const after = Object.keys(require.cache).length;
            console.log(`✅ Caché limpiado: ${before - after} módulos removidos`);
        }
    }
}

module.exports = MemoryOptimizer;
