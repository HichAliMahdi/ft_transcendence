import { FastifyInstance } from 'fastify';
import healthRoutes from './health';
import tournamentRoutes from './tournaments';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(healthRoutes, { prefix: '/api' });
  fastify.register(tournamentRoutes, { prefix: '/api' });
  // fastify.regiter(websockerRoutes, { prefix: '/api' }); // Routes added
}
