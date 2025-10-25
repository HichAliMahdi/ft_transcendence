interface Player {
    id: string;
    alias: string;
}

interface Match {
    id: string;
    player1: Player | null;
    player2: Player | null;
    winner: Player | null;
    score1?: number | null;
    score2?: number | null;
    round: number;
    matchNumber: number;
    sourceMatch1?: string;
    sourceMatch2?: string;
}

interface TournamentState {
    players: Player[];
    matches: Match[];
    currentMatch: Match | null;
    currentRound: number;
    isActive: boolean;
    isComplete: boolean;
    maxPlayers: number;
}

export type TournamentSize = 4 | 8 | 16;

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
            isComplete: false,
            maxPlayers: 0
        };
    }

    public setTournamentSize(size: TournamentSize): boolean {
        if (this.state.isActive || this.state.players.length > 0) {
            return false;
        }
        this.state.maxPlayers = size;
        this.notifyStateChange();
        return true;
    }

    public getTournamentSize(): number {
        return this.state.maxPlayers;
    }

    public isFull(): boolean {
        if (this.state.maxPlayers === 0) return false;
        return this.state.players.length >= this.state.maxPlayers;
    }

    public getRemainingSlots(): number {
        if (this.state.maxPlayers === 0) return Infinity;
        return Math.max(0, this.state.maxPlayers - this.state.players.length);
    }

    public getState(): TournamentState {
        return { 
            ...this.state, 
            players: [...this.state.players], 
            matches: [...this.state.matches]
        };
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

        if (this.isFull()) {
            return false;
        }

        const trimmedAlias = alias.trim();
        
        if (!trimmedAlias || trimmedAlias.length === 0) {
            return false;
        }
        
        if (trimmedAlias.length > 20) {
            return false;
        }
        
        if (!/^[a-zA-Z0-9\s_-]+$/.test(trimmedAlias)) {
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
        if (this.state.maxPlayers === 0) {
            return false;
        }

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
        
        const bracketSize = this.state.maxPlayers;
        const numPlayers = players.length;
        
        const mainMatches: Match[] = [];
        let matchNumber = 1;

        for (let i = 0; i < bracketSize; i += 2) {
            const p1 = players[i] ?? null;
            const p2 = players[i + 1] ?? null;
            
            const m: Match = {
                id: `match_1_${matchNumber}`,
                player1: p1,
                player2: p2,
                winner: null,
                round: 1,
                matchNumber: matchNumber++
            };
            mainMatches.push(m);
        }

        const rounds: Match[][] = [mainMatches];
        const totalRounds = Math.log2(bracketSize);

        for (let r = 2; r <= totalRounds; r++) {
            const prev = rounds[r - 2];
            const matchesThisRound: Match[] = [];
            const numMatches = prev.length / 2;
            
            for (let j = 0; j < numMatches; j++) {
                const source1 = prev[j * 2].id;
                const source2 = prev[j * 2 + 1].id;
                
                const m: Match = {
                    id: `match_${r}_${j + 1}`,
                    player1: null,
                    player2: null,
                    winner: null,
                    round: r,
                    matchNumber: j + 1,
                    sourceMatch1: source1,
                    sourceMatch2: source2
                };
                matchesThisRound.push(m);
            }
            rounds.push(matchesThisRound);
        }

        this.state.matches = rounds.flat();
        this.setNextMatch();
    }

    private shufflePlayers(players: Player[]): void {
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
    }

    private isMatchPlayable(m: Match): boolean {
        return !!(m.player1 && m.player2);
    }

    private setNextMatch(): void {
        const playableMatches = this.state.matches.filter(
            m => m.round === this.state.currentRound && !m.winner && this.isMatchPlayable(m)
        );

        if (playableMatches.length > 0) {
            this.state.currentMatch = playableMatches[0];
            return;
        }

        this.state.currentMatch = null;
        this.checkRoundCompletion();
    }

    private checkRoundCompletion(): void {
        const currentRoundMatches = this.state.matches.filter(
            m => m.round === this.state.currentRound
        );

        const allMatchesComplete = currentRoundMatches.every(m => m.winner !== null);

        if (allMatchesComplete) {
            const winners = currentRoundMatches
                .map(m => m.winner)
                .filter(w => w !== null) as Player[];

            if (winners.length === 1) {
                this.state.isComplete = true;
                this.state.isActive = false;
                this.state.currentMatch = null;
            } else if (winners.length > 1) {
                this.state.currentRound++;
                this.setNextMatch();
            }
        }
    }

    public recordMatchWinner(matchId: string, winnerId: string, score1?: number, score2?: number): boolean {
        const match = this.state.matches.find(m => m.id === matchId);
        if (!match || match.winner) {
            return false;
        }

        if (typeof score1 === 'number') match.score1 = score1;
        if (typeof score2 === 'number') match.score2 = score2;

        if (match.player1?.id === winnerId) {
            match.winner = match.player1;
        } else if (match.player2?.id === winnerId) {
            match.winner = match.player2;
        } else {
            return false;
        }

        const nextMatch = this.state.matches.find(m => m.sourceMatch1 === matchId || m.sourceMatch2 === matchId);
        if (nextMatch) {
            if (nextMatch.sourceMatch1 === matchId) {
                nextMatch.player1 = match.winner;
            } else if (nextMatch.sourceMatch2 === matchId) {
                nextMatch.player2 = match.winner;
            }
        }

        this.setNextMatch();
        this.notifyStateChange();
        return true;
    }

    public getCurrentMatch(): Match | null {
        return this.state.currentMatch;
    }

    public getMatchesByRound(round: number): Match[] {
        return this.state.matches.filter(m => m.round === round);
    }

    public getAllRounds(): number[] {
        const rounds = new Set(this.state.matches.map(m => m.round));
        return Array.from(rounds).sort((a, b) => a - b);
    }

    public getWinner(): Player | null {
        if (!this.state.isComplete) {
            return null;
        }

        const finalRound = Math.max(...this.state.matches.map(m => m.round));
        const finalMatch = this.state.matches.find(m => m.round === finalRound);
        
        return finalMatch?.winner || null;
    }

    public reset(): void {
        this.state = {
            players: [],
            matches: [],
            currentMatch: null,
            currentRound: 1,
            isActive: false,
            isComplete: false,
            maxPlayers: 0
        };
        this.notifyStateChange();
    }

    public getPlayers(): Player[] {
        return [...this.state.players];
    }

    public isActive(): boolean {
        return this.state.isActive;
    }
    
    public isComplete(): boolean {
        return this.state.isComplete;
    }
}
