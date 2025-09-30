FROM node:20-alpine
WORKDIR /app

# Installation des dépendances système nécessaires pour sqlite3
RUN apk add --no-cache make gcc g++ python3

COPY package*.json ./
RUN npm install --build-from-source

COPY . .
EXPOSE 3001
CMD ["node", "index.js"]