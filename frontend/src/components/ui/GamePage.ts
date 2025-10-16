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

        const title2 = document.createElement('h3');
        title2.className = 'text-xl font-semibold text-white mb-4';
        title2.textContent = 'Game Rules';

        const list = document.createElement('ul');
        list.className = 'text-gray-300 leading-loose space-y-2';

        const rules = [
            { label: 'PvP Mode:', text: 'Two players compete on the same keyboard' },
            { label: 'PvE Mode:', text: 'Challenge the AI at different difficulty levels' },
            { label: 'Goal:', text: 'First to 5 points wins!' },
            { label: 'Player 1 Controls:', text: 'W (up) / S (down)' },
            { label: 'Player 2 Controls:', text: 'Arrow Up / Arrow Down (PvP only)' }
        ];
        
        rules.forEach(rule => {
            const li = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = rule.label;
            li.appendChild(strong);
            li.appendChild(document.createTextNode(' ' + rule.text));
            list.appendChild(li);
        });
        instructions.appendChild(title2);
        instructions.appendChild(list);

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

            card.onmouseout = () => {
                card.style.borderColor = 'transparent';
                card.style.transform = 'translateY(0)';
            };

            card.onclick = () => {
                this.selectedDifficulty = level;
                this.renderGameScreen();
            };
            
            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'text-6xl text-center mb-4';
            emojiDiv.textContent = emoji;

            const levelTitle = document.createElement('h3');
            levelTitle.className = 'text-xl font-semibold text-white text-center mb-3 capitalize';
            levelTitle.textContent = level;

            const desc = document.createElement('p');
            desc.className = 'text-sm text-gray-300 text-center leading-relaxed';
            desc.textContent = description;

            card.appendChild(emojiDiv);
            card.appendChild(levelTitle);
            card.appendChild(desc);
            
            difficultyButtons.appendChild(card);
        });
        
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Mode Selection';
        backButton.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4 mx-auto';
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
        const controlsTitle = document.createElement('p');
        const strongTag = document.createElement('strong');
        strongTag.textContent = 'Controls:';
        controlsTitle.appendChild(strongTag);

        const player1Text = document.createElement('p');
        player1Text.textContent = 'Player 1: W (up) / S (down)';

        const player2Text = document.createElement('p');
        player2Text.textContent = this.selectedMode === 'pvp'
            ? 'Player 2: Arrow Up / Arrow Down' 
            : 'AI controls Player 2';

        const winText = document.createElement('p');
        winText.className = 'text-game-red font-bold mt-2';
        winText.textContent = 'First to 5 points wins!';

        instructions.appendChild(controlsTitle);
        instructions.appendChild(player1Text);
        instructions.appendChild(player2Text);
        instructions.appendChild(winText);
        
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
