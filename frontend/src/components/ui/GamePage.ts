import { PongGame } from '../game/PongGame';

export class GamePage {
    private game: PongGame | null = null;

    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container';
        
        const title = document.createElement('h1');
        title.textContent = 'Pong Game';
        
        const instructions = document.createElement('div');
        instructions.style.marginBottom = '1rem';
        instructions.innerHTML = `
            <p><strong>Controls:</strong></p>
            <p>Player 1: W (up) / S (down)</p>
            <p>Player 2: Arrow Up / Arrow Down</p>
            <p><strong>First to 5 points wins!</strong></p>
        `;
        
        const canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.border = '2px solid #0f3460';
        canvas.style.background = '#000';
        canvas.style.marginTop = '1rem';
        canvas.style.display = 'block';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '1rem';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.onclick = () => {
            if (!this.game) {
                this.game = new PongGame(canvas);
            }
            this.game.start();
            startButton.disabled = true;
            stopButton.disabled = false;
        };
        
        const stopButton = document.createElement('button');
        stopButton.textContent = 'Stop Game';
        stopButton.disabled = true;
        stopButton.style.marginLeft = '1rem';
        stopButton.onclick = () => {
            if (this.game) {
                this.game.stop();
            }
            startButton.disabled = false;
            stopButton.disabled = true;
        };
        
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(stopButton);
        
        container.appendChild(title);
        container.appendChild(instructions);
        container.appendChild(canvas);
        container.appendChild(buttonContainer);
        
        return container;
    }
    
    public cleanup(): void {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }
}
