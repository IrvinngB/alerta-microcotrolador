# 🚀 Sistema de Optimización y Keep-Alive

## Módulos Implementados

### 1. **Keep-Alive** (`utils/keepAlive.js`)
Mantiene el servidor activo en Render.com evitando que entre en modo sleep.

**Características:**
- Ping automático cada 10 minutos al endpoint `/health`
- Detección de fallos consecutivos
- Logs detallados de cada ping
- Estado consultable vía API

**Configuración:**
```javascript
const keepAlive = new KeepAlive(APP_URL, 10); // 10 minutos
keepAlive.start();
```

### 2. **Memory Optimizer** (`utils/memoryOptimizer.js`)
Monitorea y optimiza el uso de memoria del servidor.

**Características:**
- Monitoreo continuo de memoria (heap, RSS, external)
- Garbage collection automático cuando se alcanza el 75% del límite
- Optimización del cliente de WhatsApp
- Estadísticas detalladas de uso

**Configuración:**
```javascript
const memoryOptimizer = new MemoryOptimizer({
    maxMemoryMB: 450,           // Límite de memoria
    checkIntervalMs: 60000,     // Revisar cada 60 segundos
    gcThresholdPercent: 75      // Ejecutar GC al 75%
});
```

## Nuevos Endpoints

### `/health` - Health Check
Endpoint para verificar el estado del servidor.

**Respuesta:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "memory": {
    "rss": 250,
    "heapTotal": 180,
    "heapUsed": 120,
    "external": 15,
    "arrayBuffers": 5
  },
  "whatsapp": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### `/stats` - Estadísticas del Sistema
Información detallada sobre memoria, keep-alive y WhatsApp.

**Respuesta:**
```json
{
  "memory": {
    "totalChecks": 60,
    "gcTriggered": 3,
    "maxMemoryUsed": 180,
    "currentUsage": { ... },
    "currentPercent": 40
  },
  "keepAlive": {
    "isRunning": true,
    "lastPing": "2024-01-01T12:00:00.000Z",
    "failCount": 0,
    "intervalMinutes": 10
  },
  "whatsapp": {
    "connected": true,
    "hasQR": false
  },
  "uptime": 3600
}
```

## Configuración en Render.com

### Variables de Entorno
```bash
NODE_ENV=production
RENDER_EXTERNAL_URL=https://tu-app.onrender.com
```

### Build Command
```bash
npm install
```

### Start Command
```bash
npm start
```

## Logs del Sistema

El sistema genera logs informativos:

```
🚀 Servidor corriendo en https://tu-app.onrender.com
📱 Inicializando cliente de WhatsApp...
📊 Monitoreo de memoria activado
🔍 Iniciando monitoreo de memoria cada 60s
📏 Límite configurado: 450MB | Umbral GC: 75%
📊 Memoria: 120MB/450MB (26%) | RSS: 250MB
💚 Keep-alive activado
🚀 Iniciando keep-alive cada 10 minutos
✅ Keep-alive ping exitoso (234ms) - 12:00:00
```

## Beneficios

### ✅ Evita errores 502/503
- El servidor no entra en modo sleep
- Respuesta inmediata a peticiones

### ✅ Optimiza memoria
- Previene crashes por falta de memoria
- Garbage collection proactivo
- Monitoreo continuo

### ✅ Mayor estabilidad
- Detección temprana de problemas
- Logs detallados para debugging
- Graceful shutdown en señales SIGTERM/SIGINT

## Monitoreo

### Ver estadísticas en tiempo real
```bash
curl https://tu-app.onrender.com/stats
```

### Ver health check
```bash
curl https://tu-app.onrender.com/health
```

## Troubleshooting

### El keep-alive no funciona
- Verifica que `NODE_ENV=production` esté configurado
- Verifica que `RENDER_EXTERNAL_URL` esté configurado correctamente
- Revisa los logs para ver si hay errores de conexión

### Uso alto de memoria
- El sistema ejecutará GC automáticamente al 75%
- Si persiste, considera aumentar `maxMemoryMB`
- Revisa `/stats` para ver estadísticas detalladas

### Errores 502/503 persisten
- Verifica que el keep-alive esté activo en los logs
- Aumenta la frecuencia de ping (reduce `intervalMinutes`)
- Verifica que el endpoint `/health` responda correctamente

## Notas Importantes

1. **Garbage Collection**: Se requiere el flag `--expose-gc` para habilitar GC manual
2. **Keep-Alive**: Solo se activa en producción (NODE_ENV=production)
3. **Memoria**: El límite de 450MB es seguro para el plan gratuito de Render (512MB)
4. **Delay**: El keep-alive espera 30 segundos después del inicio para activarse
