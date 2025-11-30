from umqtt.simple import MQTTClient
from machine import Pin, ADC, time_pulse_us
import time, network, ujson

SSID = "Starlink Web"
PASSWORD = "wrpnaTDD0426"

BROKER = "test.mosquitto.org"
PORT = 1883
CLIENT_ID = "esp32-canaleta"
TOPIC = b"alerta/canaleta"

sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)

TRIG = Pin(5, Pin.OUT)
ECHO = Pin(18, Pin.IN)

def medir_distancia():
    TRIG.off()
    time.sleep_us(2)
    TRIG.on()
    time.sleep_us(10)
    TRIG.off()
    d = time_pulse_us(ECHO, 1, 30000)
    if d <= 0:
        return -1
    return (d / 2) / 29.1

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)
    while not wlan.isconnected():
        print("Conectando WiFi...")
        time.sleep(1)
    print("WiFi OK:", wlan.ifconfig())

def send_payload(status, humedad, distancia):
    client = MQTTClient(CLIENT_ID, BROKER, PORT)
    client.connect()
    payload = {
        "status": status,
        "humedad": humedad,
        "distancia": distancia,
        "timestamp": time.time(),
        "device": "canaleta_esp32"
    }
    data = ujson.dumps(payload)
    print("SENDING:", data)
    client.publish(TOPIC, data)
    print("MQTT OK\n")
    client.disconnect()

connect_wifi()

while True:
    h = sensor.read()
    d = medir_distancia()

    print("HUM:", h, "| DIST:", d)

    if d == -1:
        status = 6
    elif d < 8 and h < 400:
        status = 8
    elif h > 1200:
        status = 5
    elif d < 5:
        status = 4
    elif 5 <= d < 10:
        status = 3
    elif 10 <= d < 15:
        status = 2
    else:
        status = 1

    print("STATUS:", status)
    send_payload(status, h, d)

    time.sleep(1)
