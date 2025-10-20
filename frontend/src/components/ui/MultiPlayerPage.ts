import { Onli, OnlinePongGame } from '../game/OnlinePongGame';

export class MultiplayerPage {
    private game: OnlinePongGame | null = null;
    private container: HTMLElement | null = null;
    private socket: WebSocket | null = null;
    private roomId: string | null = null;
    private status: 'disconnected' | 'connecting' | 'waiting' | 'playing' = 'disconnected';

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 fade-in'
        this.renderConnectionScreen();
        return this.container;
    }

    private renderConnectionScreen(): void {
        if (!this.container) return;
        this.container.innerHTML = '';

        const title = document.createElement('h1');
        title.textContent = 'Online Multiplayer';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        const connectionCard = document.createElement('div');
        connectionCard.className = 'glass-effect p-8 rounded-2xl max-w-md mx-auto';

        if (this.status === 'disconnected') {
            const connectButton = document.createElement('button');
            connectButton.textContent = 'Find Online Match';
            connectButton.className = 'btn-primary w-full text-lg py-4';
            connectButton.onclick = () => this.connectToServer();
            connectionCard.appendChild(connectButton);
        } else if (this.status === 'connecting') {
            const statusText = document.createElement('p');
            statusText.textContent = 'Connecting to server...';
            statusText.className = 'text-white text-center text-lg';

            const spinner = document.createElement('div');
            spinner.className = 'loader mx-auto my-4';

            connectionCard.appendChild(statusText);
            connectionCard.appendChild(spinner);
        } else if (this.status === 'waiting') {
            const statusText = document.createElement('p');
            statusText.textContent = 'Looking for opponent...';
            statusText.className = 'text-white text-center text-lg';

            const spinner = document.createElement('div');
            spinner.className = 'loader mx-auto my-4';

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.className = 'bg-game-red hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4';

            cancelButton.onclick = () => this.disconnect();
            connectionCard.appendChild(statusText);
            connectionCard.appendChild(spinner);
            connectionCard.appendChild(cancelButton);
        }
        const instructions = document.createElement('div');
        instructions.className = 'glass-effect p-6 rounded-2xl mt-8 max-w-2xl mx-auto';

        const instructionsTitle = document.createElement('h3');
        instructionsTitle.textContent = 'How to Play Online';
        instructionsTitle.className = 'text-xl font-semibold text-white mb-4 text-center';

        const instructionsList = document.createElement('ul');
        instructionsList.className = 'text-gray-300 space-y-2';

        const points = [
            'Click "Find Online Match" to search for an opponent',
            'You will be automatically paired with another player',
            'Control your paddle using W (up) and S (down) keys',
            'First to 5 points wins the match',
            'Game runs in real-time with your opponent'
        ];

        points.forEach(point => {
            const li = document.createElement('li');
            li.className = 'flex items-start';
            
            const bullet = document.createElement('span');
            bullet.textContent = '•';
            bullet.className = 'mr-2 text-accent-pink';
            
            li.appendChild(bullet);
            li.appendChild(document.createTextNode(point));
            instructionsList.appendChild(li);
        });

        instructions.appendChild(instructionsTitle);
        instructions.appendChild(instructionsList);

        this.container.appendChild(title);
        this.container.appendChild(connectionCard);
        this.container.appendChild(instructions);
    }

    private renderGameScreen(): void {
        if (!this.container) return;

        this.container.innerHTML = '';

        const title = document.createElement('h1');
        title.textContent = 'Online Match';
        title.className = 'text-3xl font-bold text-white text-center mb-4 gradient-text';

        const gameInfo = document.createElement('div');
        gameInfo.className = 'text-center mb-6 glass-effect p-4 rounded-xl';
        
        const roomInfo = document.createElement('p');
        roomInfo.textContent = `Room: ${this.roomId}`;
        roomInfo.className = 'text-gray-300 mb-2';

        const opponentInfo = document.createElement('p');
        opponentInfo.textContent = 'Opponent: Connected';
        opponentInfo.className = 'text-green-400 mb-2';

        const controlsInfo = document.createElement('p');
        controlsInfo.textContent = 'Controls: W (up) / S (down)';
        controlsInfo.className = 'text-gray-300';

        gameInfo.appendChild(roomInfo);
        gameInfo.appendChild(opponentInfo);
        gameInfo.appendChild(controlsInfo);

        const canvas = document.createElement('canvas');
        canvas.id = 'onlineGameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.className = 'border-2 border-game-dark bg-black mx-auto my-6 rounded-xl block';

        const disconnectButton = document.createElement('button');
        disconnectButton.textContent = 'Leave Game';
        disconnectButton.className = 'bg-game-red hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4';
        disconnectButton.onclick = () => this.disconnect();

        this.container.appendChild(title);
        this.container.appendChild(gameInfo);
        this.container.appendChild(canvas);
        this.container.appendChild(disconnectButton);
        this.game = new OnlinePongGame(canvas, this.socket!);
    }


    // For demo purposes, we'll simulate WebSocket connection
    // In a real implementation, connect to your WebSocket server created in backend
    private connectToServer(): void {
        this.status = 'connecting';
        this.renderConnectionScreen();

        setTimeout(() => {
            this.socket = this.createMockWebSocket();
            this.status = 'waiting';
            this.renderConnectionScreen();

            // Simulate finding a match after 2-5 seconds
            setTimeout(() => {
                this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
                this.roomId = 'room_' + Math.random().toString(36).substr(2, 9);
                this.status = 'playing';
                this.renderGameScreen();
            }, 2000 + Math.random() * 3000);
        }, 1000);
    }

    // This is a mock WebSocket for demonstration
    // In a real implementation, ze zill use actual WebSocket connection
    private createMockWebSocket(): WebSocket {
        const mockSocket = {
            send: (data: string) => {
                console.log('Sending:', data);
            },
            close: () => {
                console.log('Connection closed');
            }
        } as any;

        return mockSocket;
    }

    private disconnect(): void {
        if (this.socket) {
            this.socket.close();
        }
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
        this.status = 'disconnected';
        this.roomId = null;
        this.renderConnectionScreen();
    }

    public cleanup(): void {
        this.disconnect();
    }
}
