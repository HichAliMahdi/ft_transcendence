import { Tournament } from '../game/Tournament';
import { PongGame } from '../game/PongGame';

export class TournamentPage {
    private tournament: Tournament;
    private currentGame: PongGame | null = null;
    private container: HTMLElement | null = null;
    private gameCheckInterval: number | null = null;

    constructor() {
        this.tournament = new Tournament();
        this.tournament.setStateChangeCallback(() => this.updateUI());
    }

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 tournament-container fade-in';
        this.updateUI();
        return this.container;
    }

    private updateUI(): void {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        const state = this.tournament.getState();

        if (!state.isActive && !state.isComplete) {
            this.renderRegistration();
        } else if (state.isActive && state.currentMatch) {
            this.renderMatch();
        } else if (state.isComplete) {
            this.renderWinner();
        } else if (state.isActive && !state.currentMatch) {
            this.renderWaitingScreen();
        }
    }
    private renderRegistration(): void {
        if (!this.container) return;

        const title = document.createElement('h1');
        title.textContent = 'Tournament Registration';
        title.className = 'text-4xl font-bold text-white mb-4 gradient-text';
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Register players for the tournament (minimum 2 players)';
        subtitle.className = 'text-gray-300 text-lg mb-8';
        
        const registrationForm = document.createElement('div');
        registrationForm.className = 'glass-effect p-8 rounded-2xl mb-8';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter player alias';
        input.maxLength = 20;
        input.className = 'px-4 py-3 text-lg border-2 border-blue-800 rounded-xl bg-primary-dark text-white w-full md:w-80 focus:outline-none focus:border-accent-pink transition-colors duration-300';

        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mt-2 hidden';
        errorMsg.id = 'alias-error';

        const addButton = document.createElement('button');
        addButton.textContent = 'Add Player';
        addButton.className = 'btn-primary ml-4';
        addButton.onclick = () => {
            const alias = input.value.trim();
            errorMsg.classList.add('hidden');
            if (!alias) {
                errorMsg.textContent = 'Please enter a player alias';
                errorMsg.classList.remove('hidden');
                return;
            }
            if (alias.length > 20) {
                errorMsg.textContent = 'Alias must be 20 characters or less';
                errorMsg.classList.remove('hidden');
                return;
            }
            if (!/^[a-zA-Z0-9\s_-]+$/.test(alias)) {
                errorMsg.textContent = 'Only letters, numbers, spaces, - and _ are allowed';
                errorMsg.classList.remove('hidden');
                return;
            }
            const success = this.tournament.addPlayer(alias);
            if (success) {
                input.value = '';
                input.focus();
            } else {
                errorMsg.textContent = 'This alias is already taken!';
                errorMsg.classList.remove('hidden');
            }
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addButton.click();
            }
        });

        const formContainer = document.createElement('div');
        formContainer.className = 'flex flex-col sm:flex-row gap-4 items-center justify-center';
        formContainer.appendChild(input);
        formContainer.appendChild(addButton);
        formContainer.appendChild(errorMsg);
        registrationForm.appendChild(formContainer);
        
        const playersList = document.createElement('div');
        playersList.className = 'glass-effect p-6 rounded-2xl mb-8';
        
        const playersTitle = document.createElement('h3');
        playersTitle.textContent = `Registered Players (${this.tournament.getPlayers().length})`;
        playersTitle.className = 'text-2xl font-semibold text-white mb-4';
        playersList.appendChild(playersTitle);
        
        const players = this.tournament.getPlayers();
        if (players.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No players registered yet';
            emptyMsg.className = 'text-white-500 text-center py-4';
            playersList.appendChild(emptyMsg);
        } else {
            const ul = document.createElement('ul');
            ul.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            
            players.forEach(player => {
                const li = document.createElement('li');
                li.className = 'bg-game-dark px-4 py-3 rounded-lg flex justify-between items-center transition-colors duration-300 hover:bg-blue-700';
                
                const span = document.createElement('span');
                span.textContent = player.alias;
                span.className = 'text-white font-medium';
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.className = 'bg-game-red hover:bg-red-600 text-white px-3 py-1 text-xl leading-none rounded-lg transition-colors duration-300';
                removeBtn.onclick = () => {
                    this.tournament.removePlayer(player.id);
                };
                
                li.appendChild(span);
                li.appendChild(removeBtn);
                ul.appendChild(li);
            });
            
            playersList.appendChild(ul);
        }
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Tournament';
        startButton.disabled = players.length < 2;
        startButton.className = `text-xl font-bold py-4 px-8 rounded-lg transition-colors duration-300 ${
            players.length >= 2 
                ? 'btn-primary' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`;
        startButton.onclick = () => {
            this.tournament.startTournament();
        };
        
        this.container.appendChild(title);
        this.container.appendChild(subtitle);
        this.container.appendChild(registrationForm);
        this.container.appendChild(playersList);
        this.container.appendChild(startButton);
    }

    private renderMatch(): void {
		if (!this.container) return;

		const match = this.tournament.getCurrentMatch();
		if (!match) return;

		// Clean up any existing game first
		this.cleanupCurrentGame();

		const title = document.createElement('h1');
		title.textContent = `Round ${match.round} - Match ${match.matchNumber}`;
		title.className = 'text-3xl font-bold text-white mb-6 gradient-text';
		
		const matchInfo = document.createElement('div');
		matchInfo.className = 'glass-effect p-8 rounded-2xl my-8 text-center';

		const vs = document.createElement('h2');
		vs.className = 'text-4xl my-4';

		const player1Span = document.createElement('span');
		player1Span.className = 'text-blue-400 font-bold';
		player1Span.textContent = match.player1?.alias || 'BYE';

		const vsText = document.createElement('span');
		vsText.className = 'text-gray-500 mx-6';
		vsText.textContent = 'VS';

		const player2Span = document.createElement('span');
		player2Span.className = 'text-game-red font-bold';
		player2Span.textContent = match.player2?.alias || 'BYE';
	
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
		player1Controls.textContent = `${match.player1?.alias}: W (up) / S (down)`;

		const player2Controls = document.createElement('p');
		player2Controls.className = 'text-gray-300';
		player2Controls.textContent = `${match.player2?.alias}: Arrow Up / Arrow Down`;

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
		
		startButton.onclick = () => {
			this.currentGame = new PongGame(canvas);
			this.setupGameEndHandler(match.id, match.player1!.id, match.player2!.id);
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
		
		buttonContainer.appendChild(startButton);
		buttonContainer.appendChild(pauseButton);
		
		const bracket = this.renderBracket();
		
		this.container.appendChild(title);
		this.container.appendChild(matchInfo);
		this.container.appendChild(canvas);
		this.container.appendChild(buttonContainer);
		this.container.appendChild(bracket);
	}

	private setupGameEndHandler(matchId: string, player1Id: string, player2Id: string): void {
		// Clear any existing interval
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

			// Use public getter to obtain score (PongGame.getScore)
			try {
				const score = (this.currentGame as any).getScore ? (this.currentGame as any).getScore() : (this.currentGame as any).score;
				if (score.player1 >= 5) {
					this.handleMatchEnd(matchId, player1Id);
				} else if (score.player2 >= 5) {
					this.handleMatchEnd(matchId, player2Id);
				}
			} catch (err) {
				// if something unexpected happens, stop checking
				if (this.gameCheckInterval !== null) {
					clearInterval(this.gameCheckInterval);
					this.gameCheckInterval = null;
				}
			}
		}, 100);
	}

	private handleMatchEnd(matchId: string, winnerId: string): void {
        // Clear the game check interval
        if (this.gameCheckInterval !== null) {
            clearInterval(this.gameCheckInterval);
            this.gameCheckInterval = null;
        }

        if (this.currentGame) {
            setTimeout(() => {
                this.cleanupCurrentGame();
                
                this.tournament.recordMatchWinner(matchId, winnerId);
                
                setTimeout(() => {
                    this.updateUI();
                }, 2000);
            }, 3000);
        }
    }

    private cleanupCurrentGame(): void {
        if (this.currentGame) {
            if (this.currentGame.isPauseActive()) {
                this.currentGame.togglePause(); // Ensure game is unpaused before destroying
            }
            this.currentGame.destroy();
            this.currentGame = null;
        }
        if (this.gameCheckInterval !== null) {
            clearInterval(this.gameCheckInterval);
            this.gameCheckInterval = null;
        }
    }

    private renderBracket(): HTMLElement {
        const bracket = document.createElement('div');
        bracket.className = 'bg-game-dark p-8 rounded-lg mt-8 overflow-x-auto';

        const title = document.createElement('h3');
        title.textContent = 'Tournament Bracket';
        title.className = 'text-2xl font-semibold text-white mb-6';
        bracket.appendChild(title);

        const rounds = this.tournament.getAllRounds();

        // Create a horizontal flex container where each round is a column
        const roundsContainer = document.createElement('div');
        roundsContainer.className = 'flex gap-6 items-start';

        const formatSourceLabel = (sourceId?: string) => {
            if (!sourceId) return 'TBD';
            const parts = sourceId.split('_'); // expected match_{round}_{num}
            if (parts.length >= 3) {
                return `Winner (R${parts[1]} M${parts[2]})`;
            }
            return `Winner (${sourceId})`;
        };

        rounds.forEach(round => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'min-w-[220px]';

            const roundTitle = document.createElement('h4');
            roundTitle.textContent = `Round ${round}`;
            roundTitle.className = 'text-game-red text-xl mb-4 font-bold';
            roundDiv.appendChild(roundTitle);

            const matches = this.tournament.getMatchesByRound(round);

            const matchesCol = document.createElement('div');
            matchesCol.className = 'flex flex-col gap-4';

            matches.forEach(match => {
                const matchDiv = document.createElement('div');
                matchDiv.className = `bg-game-dark p-3 rounded-lg transition-all duration-300 ${match.winner ? 'opacity-70' : 'hover:bg-blue-700'}`;

                const p1 = document.createElement('div');
                const p1Text = match.player1?.alias || (match.sourceMatch1 ? formatSourceLabel(match.sourceMatch1) : 'BYE');
                p1.textContent = p1Text;
                p1.className = `px-3 py-1 rounded ${match.winner?.id === match.player1?.id ? 'bg-game-red font-bold' : ''}`;

                const p2 = document.createElement('div');
                const p2Text = match.player2?.alias || (match.sourceMatch2 ? formatSourceLabel(match.sourceMatch2) : 'BYE');
                p2.textContent = p2Text;
                p2.className = `px-3 py-1 rounded mt-2 ${match.winner?.id === match.player2?.id ? 'bg-game-red font-bold' : ''}`;

                const meta = document.createElement('div');
                meta.className = 'text-xs text-gray-400 mt-2';
                meta.textContent = `Match ${match.matchNumber}`;

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
        
        this.container.appendChild(title);
        this.container.appendChild(message);
    }

    private renderWinner(): void {
        if (!this.container) return;

        const winner = this.tournament.getWinner();
        
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
            this.tournament.reset();
            this.updateUI();
        };
        
        const homeBtn = document.createElement('button');
        homeBtn.textContent = 'Back to Home';
        homeBtn.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold text-lg py-4 px-8 rounded-lg transition-colors duration-300';
        homeBtn.onclick = () => {
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
    }
}
