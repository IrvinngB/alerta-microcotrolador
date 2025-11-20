# CanaletaGuard - Sistema de Alerta de Desborde

Sistema de notificaciones WhatsApp para alertas de desborde de canaletas.

## 🚀 Despliegue con Docker

### Requisitos Previos
- Docker instalado
- Docker Compose instalado

### Instalación Rápida

1. **Clonar o copiar el proyecto**
```bash
cd whatsapp-bot
```

2. **Construir y ejecutar con Docker Compose**
```bash
docker-compose up -d
```

3. **Ver logs**
```bash
docker-compose logs -f
```

4. **Acceder a la aplicación**
```
http://localhost:3000
```

### Comandos Útiles

**Detener el contenedor:**
```bash
docker-compose down
```

**Reiniciar el contenedor:**
```bash
docker-compose restart
```

**Ver estado:**
```bash
docker-compose ps
```

**Reconstruir imagen:**
```bash
docker-compose up -d --build
```

## 📁 Estructura de Archivos

```
whatsapp-bot/
├── Dockerfile              # Configuración de imagen Docker
├── docker-compose.yml      # Orquestación de contenedores
├── .dockerignore          # Archivos excluidos de la imagen
├── index.js               # Servidor Express + WhatsApp
├── config.json            # Configuración (persistente)
├── package.json           # Dependencias Node.js
├── public/                # Frontend
│   ├── index.html
│   └── script.js
└── sessions/              # Sesiones WhatsApp (persistente)
```

## 🔧 Configuración

### Variables de Entorno (Opcional)

Puedes crear un archivo `.env` para configuraciones adicionales:

```env
PORT=3000
NODE_ENV=production
```

### Persistencia de Datos

Los siguientes directorios se persisten automáticamente:
- `./sessions` - Sesiones de WhatsApp
- `./config.json` - Configuración del sistema

## 🐧 Despliegue en Linux (Producción)

### Opción 1: VPS con Docker

1. **Conectar al servidor**
```bash
ssh usuario@tu-servidor.com
```

2. **Instalar Docker (si no está instalado)**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **Instalar Docker Compose**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

4. **Copiar proyecto al servidor**
```bash
scp -r whatsapp-bot usuario@tu-servidor.com:~/
```

5. **Ejecutar en el servidor**
```bash
cd ~/whatsapp-bot
docker-compose up -d
```

### Opción 2: Configurar como Servicio Systemd

Crear archivo `/etc/systemd/system/canaletaguard.service`:

```ini
[Unit]
Description=CanaletaGuard WhatsApp Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/usuario/whatsapp-bot
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Habilitar y ejecutar:
```bash
sudo systemctl enable canaletaguard
sudo systemctl start canaletaguard
sudo systemctl status canaletaguard
```

## 🔒 Seguridad

- El contenedor corre con `no-new-privileges` para mayor seguridad
- Se recomienda usar un reverse proxy (nginx) para HTTPS
- Configurar firewall para exponer solo el puerto necesario

### Ejemplo con Nginx

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Troubleshooting

### El QR no se genera
```bash
# Ver logs del contenedor
docker-compose logs -f

# Reiniciar contenedor
docker-compose restart
```

### Error de permisos en sessions/
```bash
# Dar permisos al directorio
chmod 777 sessions/
```

### Limpiar sesiones y reiniciar
```bash
docker-compose down
rm -rf sessions/*
docker-compose up -d
```

## 📊 Monitoreo

### Ver uso de recursos
```bash
docker stats canaletaguard-bot
```

### Logs en tiempo real
```bash
docker-compose logs -f --tail=100
```

## 🔄 Actualización

```bash
# Detener contenedor
docker-compose down

# Actualizar código
git pull  # o copiar archivos nuevos

# Reconstruir y ejecutar
docker-compose up -d --build
```

## 👥 Equipo de Desarrollo

- Barrera, Roy (8-1022-2121)
- Beitia, Bethel (4-828-2349)
- Benítez, Irvin (8-1017-1171)
- Duarte, Ana (8-1018-2345)
- Juárez, Edgar (8-962-1614)

## 📝 Licencia

Proyecto académico - Universidad Tecnológica de Panamá
# alerta-microcotrolador
