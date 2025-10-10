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

export class Tournament{
    
}