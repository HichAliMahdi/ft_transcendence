import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifyRateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import websocketPlugin from '@fastify/websocket';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import helmet from '@fastify/helmet';
import path from 'path';
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

const startfastify = async () => {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs this
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"] // for API + WebSocket
      }
    }
  });

  // Register cookie plugin
  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'dev-secret', // optional, used for signed cookies
    parseOptions: {}           // optional
  });

  await fastify.register(fastifyCsrf, {
    cookieOpts: {
      httpOnly: false,       // JS can read it
      sameSite: 'strict',    // prevent CSRF
      path: '/'
    }
  });

  // Rate Limiting (global default)
  await fastify.register(fastifyRateLimit, {
    max: 100,              // max requests per timeWindow
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `You can make ${context.max} requests per ${context.after}`
    })
  });
};

startfastify().catch(err => {
  fastify.log.error(err);
  process.exit(1);
});

fastify.addHook('onRequest', (req, reply, done) => {
    try {
        const token = reply.generateCsrf();
        reply.setCookie('XSRF-TOKEN', token, {
            httpOnly: false,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
    } catch (err) {}
    done();
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

// Register multipart for file uploads
fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Only one file per request
  }
});

// Serve static files from uploads directory
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();