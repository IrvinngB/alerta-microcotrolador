# Imagen base de Puppeteer con Chrome y dependencias
FROM ghcr.io/puppeteer/puppeteer:21.5.2

WORKDIR /usr/src/app

USER root

# Elimina archivos de configuración conflictivos de Google Chrome
RUN rm -f /etc/apt/sources.list.d/google-chrome.list /etc/apt/sources.list.d/google.list

# Instala dependencias adicionales
RUN apt-get update && apt-get install -y \
    xvfb \
    libgbm-dev \
    procps \
    htop \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Copia archivos de dependencias
COPY package*.json ./

# Instala dependencias de Node.js
RUN npm install

# Instala PM2 globalmente
RUN npm install pm2 -g

# Copia el código fuente
COPY . .

# Variables de entorno
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_OPTIONS="--max-old-space-size=512" \
    CHROMIUM_FLAGS="--disable-dev-shm-usage --no-sandbox --disable-gpu --disable-software-rasterizer --js-flags='--expose-gc'" \
    MAX_RECONNECT_ATTEMPTS=10 \
    RECONNECT_DELAY=10000 \
    HEALTH_CHECK_INTERVAL=120000

# Crea directorios y asigna permisos
RUN mkdir -p .wwebjs_auth/session-client \
    && mkdir -p sessions \
    && chown -R pptruser:pptruser .wwebjs_auth \
    && chown -R pptruser:pptruser sessions \
    && chown pptruser:pptruser config.json \
    && chmod 666 config.json

EXPOSE 3000

USER pptruser

# Inicia con PM2
CMD ["pm2-runtime", "index.js"]
