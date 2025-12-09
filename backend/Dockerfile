FROM debian:bullseye

RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install && npm install pino-pretty --save-dev

COPY src ./src
RUN npm run build

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads/avatars && \
    chmod -R 755 /app/uploads && \
    touch /app/uploads/avatars/.gitkeep

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
