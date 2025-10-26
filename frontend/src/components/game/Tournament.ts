const API_BASE = '/api';

export type TournamentSize = 4 | 8 | 16;

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
    
    static async createTournament(name: string, maxPlayers: TournamentSize): Promise<Tournament> {
        const response = await fetch(`${API_BASE}/tournaments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, maxPlayers })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create tournament');
        }

        const data = await response.json();
        return data.tournament;
    }

    static async getTournament(id: number): Promise<TournamentDetails> {
        const response = await fetch(`${API_BASE}/tournaments/${id}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tournament');
        }

        return await response.json();
    }

    static async getAllTournaments(): Promise<Tournament[]> {
        const response = await fetch(`${API_BASE}/tournaments`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tournaments');
        }

        const data = await response.json();
        return data.tournaments;
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

    static async getAllMatches(tournamentId: number): Promise<Match[]> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/matches`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch matches');
        }

        const data = await response.json();
        return data.matches;
    }

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

    static async deleteTournament(tournamentId: number): Promise<void> {
        const response = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete tournament');
        }
    }

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
