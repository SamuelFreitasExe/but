# Base Node 20 slim
FROM node:20-slim

# Evita interações durante instalação
ENV DEBIAN_FRONTEND=noninteractive

# Instala bibliotecas necessárias para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    libgconf-2-4 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libglib2.0-0 \
    libnspr4 \
    libstdc++6 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    libgbm-dev \
    fonts-liberation \
    xdg-utils \
    wget \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Pasta de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências Node
RUN npm install

# Copia todo o projeto
COPY . .

# Configura Puppeteer para usar o Chromium do sistema
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expõe a porta que sua app usa
EXPOSE 3000

# Comando para iniciar o bot
CMD ["node", "index.js"]
