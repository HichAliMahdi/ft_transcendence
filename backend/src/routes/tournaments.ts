import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentModel } from '../models/Tournament';

interface CreateTournamentBody {
  name: string;
}

export default async function tournamentRoutes(fastify: FastifyInstance) {
  // Get all tournaments
  fastify.get('/tournaments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tournaments = TournamentModel.findAll();
      return { tournaments };
    } catch (error) {
      reply.code(500).send({ error: 'Failed to fetch tournaments' });
    }
  });

  // Create a new tournament
  fastify.post<{ Body: CreateTournamentBody }>('/tournaments', 
    async (request, reply) => {
      try {
        const { name } = request.body;
        
        if (!name || name.trim().length === 0) {
          return reply.code(400).send({ error: 'Tournament name is required' });
        }

        const tournament = TournamentModel.create(name.trim());
        return { tournament };
      } catch (error) {
        reply.code(500).send({ error: 'Failed to create tournament' });
      }
    }
  );

  // Get tournament by ID
  fastify.get<{ Params: { id: string } }>('/tournaments/:id', 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournament = TournamentModel.findById(parseInt(id));
        
        if (!tournament) {
          return reply.code(404).send({ error: 'Tournament not found' });
        }

        return { tournament };
      } catch (error) {
        reply.code(500).send({ error: 'Failed to fetch tournament' });
      }
    }
  );
}
