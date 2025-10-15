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
        this.container.className = 'container mx-auto p-8 fade-in';
        
        this.renderModeSelection();
        
        return this.container;
    }

    private renderModeSelection(): void {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        const title = document.createElement('h1');
        title.textContent = 'Pong Game';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';
        
        // Mode selection
        const modeSection = document.createElement('div');
        modeSection.className = 'glass-effect p-8 rounded-2xl mb-8';
        
        const modeTitle = document.createElement('h2');
        modeTitle.textContent = 'Select Game Mode';
        modeTitle.className = 'text-2xl font-semibold text-white mb-6 text-center';
        
        const modeButtons = document.createElement('div');
        modeButtons.className = 'flex flex-col sm:flex-row gap-6 justify-center items-center';
        
        // PvP Button
        const pvpButton = document.createElement('button');
        pvpButton.textContent = '👥 Player vs Player';
        pvpButton.className = 'btn-primary text-lg px-8 py-6 min-w-[250px]';
        pvpButton.onclick = () => {
            this.selectedMode = 'pvp';
            this.renderGameScreen();
        };
        
        // PvE Button
        const pveButton = document.createElement('button');
        pveButton.textContent = '🤖 Player vs AI';
        pveButton.className = 'btn-primary text-lg px-8 py-6 min-w-[250px]';
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
        instructions.className = 'glass-effect p-6 rounded-2xl mt-8';
        instructions.innerHTML = `
            <h3 class="text-xl font-semibold text-white mb-4">Game Rules</h3>
            <ul class="text-gray-300 leading-loose space-y-2">
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
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';
        
        const difficultySection = document.createElement('div');
        difficultySection.className = 'glass-effect p-8 rounded-2xl';
        
        const difficultyButtons = document.createElement('div');
        difficultyButtons.className = 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8';
        
        const difficulties: { level: AIDifficulty; emoji: string; description: string }[] = [
            { level: 'easy', emoji: '😊', description: 'Relaxed gameplay - AI is slow and makes mistakes' },
            { level: 'medium', emoji: '😎', description: 'Balanced challenge - AI is competent but beatable' },
            { level: 'hard', emoji: '😤', description: 'Intense challenge - AI is fast and accurate' }
        ];
        
        difficulties.forEach(({ level, emoji, description }) => {
            const card = document.createElement('div');
            card.className = 'glass-effect p-6 rounded-xl cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-accent-pink hover:-translate-y-2';
            card.onmouseover = () => {
                card.style.borderColor = '#ff6ec4';
                card.style.transform = 'translateY(-5px)';
            };
            card.onclick = () => {
                this.selectedDifficulty = level;
                this.renderGameScreen();
            };
            
            card.innerHTML = `
                <div class="text-6xl text-center mb-4">${emoji}</div>
                <h3 class="text-xl font-semibold text-white text-center mb-3 capitalize">${level}</h3>
                <p class="text-sm text-gray-300 text-center leading-relaxed">${description}</p>
            `;
            
            difficultyButtons.appendChild(card);
        });
        
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Mode Selection';
        backButton.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4';
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
        title.className = 'text-3xl font-bold text-white text-center mb-4 gradient-text';
        
        const instructions = document.createElement('div');
        instructions.className = 'text-center mb-6 glass-effect p-4 rounded-xl';
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
        canvas.className = 'border-2 border-game-dark bg-black mx-auto my-6 rounded-xl block';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.className = 'btn-primary disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none';
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
        stopButton.className = 'bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
        stopButton.onclick = () => {
            if (this.game) {
                this.game.stop();
            }
            startButton.disabled = false;
            stopButton.disabled = true;
        };
    
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Menu';
        backButton.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300';
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
