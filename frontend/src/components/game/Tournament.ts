interface Player {
    id: string;
    alias: string;
}

interface Match {
    id: string;
    player1: Player | null;
    player2: Player | null;
    winner: Player | null;
    round: number;
    matchNumber: number;
}

interface TournamentState {
    players: Player[];
    matches: Match[];
    currentMatch: Match | null;
    isActive: boolean;
    isComplete: boolean;
}

export class Tournament {
    private state: TournamentState;
    private onStateChange?: () => void;

    constructor() {
        this.state = {
            players: [],
            matches: [],
            currentMatch: null,
            currentRound: 1,
            isActive: false,
            isComplete: false
        };
    }

    public getState(): TournamentState {
        return { ...this.state };
    }

    public setStateChangeCallback(callback: () => void): void {
        this.onStateChange = callback;
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    public addPlayer(alias: string): boolean {
        if (this.state.isActive) {
            return false;
        }

        const trimmedAlias = alias.trim();
        if (!trimmedAlias || trimmedAlias.length === 0) {
            return false;
        }

        if (this.state.players.some(p => p.alias.toLowerCase() === trimmedAlias.toLowerCase())) {
            return false;
        }

        const player: Player = {
            id: `player_${Date.now()}_${Math.random()}`,
            alias: trimmedAlias
        };

        this.state.players.push(player);
        this.notifyStateChange();
        return true;
    }

    public removePlayer(playerId: string): boolean {
        if (this.state.isActive) {
            return false;
        }

        const index = this.state.players.findIndex(p => p.id === playerId);
        if (index === -1) {
            return false;
        }

        this.state.players.splice(index, 1);
        this.notifyStateChange();
        return true;
    }

    public startTournament(): boolean {
        if (this.state.players.length < 2) {
            return false;
        }

        this.state.isActive = true;
        this.state.currentRound = 1;
        this.generateMatches();
        this.notifyStateChange();
        return true;
    }

    private generateMatches(): void {
        const players = [...this.state.players];
        this.shufflePlayers(players);
        const numPlayers = players.length;
        const isPowerOfTwo = (numPlayers & (numPlayers - 1)) === 0;
        if (!isPowerOfTwo) {
            const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
            const byes = nextPowerOfTwo - numPlayers;
            
            for (let i = 0; i < byes; i++) {
                players.push(null as any);
            }
        }
        this.state.matches = [];
        let matchNumber = 1;
        for (let i = 0; i < players.length; i += 2) {
            const match: Match = {
                id: `match_${this.state.currentRound}_${matchNumber}`,
                player1: players[i] || null,
                player2: players[i + 1] || null,
                winner: null,
                round: this.state.currentRound,
                matchNumber: matchNumber++
            };
            if (match.player1 && !match.player2) {
                match.winner = match.player1;
            } else if (!match.player1 && match.player2) {
                match.winner = match.player2;
            }
            this.state.matches.push(match);
        }
        this.setNextMatch();
    }
    private shufflePlayers(players: Player[]): void {
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
    }

}