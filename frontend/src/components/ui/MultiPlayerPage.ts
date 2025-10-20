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
