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
    
}