import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const fastify: FastifyInstance = Fastify({
    logger: true
});