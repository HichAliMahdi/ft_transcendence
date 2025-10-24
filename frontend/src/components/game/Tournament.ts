interface Player {
    id: string;
    alias: string;
}

interface Match {
    id: string;
    player1: Player | null;
    player2: Player | null;
    winner: Player | null;
    loser?: Player | null;
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
    losers: Player[]; // added losers pool
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
            isComplete: false,
            losers: [] // initialize pool
        };
    }

    public getState(): TournamentState {
        return { ...this.state, players: [...this.state.players], matches: [...this.state.matches], losers: [...this.state.losers] };
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
        // create a bracket tree for all rounds up to final
        const players = [...this.state.players];
        this.shufflePlayers(players);
        const numPlayers = players.length;
        const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
        const byes = nextPowerOfTwo - numPlayers;
        for (let i = 0; i < byes; i++) {
            players.push(null as any);
        }

        const totalRounds = Math.log2(players.length);
        const rounds: Match[][] = [];

        // Round 1
        const round1: Match[] = [];
        let matchNumber = 1;
        for (let i = 0; i < players.length; i += 2) {
            const m: Match = {
                id: `match_1_${matchNumber}`,
                player1: players[i] || null,
                player2: players[i + 1] || null,
                winner: null,
                round: 1,
                matchNumber: matchNumber++
            };
            // auto-advance byes
            if (m.player1 && !m.player2) {
                m.winner = m.player1;
            } else if (!m.player1 && m.player2) {
                m.winner = m.player2;
            }
            round1.push(m);
        }
        rounds.push(round1);

        // build higher rounds with source references
        for (let r = 2; r <= totalRounds; r++) {
            const prev = rounds[r - 2];
            const matchesThisRound: Match[] = [];
            let numMatches = Math.ceil(prev.length / 2);
            for (let j = 0; j < numMatches; j++) {
                const source1 = prev[j * 2] ? prev[j * 2].id : undefined;
                const source2 = prev[j * 2 + 1] ? prev[j * 2 + 1].id : undefined;
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

        // flatten rounds into state.matches (round order)
        this.state.matches = rounds.flat();

        // propagate any byes from round 1 into next rounds (if a round1 match already has a winner)
        this.state.matches.forEach(m => {
            if (m.sourceMatch1) {
                const src = this.state.matches.find(x => x.id === m.sourceMatch1);
                if (src && src.winner) m.player1 = src.winner;
            }
            if (m.sourceMatch2) {
                const src2 = this.state.matches.find(x => x.id === m.sourceMatch2);
                if (src2 && src2.winner) m.player2 = src2.winner;
            }
        });

        this.setNextMatch();
    }
    private shufflePlayers(players: Player[]): void {
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
    }
    private setNextMatch(): void {
        const currentRoundMatches = this.state.matches.filter(
            m => m.round === this.state.currentRound && !m.winner && (m.player1 !== null || m.player2 !== null)
        );

        if (currentRoundMatches.length > 0) {
            this.state.currentMatch = currentRoundMatches[0];
        } else {
            this.state.currentMatch = null;
            this.checkRoundCompletion();
        }
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
                // advance round index (next-round matches are prebuilt in generateMatches)
                this.state.currentRound++;
                this.setNextMatch();
            }
        }
    }

    public recordMatchWinner(matchId: string, winnerId: string): boolean {
        const match = this.state.matches.find(m => m.id === matchId);
        if (!match || match.winner) {
            return false;
        }

        if (match.player1?.id === winnerId) {
            match.winner = match.player1;
            match.loser = match.player2 || null;
        } else if (match.player2?.id === winnerId) {
            match.winner = match.player2;
            match.loser = match.player1 || null;
        } else {
            return false;
        }

        // If there is a real loser (non-bye), add to losers pool
        if (match.loser) {
            this.state.losers.push(match.loser);
        }

        // propagate winner into the next round match slots (if any)
        const nextMatch = this.state.matches.find(m => m.sourceMatch1 === matchId || m.sourceMatch2 === matchId);
        if (nextMatch) {
            if (nextMatch.sourceMatch1 === matchId) {
                nextMatch.player1 = match.winner;
            } else if (nextMatch.sourceMatch2 === matchId) {
                nextMatch.player2 = match.winner;
            }
            // If the next match has both players and one is null due to a bye, the winner will be set and available.
            // If the other source already had a bye winner, it will have been propagated earlier.
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
            losers: []
        };
        this.notifyStateChange();
    }

    public getPlayers(): Player[] {
        return [...this.state.players];
    }

    public getLosers(): Player[] {
        return [...this.state.losers];
    }

    public isActive(): boolean {
        return this.state.isActive;
    }
    
    public isComplete(): boolean {
        return this.state.isComplete;
    }
}
