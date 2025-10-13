import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const fastify: FastifyInstance = Fastify({
    logger: true
});

fastify.get('./health', async (request: FastifyRequest, reply: FastifyReply) => {
    return {status: 'OK', message: 'server is running!'};
});

fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
        message: 'Welcome to my transcendence API',
        endpoints: {
            health: '/health',
            users: '/users (TODO)',
            game: '/game (TODO'
        }
    };
});

