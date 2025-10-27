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
    // Add storage key
    private readonly STORAGE_KEY = 'active_tournament_id';

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 tournament-container fade-in';
        // Try to restore tournament state before rendering lobby
        this.restoreTournamentState().then(() => {
            if (!this.tournament) {
                this.renderLobby();
            } else {
                this.updateUI();
            }
        });
        return this.container;
    }

    // Add method to restore tournament from sessionStorage
    private async restoreTournamentState(): Promise<void> {
        const storedId = sessionStorage.getItem(this.STORAGE_KEY);
        if (!storedId) return;

        try {
            const tournamentId = parseInt(storedId);
            if (isNaN(tournamentId)) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return;
            }

            const data = await TournamentAPI.getTournament(tournamentId);
            this.tournament = data.tournament;
            this.participants = data.participants;
            this.matches = data.matches;

            if (this.tournament.status === 'active') {
                this.currentMatch = await TournamentAPI.getCurrentMatch(this.tournament.id);
            }

            console.log('Tournament state restored:', this.tournament.name);
        } catch (error) {
            console.error('Failed to restore tournament:', error);
            sessionStorage.removeItem(this.STORAGE_KEY);
        }
    }

    // Save tournament ID when tournament is created or joined
    private saveTournamentId(tournamentId: number): void {
        sessionStorage.setItem(this.STORAGE_KEY, tournamentId.toString());
    }

    // Clear tournament ID when leaving
    private clearTournamentId(): void {
        sessionStorage.removeItem(this.STORAGE_KEY);
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
        this.container.innerHTML = '';

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
                // Prompt for creator's alias
                const alias = prompt('Enter your player alias:');
                if (!alias || alias.trim().length === 0) {
                    return;
                }

                if (alias.length > 20) {
                    alert('Alias must be 20 characters or less.');
                    return;
                }

                if (!/^[a-zA-Z0-9\s_-]+$/.test(alias)) {
                    alert('Alias can only contain letters, numbers, spaces, underscores, and hyphens.');
                    return;
                }

                try {
                    this.tournament = await TournamentAPI.createTournament(`Tournament ${Date.now()}`, size);
                    this.saveTournamentId(this.tournament.id);
                    
                    // Automatically register the creator
                    this.participants = await TournamentAPI.addPlayer(this.tournament.id, alias.trim());
                    
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
        
        // Add creator info
        const creatorInfo = document.createElement('p');
        if (this.participants.length > 0) {
            creatorInfo.textContent = `Created by ${this.participants[0].alias}`;
            creatorInfo.className = 'text-blue-400 text-sm mb-4 text-center';
        }
        
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
        backButton.onclick = async () => {
            if (this.tournament){
                try {
                    await TournamentAPI.deleteTournament(this.tournament.id);
                } catch (error: any) {
                    console.error('Error deleting tournament:', error);
                }
            }
            this.tournament = null;
            this.participants = [];
            this.matches = [];
            this.updateUI();
        };
        
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(backButton);
        
        this.container.appendChild(title);
        this.container.appendChild(subtitle);
        if (this.participants.length > 0) {
            this.container.appendChild(creatorInfo);
        }
        this.container.appendChild(playerCount);
        this.container.appendChild(registrationForm);
        this.container.appendChild(playersList);
        this.container.appendChild(buttonContainer);
    }

    private renderMatch(): void {
        if (!this.container || !this.currentMatch) return;

        this.cleanupCurrentGame();

        const player1 = TournamentAPI.getPlayerFromMatch(this.currentMatch, this.participants, 1);
        const player2 = TournamentAPI.getPlayerFromMatch(this.currentMatch, this.participants, 2);

        const title = document.createElement('h1');
        title.textContent = `Round ${this.currentMatch.round} - Match ${this.currentMatch.match_number}`;
        title.className = 'text-3xl font-bold text-white mb-6 gradient-text';
        
        const matchInfo = document.createElement('div');
        matchInfo.className = 'glass-effect p-8 rounded-2xl my-8 text-center';

        const vs = document.createElement('h2');
        vs.className = 'text-4xl my-4';

        const player1Span = document.createElement('span');
        player1Span.className = 'text-blue-400 font-bold';
        player1Span.textContent = player1?.alias || 'Unknown';

        const vsText = document.createElement('span');
        vsText.className = 'text-gray-500 mx-6';
        vsText.textContent = 'VS';

        const player2Span = document.createElement('span');
        player2Span.className = 'text-game-red font-bold';
        player2Span.textContent = player2?.alias || 'Unknown';
    
        vs.appendChild(player1Span);
        vs.appendChild(vsText);
        vs.appendChild(player2Span);
        matchInfo.appendChild(vs);
        
        const instructions = document.createElement('div');
        instructions.className = 'mt-6';

        const controlsTitle = document.createElement('p');
        controlsTitle.className = 'font-semibold text-white mb-3';
        controlsTitle.textContent = 'Controls:';

        const player1Controls = document.createElement('p');
        player1Controls.className = 'text-gray-300';
        player1Controls.textContent = `${player1?.alias}: W (up) / S (down)`;

        const player2Controls = document.createElement('p');
        player2Controls.className = 'text-gray-300';
        player2Controls.textContent = `${player2?.alias}: Arrow Up / Arrow Down`;

        const winCondition = document.createElement('p');
        winCondition.className = 'mt-4 text-game-red font-bold text-lg';
        winCondition.textContent = 'First to 5 points wins!';

        instructions.appendChild(controlsTitle);
        instructions.appendChild(player1Controls);
        instructions.appendChild(player2Controls);
        instructions.appendChild(winCondition);
        matchInfo.appendChild(instructions);
        
        const canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.className = 'border-2 border-game-dark bg-black mx-auto my-8 rounded-xl block';
        canvas.style.width = '100%';
        canvas.style.maxWidth = '800px';
        canvas.style.height = 'auto';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center mt-6 flex justify-center gap-4';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Match';
        startButton.className = 'bg-game-red hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200';
        
        const pauseButton = document.createElement('button');
        pauseButton.textContent = 'Pause';
        pauseButton.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 hidden';
        
        const leaveButton = document.createElement('button');
        leaveButton.textContent = 'Leave Tournament';
        leaveButton.className = 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200';
        
        startButton.onclick = () => {
            this.currentGame = new PongGame(canvas);
            this.setupGameEndHandler(this.currentMatch!.id, player1!.id, player2!.id);
            this.currentGame.start();
            startButton.disabled = true;
            startButton.classList.add('opacity-50', 'cursor-not-allowed');
            pauseButton.classList.remove('hidden');
        };
        
        pauseButton.onclick = () => {
            if (this.currentGame) {
                const isPaused = this.currentGame.togglePause();
                pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
                pauseButton.className = `font-bold py-3 px-6 rounded-lg transition-colors duration-200 ${
                    isPaused 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`;
            }
        };
        
        leaveButton.onclick = () => {
            if (confirm('Are you sure you want to leave the tournament? This action cannot be undone.')) {
                this.cleanupCurrentGame();
                this.tournament = null;
                this.participants = [];
                this.matches = [];
                this.clearTournamentId(); // Clear storage
                window.location.href = '/';
            }
        };
        
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(pauseButton);
        buttonContainer.appendChild(leaveButton);
        
        const bracket = this.renderBracket();
        
        this.container.appendChild(title);
        this.container.appendChild(matchInfo);
        this.container.appendChild(canvas);
        this.container.appendChild(buttonContainer);
        this.container.appendChild(bracket);
    }

    private setupGameEndHandler(matchId: number, player1Id: number, player2Id: number): void {
        if (this.gameCheckInterval !== null) {
            clearInterval(this.gameCheckInterval);
        }

        this.gameCheckInterval = window.setInterval(() => {
            if (!this.currentGame) {
                if (this.gameCheckInterval !== null) {
                    clearInterval(this.gameCheckInterval);
                    this.gameCheckInterval = null;
                }
                return;
            }

            try {
                const score = (this.currentGame as any).getScore ? (this.currentGame as any).getScore() : (this.currentGame as any).score;
                if (score.player1 >= 5) {
                    this.handleMatchEnd(matchId, player1Id, score.player1, score.player2);
                } else if (score.player2 >= 5) {
                    this.handleMatchEnd(matchId, player2Id, score.player1, score.player2);
                }
            } catch (err) {
                if (this.gameCheckInterval !== null) {
                    clearInterval(this.gameCheckInterval);
                    this.gameCheckInterval = null;
                }
            }
        }, 100);
    }

    private handleMatchEnd(matchId: number, winnerId: number, score1: number, score2: number): void {
        if (this.gameCheckInterval !== null) {
            clearInterval(this.gameCheckInterval);
            this.gameCheckInterval = null;
        }

        if (this.currentGame) {
            setTimeout(async () => {
                let finalScore1 = score1;
                let finalScore2 = score2;
                try {
                    const s = (this.currentGame as any).getScore ? (this.currentGame as any).getScore() : (this.currentGame as any).score;
                    finalScore1 = finalScore1 ?? s.player1;
                    finalScore2 = finalScore2 ?? s.player2;
                } catch (e) {
                    // ignore
                }

                this.cleanupCurrentGame();
                
                try {
                    await TournamentAPI.recordMatchResult(matchId, winnerId, finalScore1, finalScore2);
                    await this.refreshTournamentData();
                } catch (error: any) {
                    alert(`Error recording match result: ${error.message}`);
                }
                
                setTimeout(() => {
                    this.updateUI();
                }, 2000);
            }, 3000);
        }
    }

    private async renderLobby(): Promise<void> {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        const title = document.createElement('h1');
        title.textContent = 'Welcome to the Tournament Lobby';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Join or create tournaments to compete with others!';
        subtitle.className = 'text-gray-300 text-lg mb-12 text-center';

        const createSection = document.createElement('div');
        createSection.className = 'text-gray-300 text-lg mb-12 text-center';

        const createTitile = document.createElement('h2');
        createTitile.textContent = 'Create a New Tournament';
        createTitile.className = 'text-2xl font-semibold text-white mb-4 text-center';

        const createButton = document.createElement('button');
        createButton.textContent = '➕ Create Tournament';
        createButton.className = 'btn-primary text-lg px-8 py-4 mx-auto block';
        createButton.onclick = () => this.renderSizeSelection();

        createSection.appendChild(createTitile);
        createSection.appendChild(createButton);

        const availableSection = document.createElement('div');
        availableSection.className = 'glass-effect p-8 rounded-2xl';

        const availableTitle = document.createElement('h2');
        availableTitle.textContent = 'Available Tournaments to Join';
        availableTitle.className = 'text-2xl font-semibold text-white mb-6 text-center';

        availableSection.appendChild(availableTitle);

        const loading = document.createElement('p');
        loading.textContent = 'Loading available tournaments...';
        loading.className = 'text-gray-400 text-center';
        availableSection.appendChild(loading);

        this.container.appendChild(title);
        this.container.appendChild(subtitle);
        this.container.appendChild(createSection);
        this.container.appendChild(availableSection);

        try {
            const tournaments = await TournamentAPI.getJoinableTournaments();
            availableSection.removeChild(loading);

            if (tournaments.length === 0) {
                const noTournaments = document.createElement('p');
                noTournaments.textContent = 'No available tournaments at the moment.';
                noTournaments.className = 'text-gray-400 text-center';
                availableSection.appendChild(noTournaments);
            } else {
                const tournamentsGrid = document.createElement('div');
                tournamentsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

                tournaments.forEach(tournament => {
                    const card = document.createElement('div');
                    card.className = 'bg-game-dark p-6 rounded-xl hover:bg-blue-700 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-accent-pink';
                    
                    const tournamentName = document.createElement('h3');
                    tournamentName.textContent = tournament.name;
                    tournamentName.className = 'text-xl font-bold text-white mb-3';
                    
                    const info = document.createElement('div');
                    info.className = 'space-y-2 text-gray-300 mb-4';
                    
                    const size = document.createElement('p');
                    size.innerHTML = `<span class="text-accent-pink">⚡</span> ${tournament.max_players}-Player Tournament`;
                    
                    const slots = document.createElement('p');
                    slots.innerHTML = `<span class="text-accent-purple">👥</span> ${tournament.available_slots} slot${tournament.available_slots > 1 ? 's' : ''} available`;
                    
                    const created = document.createElement('p');
                    const createdDate = new Date(tournament.created_at);
                    created.innerHTML = `<span class="text-blue-400">🕒</span> Created ${this.getTimeAgo(createdDate)}`;
                    
                    info.appendChild(size);
                    info.appendChild(slots);
                    info.appendChild(created);


                    const joinButton = document.createElement('button');
                    joinButton.textContent = 'Join Tournament';
                    joinButton.className = 'btn-primary w-full text-sm py-2';
                    joinButton.onclick = async (e) => {
                        e.stopPropagation();
                        await this.joinTournament(tournament);
                    };
                    
                    card.appendChild(tournamentName);
                    card.appendChild(info);
                    card.appendChild(joinButton);
                    
                    tournamentsGrid.appendChild(card);
                });

                availableSection.appendChild(tournamentsGrid);
            }

            const refreshButton = document.createElement('button');
            refreshButton.textContent = '🔄 Refresh';
            refreshButton.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 mt-6 mx-auto block';
            refreshButton.onclick = () => this.renderLobby();
            availableSection.appendChild(refreshButton);

        } catch (error: any) {
            availableSection.removeChild(loading);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = `Error: ${error.message}`;
            errorMsg.className = 'text-red-500 text-center';
            availableSection.appendChild(errorMsg);
        }
    }

    private getTimeAgo(date: Date): string {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }

    private async joinTournament(tournament: Tournament): Promise<void> {
        const alias = prompt('Enter your player alias:');
        if (!alias || alias.trim().length === 0) {
            return ;
        }

        if (alias.length > 20) {
            alert('Alias must be 20 characters or less.');
            return ;
        }

        if (!/^[a-zA-Z0-9\s_-]+$/.test(alias)) {
            alert('Alias can only contain letters, numbers, spaces, underscores, and hyphens.');
            return ;
        }
        try {
            this.tournament = tournament;
            this.saveTournamentId(tournament.id); // Save to storage
            await TournamentAPI.addPlayer(tournament.id, alias.trim());
            await this.refreshTournamentData();
            await this.updateUI();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
            this.tournament = null;
            this.clearTournamentId(); // Clear on error
        }
    }


    private renderBracket(): HTMLElement {
        const bracket = document.createElement('div');
        bracket.className = 'bg-game-dark p-8 rounded-lg mt-8 overflow-x-auto';

        const title = document.createElement('h3');
        title.textContent = 'Tournament Bracket';
        title.className = 'text-2xl font-semibold text-white mb-6';
        bracket.appendChild(title);

        // Group matches by round
        const rounds: { [round: number]: Match[] } = {};
        this.matches.forEach(match => {
            if (!rounds[match.round]) {
                rounds[match.round] = [];
            }
            rounds[match.round].push(match);
        });

        const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

        const roundsContainer = document.createElement('div');
        roundsContainer.className = 'flex gap-6 items-start';

        const formatSourceLabel = (sourceId?: number | null) => {
            if (!sourceId) return 'TBD';
            const sourceMatch = this.matches.find(m => m.id === sourceId);
            if (!sourceMatch) return 'TBD';
            return `Winner R${sourceMatch.round} M${sourceMatch.match_number}`;
        };

        roundNumbers.forEach(round => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'min-w-[220px]';

            const roundTitle = document.createElement('h4');
            roundTitle.textContent = `Round ${round}`;
            roundTitle.className = 'text-game-red text-xl mb-4 font-bold';
            roundDiv.appendChild(roundTitle);

            const matchesCol = document.createElement('div');
            matchesCol.className = 'flex flex-col gap-4';

            rounds[round].forEach(match => {
                const matchDiv = document.createElement('div');
                matchDiv.className = `bg-game-dark p-3 rounded-lg transition-all duration-300 ${match.winner_id ? 'opacity-70' : 'hover:bg-blue-700'}`;

                const player1 = TournamentAPI.getPlayerFromMatch(match, this.participants, 1);
                const player2 = TournamentAPI.getPlayerFromMatch(match, this.participants, 2);

                const p1 = document.createElement('div');
                const p1Text = player1?.alias || (match.source_match_id_1 ? formatSourceLabel(match.source_match_id_1) : 'BYE');
                p1.textContent = p1Text;
                p1.className = `px-3 py-1 rounded ${match.winner_id === match.player1_id ? 'bg-game-red font-bold' : ''}`;

                const p2 = document.createElement('div');
                const p2Text = player2?.alias || (match.source_match_id_2 ? formatSourceLabel(match.source_match_id_2) : 'BYE');
                p2.textContent = p2Text;
                p2.className = `px-3 py-1 rounded mt-2 ${match.winner_id === match.player2_id ? 'bg-game-red font-bold' : ''}`;

                const meta = document.createElement('div');
                meta.className = 'text-xs text-gray-400 mt-2';
                meta.textContent = `Match ${match.match_number}`;

                matchDiv.appendChild(p1);
                matchDiv.appendChild(p2);
                matchDiv.appendChild(meta);
                matchesCol.appendChild(matchDiv);
            });

            roundDiv.appendChild(matchesCol);
            roundsContainer.appendChild(roundDiv);
        });

        bracket.appendChild(roundsContainer);
        return bracket;
    }

    private renderWaitingScreen(): void {
        if (!this.container) return;

        const title = document.createElement('h1');
        title.textContent = 'Preparing Next Match...';
        title.className = 'text-3xl font-bold text-white text-center gradient-text';
        
        const message = document.createElement('p');
        message.textContent = 'Please wait while the next match is being set up.';
        message.className = 'text-xl text-gray-300 text-center mt-8';
        
        const leaveButton = document.createElement('button');
        leaveButton.textContent = 'Leave Tournament';
        leaveButton.className = 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 mt-8';
        leaveButton.onclick = () => {
            if (confirm('Are you sure you want to leave the tournament? This action cannot be undone.')) {
                this.tournament = null;
                this.participants = [];
                this.matches = [];
                this.clearTournamentId(); // Clear storage
                window.location.href = '/';
            }
        };
        
        this.container.appendChild(title);
        this.container.appendChild(message);
        this.container.appendChild(leaveButton);
    }

    private async renderWinner(): Promise<void> {
        if (!this.container || !this.tournament) return;

        const winner = this.participants.find(p => p.id === this.tournament!.winner_id);
        
        const title = document.createElement('h1');
        title.textContent = 'Tournament Complete! 🏆';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';
        
        const winnerCard = document.createElement('div');
        winnerCard.className = 'glass-effect p-12 rounded-2xl mx-auto text-center max-w-2xl border-4 border-game-red';
        
        const winnerTitle = document.createElement('h2');
        winnerTitle.textContent = 'Champion';
        winnerTitle.className = 'text-game-red text-3xl mb-4 font-bold';
        
        const winnerName = document.createElement('h3');
        winnerName.textContent = winner?.alias || 'Unknown';
        winnerName.className = 'text-5xl text-blue-400 mb-8 font-bold gradient-text';
        
        const trophy = document.createElement('div');
        trophy.textContent = '🏆';
        trophy.className = 'text-8xl';
        
        winnerCard.appendChild(winnerTitle);
        winnerCard.appendChild(winnerName);
        winnerCard.appendChild(trophy);
        
        const bracket = this.renderBracket();
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center mt-8 flex flex-col sm:flex-row gap-4 justify-center';
        
        const newTournamentBtn = document.createElement('button');
        newTournamentBtn.textContent = 'New Tournament';
        newTournamentBtn.className = 'btn-primary text-lg px-8 py-4';
        newTournamentBtn.onclick = () => {
            this.tournament = null;
            this.participants = [];
            this.matches = [];
            this.currentMatch = null;
            this.clearTournamentId(); // Clear storage
            this.updateUI();
        };
        
        const homeBtn = document.createElement('button');
        homeBtn.textContent = 'Back to Home';
        homeBtn.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold text-lg py-4 px-8 rounded-lg transition-colors duration-300';
        homeBtn.onclick = () => {
            this.clearTournamentId(); // Clear storage
            window.location.href = '/';
        };
        
        buttonContainer.appendChild(newTournamentBtn);
        buttonContainer.appendChild(homeBtn);
        
        this.container.appendChild(title);
        this.container.appendChild(winnerCard);
        this.container.appendChild(bracket);
        this.container.appendChild(buttonContainer);
    }

    public cleanup(): void {
        this.cleanupCurrentGame();
        if (this.tournament && this.tournament.status === 'pending' && this.participants.length === 0) {
            TournamentAPI.deleteTournament(this.tournament.id).catch(err => {
                console.error('Error deleting tournament on cleanup:', err);
            });
            this.clearTournamentId(); // Clear storage
        }
    }

    private cleanupCurrentGame(): void {
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
