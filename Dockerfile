# Usar Node.js 18 LTS en Alpine para imagen ligera
FROM node:18-alpine

# Instalar dependencias necesarias para Puppeteer/Chromium en Linux
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar el resto de la aplicación
COPY . .

# Crear directorio para sesiones de WhatsApp
RUN mkdir -p /app/sessions && chmod 777 /app/sessions

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]
