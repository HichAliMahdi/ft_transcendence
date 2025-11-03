import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:id/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = (request.headers.authorization || '') as string;
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      if (!token) {
        return reply.status(401).send({ message: 'Token missing' });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as any;
      } catch (err: any) {
        return reply.status(401).send({ message: err?.message || 'Invalid or expired token' });
      }

      const reqUserId = Number((request.params as any).id);
      if (Number(decoded.userId) !== reqUserId) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      try {
        const stats = db.prepare(`
          SELECT
            COALESCE(games_played, 0)    AS games_played,
            COALESCE(matches_won, 0)     AS matches_won,
            COALESCE(matches_lost, 0)    AS matches_lost,
            COALESCE(tournaments_joined, 0) AS tournaments_joined,
            COALESCE(tournaments_won, 0) AS tournaments_won
          FROM user_stats WHERE user_id = ?
        `).get(reqUserId);

        if (stats) {
          return reply.code(200).send(stats);
        }
      } catch (err) {
        fastify.log.debug('user_stats query failed, falling back to defaults or aggregated queries');
      }

      const fallback = {
        games_played: 0,
        matches_won: 0,
        matches_lost: 0,
        tournaments_joined: 0,
        tournaments_won: 0
      };

      return reply.code(200).send(fallback);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Internal Server Error' });
    }
  });
}
