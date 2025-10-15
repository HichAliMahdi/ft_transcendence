import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentModel } from '../models/Tournament';

interface CreateTournamentBody {
  name: string;
}

export default async function tournamentRoutes(fastify: FastifyInstance) {
    // GET ALL TOURNAMENTS
    // CREATE A NEW TOURNAMENT
    // GET TOURNAMENT BY ID
}