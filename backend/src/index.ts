import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const fastify: FastifyInstance = Fastify({
    logger: true
});

fastify.get('./health', async (request: FastifyRequest, reply: FastifyReply) => {
    return {status: 'OK', message: 'server is running!'};
});

