import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return { 
      status: 'NOT OK', 
      timestamp: new Date().toISOString(),
      service: 'ft_transcendence-backend',
      version: '1.0.0'
    };
  });
}
