import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocketPlugin from '@fastify/websocket';
import { config } from './config';
import { initializeDatabase } from './database/db';
import { runMigrations } from './database/migrations';
import { TournamentService } from './services/TournamentService';
import routes from './routes';

const fastify = Fastify({ 
  logger: {
    level: config.server.nodeEnv === 'development' ? 'info' : 'warn',
    transport: config.server.nodeEnv === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  }
});

// Initialize database
initializeDatabase();

// Run migrations
runMigrations();

// Clean up abandoned tournaments every hour
setInterval(() => {
  TournamentService.cleanupAbandonedTournaments(24);
}, 60 * 60 * 1000);

// Register CORS
fastify.register(cors, {
  origin: config.cors.origin,
  credentials: true,
});

// Register websocket plugin (required for websocket routes)
fastify.register(websocketPlugin, {
  options: {
    maxPayload: 1024 * 1024
  }
});

// Register routes
fastify.register(routes);

// Start server
const start = async (): Promise<void> => {
  try {
    await fastify.listen({ 
      host: config.server.host, 
      port: config.server.port 
    });
    
    console.log(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
    console.log(`📊 Health check available at http://${config.server.host}:${config.server.port}/api/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};



start();