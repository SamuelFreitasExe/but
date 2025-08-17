# Base: Ubuntu 22.04
FROM ubuntu:22.04

# Evita perguntas interativas
ENV DEBIAN_FRONTEND=noninteractive

# Instala Node.js, npm e dependências necessárias para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    nodejs \
    npm \
    chromium-browser \
    libatk1.0-0 \
    libnss3 \
    libxss1 \
    libx11-xcb1 \
    libgtk-3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    fonts-liberation \
    xdg-utils \
    wget \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Define pasta de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências do Node
RUN npm install

# Copia todo o projeto
COPY . .

# Configura Puppeteer para usar o Chromium do sistema
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expõe a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
