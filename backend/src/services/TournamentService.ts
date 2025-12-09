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

    static getAllTournaments(): Tournament[] {
        const stmt = db.prepare(`SELECT * FROM tournaments ORDER BY created_at DESC`);
        return stmt.all() as Tournament[];
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

        const normalizedAlias = alias.toLowerCase().trim();
        if (currentPlayers.some(p => p.alias.toLowerCase().trim() === normalizedAlias)) {
            return false;
        }

        try {
            const userStmt = db.prepare(`
                INSERT INTO users (username, display_name, avatar_url) VALUES (?, ?, ?)
            `);
            const uniqueUsername = `${alias}_${Date.now()}`;
            const userResult = userStmt.run(uniqueUsername, alias, '/default-avatar.png');
            const userId = userResult.lastInsertRowid as number;

            const participantStmt = db.prepare(`
                INSERT INTO tournament_participants (tournament_id, user_id, alias)
                VALUES (?, ?, ?)
            `);
            participantStmt.run(tournamentId, userId, alias);

            return true;
        } catch (error) {
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
            return false;
        }
    }

    static getParticipants(tournamentId: number): Player[] {
        const stmt = db.prepare(`
            SELECT u.id, tp.alias 
            FROM tournament_participants tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.tournament_id = ?
        `);
        return stmt.all(tournamentId) as Player[];
    }

    static startTournament(tournamentId: number): boolean {
        const tournament = this.getTournamentById(tournamentId);
        
        if (!tournament || tournament.status !== 'pending') {
            return false;
        }

        const participants = this.getParticipants(tournamentId);
        if (participants.length !== tournament.max_players) {
            return false;
        }

        const shuffled = this.shuffleArray([...participants]);
        
        this.generateBracket(tournamentId, shuffled, tournament.max_players);

        const updateStmt = db.prepare(`
            UPDATE tournaments SET status = 'active' WHERE id = ?
        `);
        updateStmt.run(tournamentId);

        return true;
    }

    private static generateBracket(
        tournamentId: number, 
        players: Player[], 
        maxPlayers: number
    ): void {
        const totalRounds = Math.log2(maxPlayers);
        
        const round1Matches: number[] = [];
        for (let i = 0; i < players.length; i += 2) {
            const player1 = players[i];
            const player2 = players[i + 1];

            const stmt = db.prepare(`
                INSERT INTO games (
                    tournament_id, player1_id, player2_id, 
                    round, match_number, status
                ) VALUES (?, ?, ?, 1, ?, 'pending')
            `);
            const result = stmt.run(
                tournamentId,
                player1?.id || null,
                player2?.id || null,
                Math.floor(i / 2) + 1
            );
            round1Matches.push(result.lastInsertRowid as number);
        }

        let previousMatches = round1Matches;
        for (let round = 2; round <= totalRounds; round++) {
            const roundMatches: number[] = [];
            
            for (let i = 0; i < previousMatches.length; i += 2) {
                const stmt = db.prepare(`
                    INSERT INTO games (
                        tournament_id, round, match_number,
                        source_match_id_1, source_match_id_2, status
                    ) VALUES (?, ?, ?, ?, ?, 'pending')
                `);
                const result = stmt.run(
                    tournamentId,
                    round,
                    Math.floor(i / 2) + 1,
                    previousMatches[i],
                    previousMatches[i + 1] || null
                );
                roundMatches.push(result.lastInsertRowid as number);
            }
            
            previousMatches = roundMatches;
        }
    }

    static getCurrentMatch(tournamentId: number): Match | null {
        const stmt = db.prepare(`
            SELECT * FROM games 
            WHERE tournament_id = ? 
            AND status = 'pending'
            AND player1_id IS NOT NULL 
            AND player2_id IS NOT NULL
            ORDER BY round ASC, match_number ASC
            LIMIT 1
        `);
        return (stmt.get(tournamentId) as Match) || null;
    }

    static recordMatchResult(
        matchId: number, 
        winnerId: number, 
        score1: number, 
        score2: number
    ): boolean {
        try {
            const updateStmt = db.prepare(`
                UPDATE games 
                SET winner_id = ?, 
                    player1_score = ?, 
                    player2_score = ?,
                    status = 'completed'
                WHERE id = ?
            `);
            updateStmt.run(winnerId, score1, score2, matchId);

            const nextMatchStmt = db.prepare(`
                SELECT * FROM games 
                WHERE source_match_id_1 = ? OR source_match_id_2 = ?
            `);
            const nextMatch = nextMatchStmt.get(matchId, matchId) as Match | undefined;

            if (nextMatch) {
                if (nextMatch.source_match_id_1 === matchId) {
                    db.prepare(`UPDATE games SET player1_id = ? WHERE id = ?`)
                        .run(winnerId, nextMatch.id);
                } else {
                    db.prepare(`UPDATE games SET player2_id = ? WHERE id = ?`)
                        .run(winnerId, nextMatch.id);
                }
            } else {
                const match = db.prepare(`SELECT * FROM games WHERE id = ?`).get(matchId) as Match;
                db.prepare(`UPDATE tournaments SET status = 'completed', winner_id = ? WHERE id = ?`)
                    .run(winnerId, match.tournament_id);
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    static getAllMatches(tournamentId: number): Match[] {
        const stmt = db.prepare(`
            SELECT * FROM games 
            WHERE tournament_id = ?
            ORDER BY round ASC, match_number ASC
        `);
        return stmt.all(tournamentId) as Match[];
    }

    private static shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i];
            if (temp !== undefined && shuffled[j] !== undefined) {
                shuffled[i] = shuffled[j] as T;
                shuffled[j] = temp;
            }
        }
        return shuffled;
    }

    static deleteTournament(id: number): boolean {
        try {
            const tournament = this.getTournamentById(id);
            if(!tournament) {
                return false;
            }
            db.prepare(`DELETE FROM games WHERE tournament_id = ?`).run(id);
            db.prepare(`DELETE FROM tournament_participants WHERE tournament_id = ?`).run(id);
            db.prepare(`DELETE FROM tournaments WHERE id = ?`).run(id);
            return true;
        } catch (error) {
            return false;
        }
    }

    static resetTournament(id: number): boolean {
        try {
            const tournament = this.getTournamentById(id);
            if (!tournament || tournament.status === 'completed') {
                return false;
            }
            db.prepare(`DELETE FROM games WHERE tournament_id = ?`).run(id);
            db.prepare(`
            UPDATE tournaments
            SET status = 'pending', current_round = 1, winner_id = NULL
            WHERE id = ?
        `).run(id);
            return true;
        } catch (error) {
            return false;
        }
    }

    static cleanupAbandonedTournaments(hoursOld: number = 24): number {
        try {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
            const cutoffISO = cutoffDate.toISOString();

            const abandonedTournaments = db.prepare(`
                SELECT id FROM tournaments 
                WHERE status IN ('pending', 'active') 
                AND created_at < ?
            `).all(cutoffISO) as { id: number }[];

            let deletedCount = 0;
            for (const tournament of abandonedTournaments) {
                if (this.deleteTournament(tournament.id)) {
                    deletedCount++;
                }
            }

            return deletedCount;
        } catch (error) {
            return 0;
        }
    }

    static getJoinableTournaments(): Array<Tournament & { available_slots: number }> {
        const stmt = db.prepare(`
            SELECT 
                t.*,
                t.max_players - COUNT(tp.user_id) as available_slots
            FROM tournaments t
            LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE t.status = 'pending'
            GROUP BY t.id
            HAVING available_slots > 0
            ORDER BY t.created_at DESC
        `);
        return stmt.all() as Array<Tournament & { available_slots: number }>;
    }
}
