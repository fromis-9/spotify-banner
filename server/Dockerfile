FROM ghcr.io/puppeteer/puppeteer:20.8.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 10000

CMD ["node", "server.js"]