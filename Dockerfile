FROM node:20-alpine

WORKDIR /app

# Installer PM2 globalement
RUN npm install -g pm2

COPY package*.json ./
RUN npm install

COPY . .

# Exposer port
EXPOSE 3000

# Commande par défaut (dev : pm2 watch, prod : pm2 sans watch)
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'development' ]; then pm2-runtime ecosystem.config.js --watch; else pm2-runtime ecosystem.config.js; fi"]
