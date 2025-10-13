import { FastifyInstance } from 'fastify';
import healthRoutes from './health';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(healthRoutes, { prefix: '/api' });
  // You'll add more routes here later
}
