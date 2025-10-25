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
        if (!this.container || !this.tournament) return;

        const maxPlayers = this.tournament.max_players;
        const currentPlayers = this.participants.length;
        const remaining = maxPlayers - currentPlayers;
        const isFull = currentPlayers >= maxPlayers;

        const title = document.createElement('h1');
        title.textContent = 'Tournament Registration';
        title.className = 'text-4xl font-bold text-white mb-4 gradient-text';
        
        const subtitle = document.createElement('p');
        subtitle.textContent = `${maxPlayers}-Player Tournament`;
        subtitle.className = 'text-gray-300 text-lg mb-2 text-center';
        
        const playerCount = document.createElement('p');
        playerCount.className = 'text-2xl font-bold text-center mb-8';
        playerCount.innerHTML = `<span class="text-accent-pink">${currentPlayers}</span> / <span class="text-accent-purple">${maxPlayers}</span> Players`;
        
        const registrationForm = document.createElement('div');
        registrationForm.className = 'glass-effect p-8 rounded-2xl mb-8';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = isFull ? 'Tournament is full!' : 'Enter player alias';
        input.maxLength = 20;
        input.disabled = isFull;
        input.className = `px-4 py-3 text-lg border-2 border-blue-800 rounded-xl bg-primary-dark text-white w-full md:w-80 focus:outline-none focus:border-accent-pink transition-colors duration-300 ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`;

        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mt-2 hidden';
        errorMsg.id = 'alias-error';

        const addButton = document.createElement('button');
        addButton.textContent = isFull ? 'Full' : `Add Player (${remaining} slots left)`;
        addButton.disabled = isFull;
        addButton.className = `btn-primary ml-4 ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`;
        addButton.onclick = async () => {
            const alias = input.value.trim();
            errorMsg.classList.add('hidden');
            
            if (!alias) {
                errorMsg.textContent = 'Please enter a player alias';
                errorMsg.classList.remove('hidden');
                return;
            }
            
            try {
                this.participants = await TournamentAPI.addPlayer(this.tournament!.id, alias);
                input.value = '';
                input.focus();
                await this.updateUI();
            } catch (error: any) {
                errorMsg.textContent = error.message;
                errorMsg.classList.remove('hidden');
            }
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isFull) {
                addButton.click();
            }
        });

        const formContainer = document.createElement('div');
        formContainer.className = 'flex flex-col sm:flex-row gap-4 items-center justify-center';
        formContainer.appendChild(input);
        formContainer.appendChild(addButton);
        
        registrationForm.appendChild(formContainer);
        registrationForm.appendChild(errorMsg);
        
        const playersList = document.createElement('div');
        playersList.className = 'glass-effect p-6 rounded-2xl mb-8';
        
        const playersTitle = document.createElement('h3');
        playersTitle.textContent = `Registered Players (${currentPlayers})`;
        playersTitle.className = 'text-2xl font-semibold text-white mb-4';
        playersList.appendChild(playersTitle);
        
        if (this.participants.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No players registered yet';
            emptyMsg.className = 'text-gray-400 text-center py-4';
            playersList.appendChild(emptyMsg);
        } else {
            const ul = document.createElement('ul');
            ul.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            
            this.participants.forEach(player => {
                const li = document.createElement('li');
                li.className = 'bg-game-dark px-4 py-3 rounded-lg flex justify-between items-center transition-colors duration-300 hover:bg-blue-700';
                
                const span = document.createElement('span');
                span.textContent = player.alias;
                span.className = 'text-white font-medium';
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.className = 'bg-game-red hover:bg-red-600 text-white px-3 py-1 text-xl leading-none rounded-lg transition-colors duration-300';
                removeBtn.onclick = async () => {
                    try {
                        this.participants = await TournamentAPI.removePlayer(this.tournament!.id, player.id);
                        await this.updateUI();
                    } catch (error: any) {
                        alert(`Error: ${error.message}`);
                    }
                };
                
                li.appendChild(span);
                li.appendChild(removeBtn);
                ul.appendChild(li);
            });
            
            playersList.appendChild(ul);
        }
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex flex-col sm:flex-row gap-4 justify-center items-center';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Tournament';
        startButton.disabled = !isFull;
        startButton.className = `text-xl font-bold py-4 px-8 rounded-lg transition-colors duration-300 ${
            isFull 
            ? 'btn-primary' 
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`;
        
        startButton.onclick = async () => {
            try {
                const result = await TournamentAPI.startTournament(this.tournament!.id);
                this.tournament = result.tournament;
                this.currentMatch = result.currentMatch;
                await this.refreshTournamentData();
                await this.updateUI();
            } catch (error: any) {
                alert(`Error: ${error.message}`);
            }
        };
        
        const backButton = document.createElement('button');
        backButton.textContent = '← Change Size';
        backButton.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300';
        backButton.onclick = () => {
            this.tournament = null;
            this.participants = [];
            this.matches = [];
            this.updateUI();
        };
        
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(backButton);
        
        this.container.appendChild(title);
        this.container.appendChild(subtitle);
        this.container.appendChild(playerCount);
        this.container.appendChild(registrationForm);
        this.container.appendChild(playersList);
        this.container.appendChild(buttonContainer);
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
