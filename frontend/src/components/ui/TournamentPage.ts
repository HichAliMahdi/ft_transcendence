import { Tournament } from '../game/Tournament';
import { PongGame } from '../game/PongGame';

export class TournamentPage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <h1>Tournament</h1>
            <p>Tournament system coming soon...</p>
        `;
        return container;
    }
}
