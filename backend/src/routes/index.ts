import { FastifyInstance } from 'fastify';
import healthRoutes from './health';
import tournamentRoutes from './tournaments';
import authRoutes from './auth';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(healthRoutes, { prefix: '/api' });
  fastify.register(authRoutes, { prefix: '/api' });
  fastify.register(tournamentRoutes, { prefix: '/api' });
  // fastify.regiter(websockerRoutes, { prefix: '/api' }); // Routes added for websocket
}
