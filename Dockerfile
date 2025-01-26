FROM ghcr.io/puppeteer/puppeteer:24.1.0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_DOWNLOAD_BASE_URL=https://storage.googleapis.com/chrome-for-testing-public

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD [ "node", "form_handler.js"]