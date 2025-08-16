FROM ghcr.io/puppeteer/puppeteer:20.1.0

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências do Node
RUN npm install

# Copia todo o resto do projeto
COPY . .

# Expõe a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
