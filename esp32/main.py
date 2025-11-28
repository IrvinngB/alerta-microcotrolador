from umqtt.simple import MQTTClient
from machine import Pin, ADC
import time
import network

# ============= WIFI =============
SSID = "Starlink Web"
PASSWORD = "wrpnaTDD0426"

# ============= MQTT =============
BROKER = "test.mosquitto.org"
PORT = 1883
CLIENT_ID = "esp32-alerta"
TOPIC = b"alerta/sensor"

# ============= SENSOR =============
sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)
    while not wlan.isconnected():
        print("Conectando WiFi...")
        time.sleep(1)
    print("WiFi OK:", wlan.ifconfig())

def send_alert():
    client = MQTTClient(CLIENT_ID, BROKER, PORT)
    client.connect()
    print("MQTT conectado")
    client.publish(TOPIC, b"true")
    print("Alerta enviada: true")
    client.disconnect()

# ============= LOOP =============
connect_wifi()

while True:
    valor = sensor.read()
    print("Valor sensor:", valor)

    # Umbral de alerta (AJÚSTALO)
    if valor > 2000:
        send_alert()

    time.sleep(1)
