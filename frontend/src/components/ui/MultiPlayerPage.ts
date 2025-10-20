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
        this.playerId = null;
        this.roomId = null;
        this.renderConnectionScreen();
    }

    public cleanup(): void {
        this.disconnect();
    }
}
