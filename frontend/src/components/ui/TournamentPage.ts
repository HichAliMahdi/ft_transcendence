import { TournamentAPI, Tournament, Player, Match, TournamentSize } from '../game/Tournament';
import { PongGame } from '../game/PongGame';

export class TournamentPage {
    private currentGame: PongGame | null = null;
    private container: HTMLElement | null = null;
    private gameCheckInterval: number | null = null;
    
    // State
    private tournament: Tournament | null = null;
    private participants: Player[] = [];
    private matches: Match[] = [];
    private currentMatch: Match | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 tournament-container fade-in';
        this.renderSizeSelection();
        return this.container;
    }

    private async refreshTournamentData(): Promise<void> {
        if (!this.tournament) return;
        
        try {
            const data = await TournamentAPI.getTournament(this.tournament.id);
            this.tournament = data.tournament;
            this.participants = data.participants;
            this.matches = data.matches;
            
            if (this.tournament.status === 'active') {
                this.currentMatch = await TournamentAPI.getCurrentMatch(this.tournament.id);
            }
        } catch (error) {
            console.error('Error refreshing tournament data:', error);
        }
    }

    private async updateUI(): Promise<void> {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        if (!this.tournament) {
            this.renderSizeSelection();
        } else if (this.tournament.status === 'pending') {
            this.renderRegistration();
        } else if (this.tournament.status === 'active' && this.currentMatch) {
            this.renderMatch();
        } else if (this.tournament.status === 'completed') {
            await this.renderWinner();
        } else if (this.tournament.status === 'active' && !this.currentMatch) {
            this.renderWaitingScreen();
        }
    }
}
