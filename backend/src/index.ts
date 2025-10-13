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

const start = async (): Promise<void> => {
    try {
        const HOST = process.env.HOST || '0.0.0.0';
        const PORT = parseInt(process.env.PORT || '3000');

        await fastify.listen({
            host: HOST,
            port: PORT
        });
        console.log(`Server running at http://${HOST}:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};


start();