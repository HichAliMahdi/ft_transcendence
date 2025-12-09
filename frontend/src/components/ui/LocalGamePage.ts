import { AuthService } from '../game/AuthService';
import { PongGame } from '../game/PongGame';

export class LocalGamePage {
    private game: PongGame | null = null;
    private container: HTMLElement | null = null;
    private statusRestored: boolean = false;

    public render(): HTMLElement {
        // Save current status and set to Busy when entering game
        try {
            AuthService.savePreviousStatus();
            AuthService.setStatus('Busy').catch(e => console.error('Failed to set Busy status:', e));
        } catch (e) {
            console.error('Failed to save/set status:', e);
        }

        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 fade-in';

        const title = document.createElement('h1');
        title.textContent = 'Local Game';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        const canvas = document.createElement('canvas');
        canvas.id = 'localGameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.className = 'border-2 border-game-dark bg-black mx-auto my-6 rounded-xl block';

        const disconnectButton = document.createElement('button');
        disconnectButton.textContent = 'Back to Menu';
        disconnectButton.className = 'bg-game-red hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4';
        disconnectButton.onclick = () => {
            AuthService.setStatus('Online').catch(e => console.error('Failed to set status to Online:', e));
            window.history.back();
        };

        this.container.appendChild(title);
        this.container.appendChild(canvas);
        this.container.appendChild(disconnectButton);

        // Initialize game engine
        this.game = new PongGame(canvas);

        return this.container;
    }

    public cleanup(): void {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }

        // Restore previous status when leaving game (only once)
        if (!this.statusRestored) {
            this.statusRestored = true;
            try {
                const previousStatus = AuthService.getPreviousStatus();
                AuthService.setStatus(previousStatus).catch(e => console.error('Failed to restore status:', e));
            } catch (e) {
                console.error('Failed to restore status:', e);
            }
        }
    }
}