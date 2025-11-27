# 💬 Sistema de Comandos por WhatsApp

## Descripción

El sistema permite controlar las alertas directamente desde WhatsApp mediante comandos de texto. Esto te da control total sobre cuándo recibir notificaciones sin necesidad de acceder a la configuración web.

## Comandos Disponibles

### 1. **Desactivar Alertas**
```
desactivar alertas
```
- Desactiva todas las notificaciones del sistema
- Útil cuando estás limpiando la canaleta o durante mantenimiento
- El sistema seguirá monitoreando pero no enviará mensajes
- Respuesta: `❌ Alertas desactivadas. Envía "activar alertas" para reactivarlas.`

### 2. **Activar Alertas**
```
activar alertas
```
- Reactiva las notificaciones del sistema
- Vuelves a recibir alertas cuando el nivel sea crítico
- Respuesta: `✅ Alertas activadas. Recibirás notificaciones cuando el nivel sea crítico.`

### 3. **Ver Estado**
```
estado
```
o
```
status
```
- Muestra el estado actual del sistema
- Información incluida:
  - Estado de alertas (Activas/Desactivadas)
  - Tiempo de cooldown configurado
  - Lista de comandos disponibles
- Respuesta ejemplo:
```
📊 Estado del sistema:

Alertas: ✅ Activas
Cooldown: 5 minutos

Comandos:
- activar alertas
- desactivar alertas
- estado
```

## Casos de Uso

### Escenario 1: Limpieza de Canaletas
```
Usuario: "desactivar alertas"
Bot: ❌ Alertas desactivadas...

[Usuario limpia la canaleta durante 30 minutos]

Usuario: "activar alertas"
Bot: ✅ Alertas activadas...
```

### Escenario 2: Temporada Seca
Durante meses sin lluvia, puedes desactivar las alertas para evitar notificaciones innecesarias:
```
Usuario: "desactivar alertas"
[Sistema desactivado durante 3 meses]
Usuario: "activar alertas"  // Al inicio de temporada lluviosa
```

### Escenario 3: Verificar Estado
```
Usuario: "estado"
Bot: 📊 Estado del sistema:
     Alertas: ✅ Activas
     Cooldown: 5 minutos
     ...
```

## Configuración

### Cambiar Comandos Personalizados

Puedes personalizar los comandos editando `config.json`:

```json
{
  "comando_activar": "encender",
  "comando_desactivar": "apagar"
}
```

Luego podrías usar:
```
encender
apagar
```

### Configuración desde la Web

También puedes activar/desactivar alertas desde la interfaz web en la sección de **Configuración**:
- Toggle switch para activar/desactivar
- Configurar tiempo de cooldown
- Ver comandos disponibles

## Logs del Sistema

### Cuando desactivas alertas
```
🔕 Alertas desactivadas por comando de WhatsApp
🔕 Alertas desactivadas, ignorando mensaje MQTT
```

### Cuando activas alertas
```
🔔 Alertas activadas por comando de WhatsApp
✅ Alerta enviada por MQTT (próxima en 5 min)
```

## Características Adicionales

### Cooldown Configurable
- **Rango**: 1-60 minutos
- **Recomendado**: 5-10 minutos
- **Propósito**: Evitar spam de alertas repetidas
- **Configurable desde**: Interfaz web o `config.json`

### Persistencia
- El estado de alertas se guarda en `config.json`
- Se mantiene después de reiniciar el servidor
- Sincronizado entre web y WhatsApp

### Seguridad
- Solo el número configurado puede enviar comandos
- Los comandos son case-insensitive (`ESTADO` = `estado`)
- Respuestas inmediatas para confirmar acción

## Ejemplos de Integración

### Automatización con Otros Servicios

Puedes integrar los comandos con otros sistemas:

```javascript
// Desactivar alertas automáticamente durante mantenimiento programado
const desactivarAlertas = async () => {
    await fetch('https://tu-servidor.com/config', {
        method: 'POST',
        body: JSON.stringify({
            ...config,
            alertas_activas: false
        })
    });
};
```

### Notificaciones Programadas

```javascript
// Recordatorio para reactivar alertas
setTimeout(() => {
    enviarMensaje("+507XXXXXXXX", "Recuerda activar las alertas con: activar alertas");
}, 24 * 60 * 60 * 1000); // 24 horas
```

## Troubleshooting

### Los comandos no funcionan
1. Verifica que WhatsApp esté conectado (`/status`)
2. Confirma que estás usando el número configurado
3. Revisa que los comandos estén escritos correctamente
4. Verifica los logs del servidor

### Las alertas siguen llegando después de desactivar
1. Espera unos segundos para que se sincronice
2. Verifica el estado con el comando `estado`
3. Revisa `config.json` para confirmar `alertas_activas: false`

### No recibo respuesta del bot
1. Verifica conexión de WhatsApp
2. Revisa los logs del servidor
3. Confirma que el cliente de WhatsApp esté listo

## Mejores Prácticas

1. **Desactiva durante mantenimiento**: Evita falsas alarmas
2. **Usa el comando "estado"**: Verifica configuración regularmente
3. **Configura cooldown apropiado**: 5-10 minutos es ideal para la mayoría de casos
4. **Reactiva después de limpiar**: No olvides reactivar las alertas
5. **Guarda los comandos**: Anótalos para acceso rápido

## Roadmap Futuro

Posibles mejoras:
- [ ] Comando para cambiar cooldown desde WhatsApp
- [ ] Comando para ver historial de alertas
- [ ] Comando para probar el sistema
- [ ] Notificaciones programadas
- [ ] Múltiples números autorizados
- [ ] Comandos con parámetros (ej: `cooldown 10`)

## Soporte

Si tienes problemas con los comandos:
1. Revisa esta documentación
2. Consulta los logs del servidor
3. Verifica `/stats` para estado del sistema
4. Revisa `config.json` para configuración actual
