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
    // new: store scores for both sides (may be undefined until recorded)
    score1?: number | null;
    score2?: number | null;
    round: number;
    matchNumber: number;
    sourceMatch1?: string;
    sourceMatch2?: string;
    isRepechage?: boolean;
    repechageRound?: number;
}

interface LoserEntry {
    player: Player;
    score: number;
    round: number;
}

interface TournamentState {
    players: Player[];
    matches: Match[];
    currentMatch: Match | null;
    currentRound: number;
    isActive: boolean;
    isComplete: boolean;
    losers: LoserEntry[]; // now store losers with score and round
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
        // shallow clones (losers cloned as well)
        return { 
            ...this.state, 
            players: [...this.state.players], 
            matches: [...this.state.matches], 
            losers: [...this.state.losers] 
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
        const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(Math.max(2, numPlayers))));
        // Do NOT auto-advance byes. Collect players who would have received a bye.
        const byePlayers: Player[] = [];
        const mainMatches: Match[] = [];
        let matchNumber = 1;

        // Pair players for main bracket where both sides exist; collect singletons as byePlayers
        for (let i = 0; i < nextPowerOfTwo; i += 2) {
            const p1 = players[i] ?? null;
            const p2 = players[i + 1] ?? null;
            if (p1 && p2) {
                const m: Match = {
                    id: `match_1_${matchNumber}`,
                    player1: p1,
                    player2: p2,
                    winner: null,
                    loser: null,
                    round: 1,
                    matchNumber: matchNumber++
                };
                mainMatches.push(m);
            } else if (p1 && !p2) {
                byePlayers.push(p1);
            } else if (!p1 && p2) {
                byePlayers.push(p2);
            } else {
                // both null (padding) - ignore
            }
        }

        // Create repechage matches for bye players (pair bye-players together).
        // If odd number, one repechage will have player2 = null and be filled later from losers.
        const repechageMatches: Match[] = [];
        for (let i = 0; i < byePlayers.length; i += 2) {
            const rp1 = byePlayers[i];
            const rp2 = byePlayers[i + 1] ?? null;
            const rm: Match = {
                id: `repechage_1_${matchNumber}`,
                player1: rp1 || null,
                player2: rp2,
                winner: null,
                loser: null,
                round: 1,
                matchNumber: matchNumber++,
                isRepechage: true,
                repechageRound: 1
            };
            repechageMatches.push(rm);
        }

        // First round is main matches plus repechage matches
        const round1 = [...mainMatches, ...repechageMatches];
        const rounds: Match[][] = [round1];

        // build higher rounds with source references (include repechage matches in ordering)
        const totalRounds = Math.log2(nextPowerOfTwo);
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
                    loser: null,
                    round: r,
                    matchNumber: j + 1,
                    sourceMatch1: source1,
                    sourceMatch2: source2
                };
                matchesThisRound.push(m);
            }
            rounds.push(matchesThisRound);
        }

        // flatten rounds into state.matches
        this.state.matches = rounds.flat();

        // propagate any winners that already exist (none for byes — we purposefully avoided auto-advance)
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

        // try to immediately fill any repechage gaps if we already have losers (unlikely at start)
        this.fillRepechageWithLosers();

        this.setNextMatch();
    }

    /**
     * Fill all repechage gaps using the losers pool.
     * Preference: pick highest-scoring losers from the same round as the repechage.
     * If the top two losers have equal score, create an immediate repechage match between them.
     */
    private fillRepechageWithLosers(): void {
        // Find all repechage matches missing a player
        const repechageMatches = this.state.matches.filter(m => m.isRepechage && !m.winner);
        const roundsToProcess = Array.from(new Set(repechageMatches.map(m => m.repechageRound ?? m.round)));

        for (const r of roundsToProcess) {
            this.attemptToPopulateRepechageForRound(r);
        }
    }

    private attemptToPopulateRepechageForRound(round: number): void {
        // candidates from same round, sorted by score desc
        const candidates = this.state.losers.filter(l => l.round === round).sort((a, b) => b.score - a.score);

        if (candidates.length === 0) return;

        // Find repechage matches for this (repechageRound or round) that are missing a player slot
        const emptyRepechage = this.state.matches.filter(m =>
            m.isRepechage && !m.winner && ((m.repechageRound ?? m.round) === round) &&
            ( !m.player1 || !m.player2 )
        );

        // If a top two tie, create a match between them (new repechage match)
        if (candidates.length >= 2 && candidates[0].score === candidates[1].score) {
            // create a direct repechage match between the two tied losers
            const topA = candidates.shift()!;
            const topB = candidates.shift()!;

            // remove them from losers pool
            this.state.losers = this.state.losers.filter(l => l.player.id !== topA.player.id && l.player.id !== topB.player.id);

            const newMatch: Match = {
                id: `repechage_tiebreak_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                player1: topA.player,
                player2: topB.player,
                winner: null,
                loser: null,
                score1: null,
                score2: null,
                round: round, // schedule it in same round so it will be resolved soon
                matchNumber: this.state.matches.length + 1,
                isRepechage: true,
                repechageRound: round
            };

            this.state.matches.push(newMatch);
            // after pushing a new match, we can try to fill other empty slots too
        }

        // For each empty repechage slot, pick highest remaining candidate who is not the same as the existing player
        for (const match of emptyRepechage) {
            // Refresh candidates list
            const remaining = this.state.losers.filter(l => l.round === round).sort((a, b) => b.score - a.score);
            if (remaining.length === 0) break;

            // prefer filling player2 if player1 exists
            if (match.player1 && !match.player2) {
                const idx = remaining.findIndex(l => l.player.id !== match.player1?.id);
                if (idx !== -1) {
                    const chosen = remaining[idx];
                    match.player2 = chosen.player;
                    // remove from pool
                    this.state.losers = this.state.losers.filter(l => l.player.id !== chosen.player.id);
                }
            } else if (!match.player1 && match.player2) {
                const idx = remaining.findIndex(l => l.player.id !== match.player2?.id);
                if (idx !== -1) {
                    const chosen = remaining[idx];
                    match.player1 = chosen.player;
                    this.state.losers = this.state.losers.filter(l => l.player.id !== chosen.player.id);
                }
            } else if (!match.player1 && !match.player2) {
                // fill both slots if possible
                const rem = this.state.losers.filter(l => l.round === round).sort((a,b)=> b.score - a.score);
                if (rem.length >= 2) {
                    // if top two have same score they should have been handled above; otherwise assign top two (ensuring distinct)
                    const a = rem.shift()!;
                    const b = rem.shift()!;
                    match.player1 = a.player;
                    match.player2 = b.player;
                    this.state.losers = this.state.losers.filter(l => l.player.id !== a.player.id && l.player.id !== b.player.id);
                } else if (rem.length === 1) {
                    const a = rem.shift()!;
                    match.player1 = a.player;
                    this.state.losers = this.state.losers.filter(l => l.player.id !== a.player.id);
                }
            }
        }

        // notify if changes occurred
        this.notifyStateChange();
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

    /**
     * Record a match winner and optional scores.
     * If scores are provided they will be stored and the loser entry pushed into the losers pool.
     */
    public recordMatchWinner(matchId: string, winnerId: string, score1?: number, score2?: number): boolean {
        const match = this.state.matches.find(m => m.id === matchId);
        if (!match || match.winner) {
            return false;
        }

        // store scores if provided
        if (typeof score1 === 'number') match.score1 = score1;
        if (typeof score2 === 'number') match.score2 = score2;

        if (match.player1?.id === winnerId) {
            match.winner = match.player1;
            match.loser = match.player2 || null;
        } else if (match.player2?.id === winnerId) {
            match.winner = match.player2;
            match.loser = match.player1 || null;
        } else {
            return false;
        }

        // compute loser score (prefer recorded score, otherwise 0)
        let loserScore = 0;
        if (match.loser) {
            if (match.player1 && match.player2) {
                // if scores were provided, map them
                if (typeof match.score1 === 'number' && typeof match.score2 === 'number') {
                    loserScore = (match.player1.id === match.loser.id) ? (match.score1 ?? 0) : (match.score2 ?? 0);
                } else {
                    // fallback: if no scores provided, best-effort (winner gets 5)
                    loserScore =  (match.winner.id === match.player1?.id) ? (match.score2 ?? 0) : (match.score1 ?? 0);
                }
            } else {
                loserScore = 0;
            }

            // push loser into pool with the round they lost in
            this.state.losers.push({
                player: match.loser,
                score: loserScore,
                round: match.round
            });

            // Try populate repechage for this round now that a new loser exists
            this.attemptToPopulateRepechageForRound(match.round);
        }

        // propagate winner into next-round slot (if any)
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
            losers: []
        };
        this.notifyStateChange();
    }

    public getPlayers(): Player[] {
        return [...this.state.players];
    }

    // preserve external API: return player list only
    public getLosers(): Player[] {
        return this.state.losers.map(l => l.player);
    }

    public isActive(): boolean {
        return this.state.isActive;
    }
    
    public isComplete(): boolean {
        return this.state.isComplete;
    }
}
