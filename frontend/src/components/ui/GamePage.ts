import { PongGame } from '../game/PongGame';

type GameMode = 'pvp' | 'pve';
type AIDifficulty = 'easy' | 'medium' | 'hard';

export class GamePage {
    private game: PongGame | null = null;
    private selectedMode: GameMode = 'pvp';
    private selectedDifficulty: AIDifficulty = 'medium';
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container';
        
        this.renderModeSelection();
        
        return this.container;
    }

    private renderModeSelection(): void {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        const title = document.createElement('h1');
        title.textContent = 'Pong Game';
        title.style.textAlign = 'center';
        title.style.marginBottom = '2rem';
        
        // Mode selection
        const modeSection = document.createElement('div');
        modeSection.style.cssText = 'background: rgba(255, 255, 255, 0.05); padding: 2rem; border-radius: 12px; margin-bottom: 2rem;';
        
        const modeTitle = document.createElement('h2');
        modeTitle.textContent = 'Select Game Mode';
        modeTitle.style.marginBottom = '1.5rem';
        
        const modeButtons = document.createElement('div');
        modeButtons.style.cssText = 'display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;';
        
        // PvP Button
        const pvpButton = document.createElement('button');
        pvpButton.textContent = '👥 Player vs Player';
        pvpButton.style.cssText = 'padding: 1.5rem 2rem; font-size: 1.1rem; min-width: 220px;';
        pvpButton.onclick = () => {
            this.selectedMode = 'pvp';
            this.renderGameScreen();
        };
        
        // PvE Button
        const pveButton = document.createElement('button');
        pveButton.textContent = '🤖 Player vs AI';
        pveButton.style.cssText = 'padding: 1.5rem 2rem; font-size: 1.1rem; min-width: 220px;';
        pveButton.onclick = () => {
            this.selectedMode = 'pve';
            this.renderDifficultySelection();
        };
        
        modeButtons.appendChild(pvpButton);
        modeButtons.appendChild(pveButton);
        
        modeSection.appendChild(modeTitle);
        modeSection.appendChild(modeButtons);
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = 'background: rgba(255, 255, 255, 0.03); padding: 1.5rem; border-radius: 12px; margin-top: 2rem;';
        instructions.innerHTML = `
            <h3 style="margin-bottom: 1rem;">Game Rules</h3>
            <ul style="line-height: 1.8;">
                <li><strong>PvP Mode:</strong> Two players compete on the same keyboard</li>
                <li><strong>PvE Mode:</strong> Challenge the AI at different difficulty levels</li>
                <li><strong>Goal:</strong> First to 5 points wins!</li>
                <li><strong>Player 1 Controls:</strong> W (up) / S (down)</li>
                <li><strong>Player 2 Controls:</strong> Arrow Up / Arrow Down (PvP only)</li>
            </ul>
        `;
        
        this.container.appendChild(title);
        this.container.appendChild(modeSection);
        this.container.appendChild(instructions);
    }

    private renderDifficultySelection(): void {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        const title = document.createElement('h1');
        title.textContent = 'Select AI Difficulty';
        title.style.textAlign = 'center';
        title.style.marginBottom = '2rem';
        
        const difficultySection = document.createElement('div');
        difficultySection.style.cssText = 'background: rgba(255, 255, 255, 0.05); padding: 2rem; border-radius: 12px;';
        
        const difficultyButtons = document.createElement('div');
        difficultyButtons.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;';
        
        const difficulties: { level: AIDifficulty; emoji: string; description: string }[] = [
            { level: 'easy', emoji: '😊', description: 'Relaxed gameplay - AI is slow and makes mistakes' },
            { level: 'medium', emoji: '😎', description: 'Balanced challenge - AI is competent but beatable' },
            { level: 'hard', emoji: '😤', description: 'Intense challenge - AI is fast and accurate' }
        ];
        
        difficulties.forEach(({ level, emoji, description }) => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255, 255, 255, 0.08); padding: 1.5rem; border-radius: 8px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent;';
            card.onmouseover = () => {
                card.style.borderColor = '#ff6ec4';
                card.style.transform = 'translateY(-5px)';
            };
            card.onmouseout = () => {
                card.style.borderColor = 'transparent';
                card.style.transform = 'translateY(0)';
            };
            card.onclick = () => {
                this.selectedDifficulty = level;
                this.renderGameScreen();
            };
            
            card.innerHTML = `
                <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">${emoji}</div>
                <h3 style="text-align: center; margin-bottom: 0.5rem; text-transform: capitalize;">${level}</h3>
                <p style="text-align: center; font-size: 0.9rem; color: #ccc;">${description}</p>
            `;
            
            difficultyButtons.appendChild(card);
        });
        
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Mode Selection';
        backButton.style.cssText = 'background: #0f3460; margin-top: 1rem;';
        backButton.onclick = () => this.renderModeSelection();
        
        difficultySection.appendChild(difficultyButtons);
        difficultySection.appendChild(backButton);
        
        this.container.appendChild(title);
        this.container.appendChild(difficultySection);
    }

    private renderGameScreen(): void {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        const title = document.createElement('h1');
        title.textContent = this.selectedMode === 'pvp' 
            ? 'Player vs Player' 
            : `Player vs AI (${this.selectedDifficulty})`;
        title.style.textAlign = 'center';
        title.style.marginBottom = '1rem';
        
        const instructions = document.createElement('div');
        instructions.style.cssText = 'text-align: center; margin-bottom: 1.5rem;';
        instructions.innerHTML = `
            <p><strong>Controls:</strong></p>
            <p>Player 1: W (up) / S (down)</p>
            ${this.selectedMode === 'pvp' ? '<p>Player 2: Arrow Up / Arrow Down</p>' : '<p>AI controls Player 2</p>'}
            <p style="color: #e94560; font-weight: bold; margin-top: 0.5rem;">First to 5 points wins!</p>
        `;
        
        const canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.cssText = 'border: 2px solid #0f3460; background: #000; margin: 1rem auto; display: block; border-radius: 8px;';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'text-align: center; margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.onclick = () => {
            if (!this.game) {
                this.game = new PongGame(canvas, {
                    mode: this.selectedMode,
                    aiDifficulty: this.selectedDifficulty
                });
            }
            this.game.start();
            startButton.disabled = true;
            stopButton.disabled = false;
        };
        
        const stopButton = document.createElement('button');
        stopButton.textContent = 'Stop Game';
        stopButton.disabled = true;
        stopButton.style.background = '#e94560';
        stopButton.onclick = () => {
            if (this.game) {
                this.game.stop();
            }
            startButton.disabled = false;
            stopButton.disabled = true;
        };
        
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Menu';
        backButton.style.background = '#0f3460';
        backButton.onclick = () => {
            this.cleanup();
            this.renderModeSelection();
        };
        
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(stopButton);
        buttonContainer.appendChild(backButton);
        
        this.container.appendChild(title);
        this.container.appendChild(instructions);
        this.container.appendChild(canvas);
        this.container.appendChild(buttonContainer);
    }
    
    public cleanup(): void {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }
}
