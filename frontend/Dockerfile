FROM debian:bullseye

RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json vite.config.ts ./
COPY src ./src

RUN npm run build

CMD ["tail", "-f", "/dev/null"]