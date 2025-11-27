import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/db'

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbTest = db.prepare('SELECT 1 as result').get() as { result: number };
      
      return reply.code(200).send({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ft_transcendence-backend',
        version: '1.0.0',
        database: dbTest.result === 1 ? 'connected' : 'error',
        uptime: process.uptime()
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(503).send({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        service: 'ft_transcendence-backend',
        version: '1.0.0',
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbTest = db.prepare('SELECT 1 as result').get() as { result: number };
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const tournamentCount = db.prepare('SELECT COUNT(*) as count FROM tournaments').get() as { count: number };
      return reply.code(200).send({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ft_transcendence-backend',
        version: '1.0.0',
        uptime: process.uptime(),
        database: {
          status: dbTest.result === 1 ? 'connected' : 'error',
          users: userCount.count,
          tournaments: tournamentCount.count
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(503).send({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        service: 'ft_transcendence-backend',
        version: '1.0.0',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      db.prepare('SELECT 1').get();
      
      return reply.code(200).send({
        ready: true
      });
    } catch (error) {
      return reply.code(503).send({
        ready: false
      });
    }
  });

  fastify.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      alive: true
    });
  });
}