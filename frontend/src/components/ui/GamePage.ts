import { PongGame } from '../game/PongGame';
import { MultiplayerPongGame } from '../game/MultiPlayerPongGame';

export class GamePage {
    private game: PongGame | MultiplayerPongGame | null = null;
    private container: HTMLElement | null = null;
    private aiDifficultySelect: HTMLSelectElement | null = null;
    private aiDifficultyContainer: HTMLDivElement | null = null;
    private instructions: HTMLParagraphElement | null = null;

    render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'game-page fade-in';
        
        const mainContainer = document.createElement('div');
        mainContainer.className = 'max-w-6xl mx-auto';
        
        const title = document.createElement('h1');
        title.className = 'gradient-text text-4xl font-bold text-center mb-8';
        title.textContent = 'Play Pong';
        
        const modeCard = this.createModeSelectionCard();
        
        const canvasContainer = this.createCanvasContainer();
        
        const instructionsContainer = document.createElement('div');
        instructionsContainer.className = 'mt-6 text-center text-gray-300';
        
        this.instructions = document.createElement('p');
        this.instructions.className = 'text-lg';
        this.instructions.textContent = 'Use W/S and Arrow keys to control paddles';
        
        instructionsContainer.appendChild(this.instructions);
        
        mainContainer.appendChild(title);
        mainContainer.appendChild(modeCard);
        mainContainer.appendChild(canvasContainer);
        mainContainer.appendChild(instructionsContainer);
        
        this.container.appendChild(mainContainer);
        
        this.setupEventListeners();
        return this.container;
    }

    private createModeSelectionCard(): HTMLElement {
        const card = document.createElement('div');
        card.className = 'glass-effect rounded-2xl p-8 mb-8';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-4 mb-6';
        
        // PvP Button
        const pvpBtn = document.createElement('button');
        pvpBtn.id = 'pvp-btn';
        pvpBtn.className = 'btn-primary flex-1';
        pvpBtn.textContent = '1 vs 1';
        
        // PvE Button
        const pveBtn = document.createElement('button');
        pveBtn.id = 'pve-btn';
        pveBtn.className = 'btn-primary flex-1';
        pveBtn.textContent = 'vs AI';
        
        // Multiplayer Button
        const multiplayerBtn = document.createElement('button');
        multiplayerBtn.id = 'multiplayer-btn';
        multiplayerBtn.className = 'btn-primary flex-1 bg-game-red';
        multiplayerBtn.textContent = '4 Players';
        
        buttonContainer.appendChild(pvpBtn);
        buttonContainer.appendChild(pveBtn);
        buttonContainer.appendChild(multiplayerBtn);
        
        // AI Difficulty Selector
        this.aiDifficultyContainer = document.createElement('div');
        this.aiDifficultyContainer.className = 'hidden mb-4';
        
        const difficultyLabel = document.createElement('label');
        difficultyLabel.className = 'text-white mb-2 block';
        difficultyLabel.textContent = 'AI Difficulty:';
        
        this.aiDifficultySelect = document.createElement('select');
        this.aiDifficultySelect.id = 'ai-difficulty-select';
        this.aiDifficultySelect.className = 'w-full p-3 rounded-xl bg-white/10 text-white border border-white/20';
        
        const easyOption = document.createElement('option');
        easyOption.value = 'easy';
        easyOption.textContent = 'Easy';
        
        const mediumOption = document.createElement('option');
        mediumOption.value = 'medium';
        mediumOption.selected = true;
        mediumOption.textContent = 'Medium';
        
        const hardOption = document.createElement('option');
        hardOption.value = 'hard';
        hardOption.textContent = 'Hard';
        
        this.aiDifficultySelect.appendChild(easyOption);
        this.aiDifficultySelect.appendChild(mediumOption);
        this.aiDifficultySelect.appendChild(hardOption);
        
        this.aiDifficultyContainer.appendChild(difficultyLabel);
        this.aiDifficultyContainer.appendChild(this.aiDifficultySelect);
        
        card.appendChild(buttonContainer);
        card.appendChild(this.aiDifficultyContainer);
        
        return card;
    }

    private createCanvasContainer(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'glass-effect rounded-2xl p-1';
        
        const canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.className = 'w-full h-96 rounded-xl';
        
        container.appendChild(canvas);
        return container;
    }

    private setupEventListeners(): void {
        const pvpBtn = document.getElementById('pvp-btn') as HTMLButtonElement;
        const pveBtn = document.getElementById('pve-btn') as HTMLButtonElement;
        const multiplayerBtn = document.getElementById('multiplayer-btn') as HTMLButtonElement;

        pvpBtn.addEventListener('click', () => {
            this.startGame('pvp');
            this.hideAIDifficulty();
            this.setInstructions('Player 1: W/S | Player 2: Arrow Keys');
        });

        pveBtn.addEventListener('click', () => {
            this.showAIDifficulty();
        });

        multiplayerBtn.addEventListener('click', () => {
            this.startMultiplayerGame();
            this.hideAIDifficulty();
            this.setInstructions('P1: A/D (Top) | P2: ↑/↓ (Right) | P3: J/L (Bottom) | P4: W/S (Left)');
        });

        if (this.aiDifficultySelect) {
            this.aiDifficultySelect.addEventListener('change', () => {
                const difficulty = this.aiDifficultySelect?.value as 'easy' | 'medium' | 'hard';
                this.startGame('pve', difficulty);
            });
        }

        // Start with PvP by default
        this.startGame('pvp');
    }

    private startGame(mode: 'pvp' | 'pve', difficulty?: 'easy' | 'medium' | 'hard'): void {
        this.cleanup();

        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) return;

        const config = mode === 'pve' 
            ? { mode: 'pve' as const, aiDifficulty: difficulty } 
            : { mode: 'pvp' as const };
        this.game = new PongGame(canvas, config);
        this.game.start();
    }

    private startMultiplayerGame(): void {
        this.cleanup();

        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) return;

        this.game = new MultiplayerPongGame(canvas);
        this.game.start();
    }

    private showAIDifficulty(): void {
        if (this.aiDifficultyContainer) {
            this.aiDifficultyContainer.classList.remove('hidden');
        }
        const difficulty = this.aiDifficultySelect?.value as 'easy' | 'medium' | 'hard';
        this.startGame('pve', difficulty);
        this.setInstructions('Player: W/S | AI: Automatic');
    }

    private hideAIDifficulty(): void {
        if (this.aiDifficultyContainer) {
            this.aiDifficultyContainer.classList.add('hidden');
        }
    }

    private setInstructions(text: string): void {
        if (this.instructions) {
            this.instructions.textContent = text;
        }
    }

    private cleanup(): void {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }

    public destroy(): void {
        this.cleanup();
        this.container = null;
        this.aiDifficultySelect = null;
        this.aiDifficultyContainer = null;
        this.instructions = null;
    }
}
