const API_BASE = '/api';

/**
 * Valid tournament sizes: 4, 8, or 16 players
 */
export type TournamentSize = 4 | 8 | 16;

/**
 * Tournament types:
 * - local: Players share the same keyboard on one computer
 * - online: Players join remotely and compete online
 */
export type TournamentType = 'local' | 'online';

export interface Player {
    id: number;
    alias: string;
}

export interface Match {
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

export interface Tournament {
    id: number;
    name: string;
    type: TournamentType;
    status: 'pending' | 'active' | 'completed';
    max_players: number;
    current_round: number;
    winner_id: number | null;
    created_at: string;
}

export interface JoinableTournament extends Tournament {
    available_slots: number;
}

export interface TournamentDetails {
    tournament: Tournament;
    participants: Player[];
    matches: Match[];
}

export class TournamentAPI {
    
    /**
     * Create a new tournament
     * @param name Tournament name
     * @param maxPlayers Number of players (4, 8, or 16)
     * @param type Tournament type (local or online), defaults to 'local'
     * @returns Created tournament object
     */
    static async createTournament(name: string, maxPlayers: TournamentSize, type: TournamentType = 'local'): Promise<Tournament> {
        const response = await fetch(`${API_BASE}/tournaments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, maxPlayers, type })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create tournament');
        }

        const data = await response.json();
        return data.tournament;
    }

    /**
     * Get details of a specific tournament
     * @param id Tournament ID
     * @returns Tournament details including participants and matches
     */
    static async getTournament(id: number): Promise<TournamentDetails> {
        const response = await fetch(`${API_BASE}/tournaments/${id}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tournament');
        }

        return await response.json();
    }

    /**
     * Get all tournaments, optionally filtered by type
     * @param type Optional filter for tournament type
     * @returns Array of tournaments
     */
    static async getAllTournaments(type?: TournamentType): Promise<Tournament[]> {
        const url = type ? `${API_BASE}/tournaments?type=${type}` : `${API_BASE}/tournaments`;
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tournaments');
        }

        const data = await response.json();
        return data.tournaments;
    }

    /**
     * Get only local tournaments
     * @returns Array of local tournaments
     */
    static async getLocalTournaments(): Promise<Tournament[]> {
        return this.getAllTournaments('local');
    }

    /**
     * Get only online tournaments available to join
     * @returns Array of joinable online tournaments
     */
    static async getOnlineTournaments(): Promise<Tournament[]> {
        return this.getAllTournaments('online');
    }

    static async getJoinableTournaments(): Promise<JoinableTournament[]> {
        const response = await fetch(`${API_BASE}/tournaments/joinable`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch joinable tournaments');
        }

        const data = await response.json();
        return data.tournaments;
    }

    /**
     * Add a player to a tournament
     * @param tournamentId Tournament ID
     * @param alias Player alias
     * @returns Updated list of participants
     */
    static async addPlayer(tournamentId: number, alias: string): Promise<Player[]> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add player');
        }

        const data = await response.json();
        return data.participants;
    }

    /**
     * Remove a player from a tournament
     * @param tournamentId Tournament ID
     * @param playerId Player ID
     * @returns Updated list of participants
     */
    static async removePlayer(tournamentId: number, playerId: number): Promise<Player[]> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/players/${playerId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove player');
        }

        const data = await response.json();
        return data.participants;
    }

    /**
     * Start a tournament
     * @param tournamentId Tournament ID
     * @returns Object containing the started tournament and the current match (if any)
     */
    static async startTournament(tournamentId: number): Promise<{ tournament: Tournament; currentMatch: Match | null }> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/start`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start tournament');
        }

        return await response.json();
    }

    /**
     * Get the current match of a tournament
     * @param tournamentId Tournament ID
     * @returns Current match object or null if there is no current match
     */
    static async getCurrentMatch(tournamentId: number): Promise<Match | null> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/current-match`);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch current match');
        }

        const data = await response.json();
        return data.match;
    }

    /**
     * Get all matches of a tournament
     * @param tournamentId Tournament ID
     * @returns Array of match objects
     */
    static async getAllMatches(tournamentId: number): Promise<Match[]> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/matches`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch matches');
        }

        const data = await response.json();
        return data.matches;
    }

    /**
     * Record the result of a match
     * @param matchId Match ID
     * @param winnerId ID of the player who won
     * @param score1 Score of player 1
     * @param score2 Score of player 2
     */
    static async recordMatchResult(
        matchId: number, 
        winnerId: number, 
        score1: number, 
        score2: number
    ): Promise<void> {
        const response = await fetch(`${API_BASE}/tournaments/matches/${matchId}/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winnerId, score1, score2 })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to record match result');
        }
    }

    static getPlayerFromMatch(match: Match, participants: Player[], position: 1 | 2): Player | null {
        const playerId = position === 1 ? match.player1_id : match.player2_id;
        if (!playerId) return null;
        return participants.find(p => p.id === playerId) || null;
    }

    static getWinnerFromMatch(match: Match, participants: Player[]): Player | null {
        if (!match.winner_id) return null;
        return participants.find(p => p.id === match.winner_id) || null;
    }

    /**
     * Delete a tournament
     * @param tournamentId Tournament ID
     */
    static async deleteTournament(tournamentId: number): Promise<void> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete tournament');
        }
    }

    /**
     * Reset a tournament to its initial state
     * @param tournamentId Tournament ID
     * @returns Reset tournament object
     */
    static async resetTournament(tournamentId: number): Promise<Tournament> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/reset`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reset tournament');
        }

        const data = await response.json();
        return data.tournament;
    }
}
