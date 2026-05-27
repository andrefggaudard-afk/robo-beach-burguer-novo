FROM node:18-slim

# Instala todas as dependências necessárias
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound-dev \
    libxshmfence-dev \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libatk1.0-0 \
    libxss1 \
    libxtst6 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install
RUN npx playwright install chromium

COPY . .

# Força o WhatsApp-Web.js a usar o Chrome do Playwright
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome

CMD ["npm", "start"]
