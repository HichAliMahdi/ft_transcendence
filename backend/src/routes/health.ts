import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return { 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'transcendence-backend'
    };
  });
}
