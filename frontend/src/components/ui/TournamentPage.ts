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
    private renderSizeSelection(): void {
        if (!this.container) return;

        const title = document.createElement('h1');
        title.textContent = 'Tournament Setup';
        title.className = 'text-4xl font-bold text-white text-center mb-4 gradient-text';
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Select tournament size';
        subtitle.className = 'text-gray-300 text-lg mb-12 text-center';
        
        const sizeSection = document.createElement('div');
        sizeSection.className = 'grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto';
        
        const sizes: { size: TournamentSize; emoji: string; description: string }[] = [
            { size: 4, emoji: '🎮', description: 'Quick tournament - 2 rounds, 3 matches total' },
            { size: 8, emoji: '🏆', description: 'Standard tournament - 3 rounds, 7 matches total' },
            { size: 16, emoji: '👑', description: 'Championship - 4 rounds, 15 matches total' }
        ];
        
        sizes.forEach(({ size, emoji, description }) => {
            const card = document.createElement('div');
            card.className = 'glass-effect p-8 rounded-2xl cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-accent-pink hover:-translate-y-2 flex flex-col items-center';
            card.onclick = async () => {
                try {
                    this.tournament = await TournamentAPI.createTournament(`Tournament ${Date.now()}`, size);
                    await this.refreshTournamentData();
                    await this.updateUI();
                } catch (error: any) {
                    alert(`Error: ${error.message}`);
                }
            };
            
            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'text-7xl mb-4';
            emojiDiv.textContent = emoji;

            const sizeTitle = document.createElement('h3');
            sizeTitle.className = 'text-3xl font-bold text-white mb-3';
            sizeTitle.textContent = `${size} Players`;

            const desc = document.createElement('p');
            desc.className = 'text-sm text-gray-300 text-center leading-relaxed';
            desc.textContent = description;

            card.appendChild(emojiDiv);
            card.appendChild(sizeTitle);
            card.appendChild(desc);
            
            sizeSection.appendChild(card);
        });
        
        const infoBox = document.createElement('div');
        infoBox.className = 'glass-effect p-6 rounded-2xl mt-12 max-w-2xl mx-auto';
        
        const infoTitle = document.createElement('h3');
        infoTitle.className = 'text-xl font-semibold text-white mb-3 text-center';
        infoTitle.textContent = 'How it works';
        
        const infoList = document.createElement('ul');
        infoList.className = 'text-gray-300 space-y-2';
        
        const infoItems = [
            'Choose your tournament size (4, 8, or 16 players)',
            'Register players - all slots must be filled to start',
            'Single elimination format - lose once and you\'re out!',
            'First to 5 points wins each match'
        ];
        
        infoItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'flex items-start';
            
            const bullet = document.createElement('span');
            bullet.textContent = '•';
            bullet.className = 'mr-2 text-accent-pink';
            
            li.appendChild(bullet);
            li.appendChild(document.createTextNode(item));
            infoList.appendChild(li);
        });
        
        infoBox.appendChild(infoTitle);
        infoBox.appendChild(infoList);
        
        this.container.appendChild(title);
        this.container.appendChild(subtitle);
        this.container.appendChild(sizeSection);
        this.container.appendChild(infoBox);
    }

    private renderRegistration(): void {
        // Implementation of registration UI
    }

    private renderMatch(): void {
        // Implementation of match UI
    }

    private setupGameEndHandler(): void {
        // Implementation of game end handler
    }

    private handleMatchEnd(matchId: number, winnerId: number, score1: number, score2: number): void {
        // Implementation of match end handling
    }

    private renderBracket(): HTMLElement {
        // Implementation of bracket rendering
    }

    private renderWaitingScreen(): void {
        // Implementation of waiting screen UI
    }

    private async renderWinner(): Promise<void> {
    }

    public cleanup(): void {
        if (this.currentGame) {
            if (this.currentGame.isPauseActive()) {
                this.currentGame.togglePause();
            }
            this.currentGame.destroy();
            this.currentGame = null;
        }
        if (this.gameCheckInterval !== null) {
            clearInterval(this.gameCheckInterval);
            this.gameCheckInterval = null;
        }
    }
}
