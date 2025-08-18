# Base Node 20 slim
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

# Instala bibliotecas necessárias para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libgtk-3-0 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    libwoff1 \
    libharfbuzz0b \
    wget \
    xdg-utils \
    --no-install-recommends \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Define a pasta de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências Node
RUN npm install

# Copia o restante do projeto
COPY . .

# Configura Puppeteer para usar Chromium do sistema
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Porta do servidor
EXPOSE 3000

# Comando para iniciar o bot
CMD ["node", "index.js"]
