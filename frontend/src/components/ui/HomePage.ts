export class HomePage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container';
        container.innerHTML = `
            <h1>Welcome to PONG</h1>
            <p>The ultimate Pong tournament platform</p>
            <div style="margin-top: 2rem;">
                <button onclick="window.location.href='/game'">Quick Play</button>
                <button onclick="window.location.href='/tournament'" style="margin-left: 1rem;">Start Tournament</button>
            </div>
        `;
        return container;
    }
}
