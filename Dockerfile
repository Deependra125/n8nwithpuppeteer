FROM node:20-slim

# Install stable Chromium along with underlying system graphic libraries
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    procps \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Force Puppeteer to run headlessly using the native container binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

# 🔥 NEW: Install pnpm globally inside the container environment
RUN npm install -g pnpm

# 🔥 NEW: Copy package manifests AND the new pnpm-lock file
COPY package*.json pnpm-lock.yaml ./

# 🔥 NEW: Use pnpm to install production dependencies cleanly
RUN pnpm install --prod --frozen-lockfile

# Bring in your working modular file components (index.js, browserAction.js, etc.)
COPY . .

EXPOSE 8080

CMD [ "node", "index.js" ]
