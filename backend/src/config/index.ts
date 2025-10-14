export const config = {
    server: {
        port: parseInt(process.env.BACKEND_PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    database: {
        path: process.env.DB_PATH || './data/pong.db',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    }
} as const;
