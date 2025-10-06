export class GamePage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <h1>Pong Game</h1>
            <p>Game implementation coming soon...</p>
            <canvas id="gameCanvas" width="800" height="600" style="border: 2px solid #0f3460; background: #000; margin-top: 2rem;"></canvas>
        `;
        return container;
    }
}