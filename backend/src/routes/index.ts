import { FastifyInstance } from 'fastify';
import healthRoutes from './health';
import tournamentRoutes from './tournaments';
import authRoutes from './auth';
import userRoutes from './users';
import websocketRoutes from './websocket';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(healthRoutes, { prefix: '/api' });
  fastify.register(authRoutes, { prefix: '/api' });
  fastify.register(tournamentRoutes, { prefix: '/api' });
  fastify.register(userRoutes, { prefix: '/api' });
  // Register websocket routes (no '/api' prefix so WS path can be /ws/...)
  fastify.register(websocketRoutes);
  // fastify.regiter(websockerRoutes, { prefix: '/api' }); // Routes added for websocket
}
