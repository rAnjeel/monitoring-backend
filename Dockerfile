FROM node:20-alpine

# Installer PM2 globalement
RUN npm install -g pm2

WORKDIR /app

# Installer les dépendances (prod + dev)
COPY package*.json ./
RUN npm install

# Copier tout le code (pour build initial)
COPY . .

# Exposer port
EXPOSE 3000

# Lancer en mode watch si dev, sinon normal
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'development' ]; then pm2-runtime start node_modules/.bin/nest -- start --watch -- --exec; else pm2-runtime start dist/main.js; fi"]
