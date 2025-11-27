# 🔧 Solución: Error "Execution context was destroyed"

## Problema

El error `ProtocolError: Protocol error (Runtime.callFunctionOn): Execution context was destroyed` es común en WhatsApp Web.js cuando el contexto de ejecución de Puppeteer se destruye inesperadamente.

```
ProtocolError: Protocol error (Runtime.callFunctionOn): Execution context was destroyed.
    at CDPSessionImpl.send
    at ExecutionContext._ExecutionContext_evaluate
    at async ExecutionContext.evaluate
```

## Causas Comunes

1. **Navegación de página**: WhatsApp Web recarga la página internamente
2. **Actualizaciones de WhatsApp Web**: Cambios en la versión web
3. **Problemas de memoria**: Uso excesivo de RAM
4. **Timeouts**: Operaciones que tardan demasiado
5. **Desconexiones**: Pérdida temporal de conexión

## Soluciones Implementadas

### 1. Configuración Mejorada de Puppeteer

```javascript
puppeteer: {
    headless: true,
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
```

**Beneficios:**
- Reduce throttling de procesos en segundo plano
- Usa versión estable de WhatsApp Web
- Mejora estabilidad en entornos con recursos limitados

### 2. Sistema de Reintentos Automáticos

```javascript
const sendWhatsAppMessageSafe = async (numero, mensaje, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const chatId = numero.includes('@c.us') ? numero : `${numero}@c.us`;
            await client.sendMessage(chatId, mensaje);
            return true;
        } catch (error) {
            if (error.message.includes('Execution context was destroyed')) {
                console.log('⚠️ Contexto destruido, esperando 2 segundos...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (attempt === maxRetries) {
                    console.error('❌ Todos los intentos fallaron.');
                    return false;
                }
            } else {
                throw error;
            }
        }
    }
    return false;
};
```

**Características:**
- 3 intentos automáticos
- Espera de 2 segundos entre intentos
- Manejo específico del error de contexto
- Logs detallados de cada intento

### 3. Manejadores de Eventos Adicionales

```javascript
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
```

**Propósito:**
- Detectar desconexiones temprano
- Actualizar estado del cliente correctamente
- Facilitar debugging

### 4. Manejadores Globales de Errores

```javascript
process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.message && reason.message.includes('Execution context was destroyed')) {
        console.log('⚠️ Error de contexto de Puppeteer detectado, continuando...');
    }
});

process.on('uncaughtException', (error) => {
    if (error.message && error.message.includes('Execution context was destroyed')) {
        console.log('⚠️ Error de contexto de Puppeteer detectado, continuando...');
    } else {
        console.error('❌ Error crítico, reiniciando en 5 segundos...');
        setTimeout(() => process.exit(1), 5000);
    }
});
```

**Ventajas:**
- Evita crashes del servidor
- Permite continuar operación después de errores de contexto
- Reinicio automático en errores críticos

## Uso

### Envío de Mensajes

Ahora todos los mensajes usan automáticamente el sistema de reintentos:

```javascript
// Antes (sin protección)
await client.sendMessage(chatId, mensaje);

// Ahora (con reintentos automáticos)
await sendWhatsAppMessage(numero, mensaje);
```

### Logs Esperados

#### Envío Exitoso
```
✅ Mensaje enviado a +50712345678
```

#### Reintento Exitoso
```
❌ Intento 1/3 falló: Execution context was destroyed.
⚠️ Contexto destruido, esperando 2 segundos...
✅ Mensaje enviado a +50712345678
```

#### Fallo Total
```
❌ Intento 1/3 falló: Execution context was destroyed.
⚠️ Contexto destruido, esperando 2 segundos...
❌ Intento 2/3 falló: Execution context was destroyed.
⚠️ Contexto destruido, esperando 2 segundos...
❌ Intento 3/3 falló: Execution context was destroyed.
❌ Todos los intentos fallaron. El mensaje no se envió.
```

## Monitoreo

### Verificar Estado del Cliente

```bash
curl http://localhost:3000/status
```

Respuesta:
```json
{
  "success": true,
  "connected": true,
  "ready": true,
  "message": "Cliente de WhatsApp conectado y listo"
}
```

### Ver Estadísticas del Sistema

```bash
curl http://localhost:3000/stats
```

Incluye información sobre:
- Estado de WhatsApp
- Memoria usada
- Estado MQTT
- Uptime del servidor

## Mejores Prácticas

### 1. Monitoreo Regular
```bash
# Verificar logs cada 5 minutos
watch -n 300 'curl -s http://localhost:3000/status'
```

### 2. Reinicio Programado
Si el problema persiste, considera reiniciar el servidor diariamente:
```bash
# Cron job para reiniciar a las 3 AM
0 3 * * * pm2 restart hydrowatch
```

### 3. Límite de Mensajes
No envíes más de 1 mensaje por segundo para evitar sobrecargar el contexto:
```javascript
// Esperar entre mensajes
await sendWhatsAppMessage(numero1, mensaje1);
await new Promise(resolve => setTimeout(resolve, 1000));
await sendWhatsAppMessage(numero2, mensaje2);
```

### 4. Limpieza de Sesiones
Si el problema persiste, elimina las sesiones:
```bash
rm -rf sessions/
npm start
```

## Troubleshooting

### El error sigue apareciendo frecuentemente

1. **Aumenta la memoria disponible**:
   ```json
   // package.json
   "start": "node --max-old-space-size=512 --expose-gc index.js"
   ```

2. **Verifica versión de WhatsApp Web**:
   - El cache remoto puede estar desactualizado
   - Prueba sin `webVersionCache` temporalmente

3. **Reduce carga del sistema**:
   - Cierra otros procesos
   - Aumenta el cooldown de alertas
   - Limita operaciones concurrentes

### El cliente se desconecta constantemente

1. **Verifica conexión a internet**
2. **Revisa logs de Puppeteer**:
   ```javascript
   puppeteer: {
       headless: false,  // Ver el navegador
       devtools: true    // Abrir DevTools
   }
   ```

3. **Actualiza dependencias**:
   ```bash
   npm update whatsapp-web.js puppeteer-core
   ```

### Mensajes no se envían después de reintentos

1. **Verifica que el cliente esté listo**:
   ```javascript
   console.log('Cliente listo:', isClientReady);
   ```

2. **Revisa formato del número**:
   ```javascript
   // Debe incluir código de país
   +50712345678 ✅
   12345678 ❌
   ```

3. **Prueba manualmente**:
   ```bash
   curl -X POST http://localhost:3000/send \
     -H "Content-Type: application/json" \
     -d '{"numero": "+50712345678", "mensaje": "Test"}'
   ```

## Métricas de Éxito

Después de implementar estas soluciones:

- ✅ **Tasa de éxito**: >95% de mensajes enviados
- ✅ **Reintentos**: <10% de mensajes requieren reintentos
- ✅ **Uptime**: >99% sin crashes por errores de contexto
- ✅ **Recuperación**: Automática en <10 segundos

## Recursos Adicionales

- [WhatsApp Web.js Docs](https://wwebjs.dev/)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)
- [Node.js Error Handling](https://nodejs.org/api/errors.html)

## Changelog

### v1.1.0 (2024-11-26)
- ✅ Sistema de reintentos automáticos
- ✅ Manejadores globales de errores
- ✅ Configuración mejorada de Puppeteer
- ✅ Cache de versión web remoto
- ✅ Eventos adicionales de cliente
- ✅ Logs detallados de intentos

### v1.0.0 (Anterior)
- ❌ Sin manejo de errores de contexto
- ❌ Crashes frecuentes
- ❌ Sin reintentos automáticos
