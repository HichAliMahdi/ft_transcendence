import { Tournament } from '../game/Tournament';
import { PongGame } from '../game/PongGame';

export class TournamentPage {
    private tournament: Tournament;
    private currentGame: PongGame | null = null;
    private container: HTMLElement | null = null;

    constructor() {
        this.tournament = new Tournament();
        this.tournament.setStateChangeCallback(() => this.updateUI());
    }

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container tournament-container';
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
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Register players for the tournament (minimum 2 players)';
        subtitle.style.marginBottom = '2rem';
        
        const registrationForm = document.createElement('div');
        registrationForm.className = 'registration-form';
        registrationForm.style.cssText = 'background: #16213e; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter player alias';
        input.maxLength = 20;
        input.style.cssText = 'padding: 0.75rem; font-size: 1rem; border: 2px solid #0f3460; border-radius: 4px; background: #1a1a2e; color: #eee; width: 300px;';
        
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Player';
        addButton.style.marginLeft = '1rem';
        addButton.onclick = () => {
            const alias = input.value.trim();
            if (alias) {
                const success = this.tournament.addPlayer(alias);
                if (success) {
                    input.value = '';
                    input.focus();
                } else {
                    alert('Player alias already exists or is invalid!');
                }
            }
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addButton.click();
            }
        });
        
        registrationForm.appendChild(input);
        registrationForm.appendChild(addButton);
        
        const playersList = document.createElement('div');
        playersList.className = 'players-list';
        playersList.style.cssText = 'background: #16213e; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;';
        
        const playersTitle = document.createElement('h3');
        playersTitle.textContent = `Registered Players (${this.tournament.getPlayers().length})`;
        playersTitle.style.marginBottom = '1rem';
        playersList.appendChild(playersTitle);
        
        const players = this.tournament.getPlayers();
        if (players.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No players registered yet';
            emptyMsg.style.color = '#888';
            playersList.appendChild(emptyMsg);
        } else {
            const ul = document.createElement('ul');
            ul.style.cssText = 'list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;';
            
            players.forEach(player => {
                const li = document.createElement('li');
                li.style.cssText = 'background: #0f3460; padding: 0.75rem 1rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;';
                
                const span = document.createElement('span');
                span.textContent = player.alias;
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.style.cssText = 'background: #e94560; padding: 0.25rem 0.5rem; font-size: 1.2rem; line-height: 1; min-width: auto;';
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
        startButton.style.fontSize = '1.2rem';
        startButton.style.padding = '1rem 2rem';
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

        const title = document.createElement('h1');
        title.textContent = `Round ${match.round} - Match ${match.matchNumber}`;
        
        const matchInfo = document.createElement('div');
        matchInfo.style.cssText = 'background: #16213e; padding: 2rem; border-radius: 8px; margin: 2rem 0; text-align: center;';
        
        const vs = document.createElement('h2');
        vs.style.cssText = 'font-size: 2rem; margin: 1rem 0;';
        vs.innerHTML = `
            <span style="color: #0f3460;">${match.player1?.alias || 'BYE'}</span>
            <span style="color: #888; margin: 0 1rem;">VS</span>
            <span style="color: #e94560;">${match.player2?.alias || 'BYE'}</span>
        `;
        matchInfo.appendChild(vs);
        
        const instructions = document.createElement('div');
        instructions.style.marginTop = '1.5rem';
        instructions.innerHTML = `
            <p><strong>Controls:</strong></p>
            <p>${match.player1?.alias}: W (up) / S (down)</p>
            <p>${match.player2?.alias}: Arrow Up / Arrow Down</p>
            <p style="margin-top: 1rem; color: #e94560;"><strong>First to 5 points wins!</strong></p>
        `;
        matchInfo.appendChild(instructions);
        
        const canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.cssText = 'border: 2px solid #0f3460; background: #000; margin: 2rem auto; display: block;';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'text-align: center; margin-top: 1rem;';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Match';
        startButton.onclick = () => {
            if (!this.currentGame) {
                this.currentGame = new PongGame(canvas);
                this.setupGameEndHandler(match.id, match.player1!.id, match.player2!.id);
            }
            this.currentGame.start();
            startButton.disabled = true;
        };
        
        buttonContainer.appendChild(startButton);
        
        const bracket = this.renderBracket();
        
        this.container.appendChild(title);
        this.container.appendChild(matchInfo);
        this.container.appendChild(canvas);
        this.container.appendChild(buttonContainer);
        this.container.appendChild(bracket);
        
        setTimeout(() => {
            startButton.click();
        }, 100);
    }

    private setupGameEndHandler(matchId: string, player1Id: string, player2Id: string): void {
        const checkGameEnd = () => {
            if (!this.currentGame) return;
            
            const score = (this.currentGame as any).score;
            if (score.player1 >= 5) {
                this.handleMatchEnd(matchId, player1Id);
            } else if (score.player2 >= 5) {
                this.handleMatchEnd(matchId, player2Id);
            } else {
                setTimeout(checkGameEnd, 100);
            }
        };
        
        setTimeout(checkGameEnd, 100);
    }
    
    private handleMatchEnd(matchId: string, winnerId: string): void {
        if (this.currentGame) {
            setTimeout(() => {
                this.currentGame?.destroy();
                this.currentGame = null;
                
                this.tournament.recordMatchWinner(matchId, winnerId);
                
                setTimeout(() => {
                    this.updateUI();
                }, 2000);
            }, 3000);
        }
    }

}