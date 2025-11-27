import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService, TournamentSize } from '../services/TournamentService';

interface CreateTournamentBody {
  name: string;
  maxPlayers: TournamentSize;
}

interface AddPlayerBody {
  alias: string;
}

interface RecordMatchResultBody {
  winnerId: number;
  score1: number;
  score2: number;
}

interface TournamentParams {
  id: string;
}

interface PlayerParams {
  id: string;
  playerId: string;
}

interface MatchParams {
  matchId: string;
}

export default async function tournamentRoutes(fastify: FastifyInstance) {
  // helper to extract a safe message from thrown errors
  const formatErr = (e: any) => (e instanceof Error ? e.message : String(e));

  fastify.post<{ Body: CreateTournamentBody }>(
    '/tournaments',
    async (request, reply) => {
      try {
        const { name, maxPlayers } = request.body;
        
        if (!name || name.trim().length === 0) {
          return reply.code(400).send({ message: 'Tournament name is required' });
        }

        if (![4, 8, 16].includes(maxPlayers)) {
          return reply.code(400).send({ message: 'Max players must be 4, 8, or 16' });
        }

        const tournament = TournamentService.createTournament(name.trim(), maxPlayers);
        return reply.code(201).send({ tournament });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );


  fastify.get('/tournaments/joinable', async (request, reply) => {
    try {
      const tournaments = TournamentService.getJoinableTournaments();
      return reply.send({ tournaments });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: formatErr(error) });
    }
  });

  fastify.get<{ Params: TournamentParams }>(
    '/tournaments/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        const tournament = TournamentService.getTournamentById(tournamentId);
        
        if (!tournament) {
          return reply.code(404).send({ message: 'Tournament not found' });
        }

        const participants = TournamentService.getParticipants(tournamentId);
        const matches = TournamentService.getAllMatches(tournamentId);

        return reply.send({ 
          tournament,
          participants,
          matches
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.get('/tournaments', async (request, reply) => {
    try {
      const tournaments = TournamentService.getAllTournaments();
      return reply.send({ tournaments });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: formatErr(error) });
    }
  });

  fastify.post<{ Params: TournamentParams; Body: AddPlayerBody }>(
    '/tournaments/:id/players',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { alias } = request.body;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        if (!alias || alias.trim().length === 0) {
          return reply.code(400).send({ message: 'Player alias is required' });
        }

        if (alias.length > 20) {
          return reply.code(400).send({ message: 'Alias must be 20 characters or less' });
        }

        if (!/^[a-zA-Z0-9\s_-]+$/.test(alias)) {
          return reply.code(400).send({ 
            message: 'Only letters, numbers, spaces, - and _ are allowed' 
          });
        }

        const success = TournamentService.addPlayer(tournamentId, alias.trim());
        
        if (!success) {
          return reply.code(400).send({ 
            message: 'Could not add player. Tournament may be full, already started, or alias is taken.' 
          });
        }

        const participants = TournamentService.getParticipants(tournamentId);
        return reply.code(201).send({ participants });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.delete<{ Params: PlayerParams }>(
    '/tournaments/:id/players/:playerId',
    async (request, reply) => {
      try {
        const { id, playerId } = request.params;
        const tournamentId = parseInt(id);
        const playerIdNum = parseInt(playerId);

        if (isNaN(tournamentId) || isNaN(playerIdNum)) {
          return reply.code(400).send({ message: 'Invalid ID' });
        }

        const success = TournamentService.removePlayer(tournamentId, playerIdNum);
        
        if (!success) {
          return reply.code(400).send({ 
            message: 'Could not remove player. Tournament may have already started.' 
          });
        }

        const participants = TournamentService.getParticipants(tournamentId);
        return reply.send({ participants });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.post<{ Params: TournamentParams }>(
    '/tournaments/:id/start',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        const success = TournamentService.startTournament(tournamentId);
        
        if (!success) {
          return reply.code(400).send({ 
            message: 'Could not start tournament. Ensure all player slots are filled.' 
          });
        }

        const tournament = TournamentService.getTournamentById(tournamentId);
        const currentMatch = TournamentService.getCurrentMatch(tournamentId);
        
        return reply.send({ 
          tournament,
          currentMatch
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.get<{ Params: TournamentParams }>(
    '/tournaments/:id/current-match',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        const currentMatch = TournamentService.getCurrentMatch(tournamentId);
        
        if (!currentMatch) {
          return reply.code(404).send({ message: 'No current match available' });
        }

        return reply.send({ match: currentMatch });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.post<{ Params: MatchParams; Body: RecordMatchResultBody }>(
    '/tournaments/matches/:matchId/result',
    async (request, reply) => {
      try {
        const { matchId } = request.params;
        const { winnerId, score1, score2 } = request.body;
        const matchIdNum = parseInt(matchId);

        if (isNaN(matchIdNum)) {
          return reply.code(400).send({ message: 'Invalid match ID' });
        }

        if (!winnerId || typeof score1 !== 'number' || typeof score2 !== 'number') {
          return reply.code(400).send({ message: 'Winner ID and scores are required' });
        }

        const success = TournamentService.recordMatchResult(
          matchIdNum, 
          winnerId, 
          score1, 
          score2
        );
        
        if (!success) {
          return reply.code(400).send({ message: 'Failed to record match result' });
        }

        return reply.send({ 
          success: true,
          message: 'Match result recorded successfully' 
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.get<{ Params: TournamentParams }>(
    '/tournaments/:id/matches',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        const matches = TournamentService.getAllMatches(tournamentId);
        return reply.send({ matches });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.delete<{ Params: TournamentParams }>(
    '/tournaments/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        const success = TournamentService.deleteTournament(tournamentId);
        
        if (!success) {
          return reply.code(404).send({ message: 'Tournament not found' });
        }

        return reply.send({ success: true, message: 'Tournament deleted successfully' });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );

  fastify.post<{ Params: TournamentParams }>(
    '/tournaments/:id/reset',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tournamentId = parseInt(id);

        if (isNaN(tournamentId)) {
          return reply.code(400).send({ message: 'Invalid tournament ID' });
        }

        const success = TournamentService.resetTournament(tournamentId);
        
        if (!success) {
          return reply.code(400).send({ 
            message: 'Could not reset tournament' 
          });
        }

        const tournament = TournamentService.getTournamentById(tournamentId);
        return reply.send({ 
          success: true, 
          tournament,
          message: 'Tournament reset successfully' 
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: formatErr(error) });
      }
    }
  );
}
