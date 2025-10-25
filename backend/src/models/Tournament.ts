import { db } from '../database/db';

export type TournamentSize = 4 | 8 | 16;
export type TournamentStatus = 'pending' | 'active' | 'completed';

interface Player {
    id: number;
    alias: string;
}

interface Match {
    id: number;
    tournament_id: number;
    player1_id: number | null;
    player2_id: number | null;
    player1_score: number;
    player2_score: number;
    winner_id: number | null;
    status: string;
    round: number;
    match_number: number;
    source_match_id_1: number | null;
    source_match_id_2: number | null;
}

interface Tournament {
    id: number;
    name: string;
    status: TournamentStatus;
    max_players: number;
    current_round: number;
    winner_id: number | null;
}

export class TournamentService {
    
    static createTournament(name: string, maxPlayers: TournamentSize): Tournament {
        const stmt = db.prepare(`
            INSERT INTO tournaments (name, status, max_players, current_round)
            VALUES (?, 'pending', ?, 1)
        `);
        const result = stmt.run(name, maxPlayers);
        return this.getTournamentById(result.lastInsertRowid as number);
    }

    static getTournamentById(id: number): Tournament {
        const stmt = db.prepare(`SELECT * FROM tournaments WHERE id = ?`);
        return stmt.get(id) as Tournament;
    }

    static addPlayer(tournamentId: number, alias: string): boolean {
        const tournament = this.getTournamentById(tournamentId);
        
        if (!tournament || tournament.status !== 'pending') {
            return false;
        }

        const currentPlayers = this.getParticipants(tournamentId);
        if (currentPlayers.length >= tournament.max_players) {
            return false;
        }

        if (currentPlayers.some(p => p.alias.toLowerCase() === alias.toLowerCase())) {
            return false;
        }

        try {
            const userStmt = db.prepare(`
                INSERT INTO users (username) VALUES (?)
            `);
            const userResult = userStmt.run(`${alias}_${Date.now()}`);
            const userId = userResult.lastInsertRowid as number;

            const participantStmt = db.prepare(`
                INSERT INTO tournament_participants (tournament_id, user_id, alias)
                VALUES (?, ?, ?)
            `);
            participantStmt.run(tournamentId, userId, alias);

            return true;
        } catch (error) {
            console.error('Error adding player:', error);
            return false;
        }
    }

    static removePlayer(tournamentId: number, userId: number): boolean {
        const tournament = this.getTournamentById(tournamentId);
        
        if (!tournament || tournament.status !== 'pending') {
            return false;
        }

        try {
            const stmt = db.prepare(`
                DELETE FROM tournament_participants 
                WHERE tournament_id = ? AND user_id = ?
            `);
            const result = stmt.run(tournamentId, userId);
            return result.changes > 0;
        } catch (error) {
            console.error('Error removing player:', error);
            return false;
        }
    }
}