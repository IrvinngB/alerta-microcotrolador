# 📡 Integración MQTT con ESP32

## Arquitectura del Sistema

```
ESP32 (Sensor) → MQTT Broker → Node.js Server → WhatsApp
```

## Configuración del ESP32

El ESP32 publica mensajes en el topic `canaleta/alerta`:
- `"true"` - Nivel de agua crítico (≥70%)
- `"false"` - Nivel normal

### Código ESP32 (`esp32.txt`)
```python
# Configuración
SSID = "TU_SSID"
PASSWORD = "TU_PASS"
BROKER = "test.mosquitto.org"
TOPIC = b"canaleta/alerta"

# Sensor ultrasónico
TRIG = Pin(5)
ECHO = Pin(18)

# Umbral de alerta
ALTURA = 10 cm
UMBRAL = 0.70  # 70%
```

## Configuración del Servidor Node.js

### Variables de Entorno

```bash
# MQTT Configuration
MQTT_BROKER=mqtt://test.mosquitto.org
MQTT_TOPIC=canaleta/alerta

# Servidor
PORT=3000
NODE_ENV=production
RENDER_EXTERNAL_URL=https://tu-app.onrender.com
```

### Cliente MQTT (`utils/mqttClient.js`)

**Características:**
- Conexión automática al broker
- Reconexión automática (hasta 10 intentos)
- Suscripción al topic configurado
- Logs detallados de mensajes
- Estado consultable vía API

## Flujo de Alertas

1. **ESP32 detecta nivel alto** (≥70%)
   ```python
   client.publish(TOPIC, b"true")
   ```

2. **Servidor Node.js recibe mensaje MQTT**
   ```javascript
   mqttClient.onMessage((topic, message) => {
     if (message === 'true') {
       // Enviar alerta por WhatsApp
     }
   });
   ```

3. **Sistema de cooldown** (configurable)
   - Evita spam de alertas
   - Tiempo configurable entre 1-60 minutos (recomendado: 5-10 min)
   - Muestra tiempo restante en logs

4. **Envío de WhatsApp**
   - Lee configuración (número y mensaje)
   - Verifica que WhatsApp esté conectado
   - Envía mensaje al número configurado

## Endpoints Relacionados

### `/stats` - Ver estado MQTT
```bash
curl https://tu-app.onrender.com/stats
```

**Respuesta:**
```json
{
  "mqtt": {
    "connected": true,
    "broker": "mqtt://test.mosquitto.org",
    "topic": "canaleta/alerta",
    "clientId": "nodejs-hydrowatch-abc123",
    "lastMessage": {
      "topic": "canaleta/alerta",
      "message": "true",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    "reconnectAttempts": 0
  }
}
```

## Logs del Sistema

### Conexión exitosa
```
🔌 Conectando a MQTT broker: mqtt://test.mosquitto.org
✅ Conectado a MQTT broker
📡 Suscrito al topic: canaleta/alerta
```

### Mensaje recibido
```
📨 Mensaje recibido [canaleta/alerta]: true
📡 Mensaje MQTT recibido: true
✅ Alerta enviada por MQTT
```

### Cooldown activo
```
📨 Mensaje recibido [canaleta/alerta]: true
⏱️ Alerta en cooldown, ignorando...
```

### Errores comunes
```
⚠️ Configuración incompleta
⚠️ WhatsApp no está conectado
❌ Error enviando alerta MQTT: [error]
```

## Configuración del ESP32

### 1. Instalar MicroPython
- Descargar firmware MicroPython para ESP32
- Flashear con `esptool.py`

### 2. Instalar librería MQTT
```python
import upip
upip.install('umqtt.simple')
```

### 3. Configurar WiFi y MQTT
```python
SSID = "TU_RED_WIFI"
PASSWORD = "TU_CONTRASEÑA"
BROKER = "test.mosquitto.org"
```

### 4. Conexiones del sensor ultrasónico
```
ESP32          HC-SR04
-----          -------
GPIO 5    →    TRIG
GPIO 18   →    ECHO
3.3V      →    VCC
GND       →    GND
```

## Pruebas

### Probar MQTT manualmente

**Publicar mensaje de prueba:**
```bash
mosquitto_pub -h test.mosquitto.org -t canaleta/alerta -m "true"
```

**Suscribirse al topic:**
```bash
mosquitto_sub -h test.mosquitto.org -t canaleta/alerta
```

### Probar desde el ESP32
```python
# Publicar alerta de prueba
client.publish(TOPIC, b"true")
```

## Troubleshooting

### ESP32 no se conecta al broker
- Verifica la conexión WiFi
- Verifica que el broker sea accesible
- Revisa los logs del ESP32

### Servidor no recibe mensajes
- Verifica que el topic sea el mismo en ESP32 y servidor
- Revisa `/stats` para ver el estado MQTT
- Verifica que el broker esté funcionando

### Alertas no se envían
- Verifica que WhatsApp esté conectado (`/status`)
- Verifica la configuración (`/config`)
- Revisa los logs del servidor

### Múltiples alertas (spam)
- El sistema tiene cooldown de 1 minuto
- Si persiste, aumenta `ALERT_COOLDOWN` en `index.js`

## Alternativas de Broker MQTT

### Broker público (actual)
```
mqtt://test.mosquitto.org
```

### Broker privado (recomendado para producción)
```bash
# Instalar Mosquitto
sudo apt install mosquitto mosquitto-clients

# Configurar
MQTT_BROKER=mqtt://tu-servidor.com:1883
```

### Broker en la nube
- **HiveMQ Cloud** (gratuito hasta 100 conexiones)
- **CloudMQTT** (planes gratuitos disponibles)
- **AWS IoT Core** (integración con AWS)

## Seguridad

### Recomendaciones
1. Usar broker privado con autenticación
2. Usar TLS/SSL para conexiones seguras
3. Configurar ACLs en el broker
4. Usar topics únicos por dispositivo

### Ejemplo con autenticación
```javascript
const mqttClient = new MQTTClientHandler({
    broker: 'mqtts://broker-seguro.com:8883',
    username: 'usuario',
    password: 'contraseña',
    topic: 'hydrowatch/dispositivo-001/alerta'
});
```

## Monitoreo

### Ver último mensaje recibido
```bash
curl https://tu-app.onrender.com/stats | jq '.mqtt.lastMessage'
```

### Ver estado de conexión
```bash
curl https://tu-app.onrender.com/stats | jq '.mqtt.connected'
```

## Notas Importantes

1. **Cooldown**: El sistema espera 1 minuto entre alertas para evitar spam
2. **Broker público**: `test.mosquitto.org` es para pruebas, considera uno privado para producción
3. **Reconexión**: El cliente MQTT se reconecta automáticamente si pierde conexión
4. **Logs**: Todos los mensajes MQTT se registran en los logs del servidor
