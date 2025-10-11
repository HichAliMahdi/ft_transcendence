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
    
}