import { MultiplayerPongGame } from '../game/MultiPlayerPongGame';

export class MultiplayerPage {
    private game: MultiplayerPongGame | null = null;
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 fade-in';
        
        const title = document.createElement('h1');
        title.textContent = '4-Player Pong';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';
        
        const instructions = document.createElement('div');
        instructions.className = 'glass-effect p-8 rounded-2xl mb-8';
        
        const instructionsTitle = document.createElement('h2');
        instructionsTitle.textContent = 'How to Play';
        instructionsTitle.className = 'text-2xl font-semibold text-white mb-6 text-center';
        
        const instructionsList = document.createElement('div');
        instructionsList.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300';
        
        const players = [
            { name: 'Player 1 (Top)', controls: 'A (left) / D (right)', color: 'text-red-400' },
            { name: 'Player 2 (Right)', controls: 'Arrow Up / Arrow Down', color: 'text-purple-400' },
            { name: 'Player 3 (Bottom)', controls: 'J (left) / L (right)', color: 'text-pink-400' },
            { name: 'Player 4 (Left)', controls: 'W (up) / S (down)', color: 'text-blue-400' }
        ];
        
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'bg-game-dark p-4 rounded-xl';
            
            const playerName = document.createElement('h3');
            playerName.className = `text-xl font-bold mb-2 ${player.color}`;
            playerName.textContent = player.name;
            
            const playerControls = document.createElement('p');
            playerControls.className = 'text-lg';
            playerControls.textContent = player.controls;
            
            playerDiv.appendChild(playerName);
            playerDiv.appendChild(playerControls);
            instructionsList.appendChild(playerDiv);
        });
        
        const goal = document.createElement('div');
        goal.className = 'mt-6 text-center';
        
        const goalText = document.createElement('p');
        goalText.className = 'text-xl text-game-red font-bold';
        goalText.textContent = '🎯 First to 5 points wins!';
        
        const gameInfo = document.createElement('p');
        gameInfo.className = 'text-gray-400 mt-2';
        gameInfo.textContent = 'Score points when the ball passes through your opponents\' sides';
        
        goal.appendChild(goalText);
        goal.appendChild(gameInfo);
        
        instructions.appendChild(instructionsTitle);
        instructions.appendChild(instructionsList);
        instructions.appendChild(goal);
        
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'glass-effect rounded-2xl p-1 mb-8';
        
        const canvas = document.createElement('canvas');
        canvas.id = 'multiplayerCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.className = 'w-full rounded-xl bg-black';
        
        canvasContainer.appendChild(canvas);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center flex flex-col sm:flex-row gap-4 justify-center items-center';
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.className = 'btn-primary text-lg px-8 py-4';
        startButton.onclick = () => {
            if (!this.game) {
                this.game = new MultiplayerPongGame(canvas);
            }
            this.game.start();
            startButton.disabled = true;
            stopButton.disabled = false;
        };
        
        const stopButton = document.createElement('button');
        stopButton.textContent = 'Stop Game';
        stopButton.disabled = true;
        stopButton.className = 'bg-red-700 hover:bg-red-800 text-white font-bold text-lg py-4 px-8 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
        stopButton.onclick = () => {
            if (this.game) {
                this.game.stop();
            }
            startButton.disabled = false;
            stopButton.disabled = true;
        };
        
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Home';
        backButton.className = 'bg-game-dark hover:bg-blue-800 text-white font-bold text-lg py-4 px-8 rounded-lg transition-colors duration-300';
        backButton.onclick = () => {
            window.location.href = '/';
        };
        
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(stopButton);
        buttonContainer.appendChild(backButton);
        
        this.container.appendChild(title);
        this.container.appendChild(instructions);
        this.container.appendChild(canvasContainer);
        this.container.appendChild(buttonContainer);
        
        return this.container;
    }
    
    public cleanup(): void {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }
}
