# Usa Node.js oficial
FROM node:20

# Instala Chromium e dependências
RUN apt-get update && apt-get install -y \
    chromium \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcups2 \
    libnss3 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    wget \
    ca-certificates \
    --no-install-recommends \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Define pasta de trabalho
WORKDIR /app

# Copia arquivos do projeto
COPY package*.json ./
RUN npm install
COPY . .

# Porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]
