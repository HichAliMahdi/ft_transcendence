export class HomePage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container mx-auto p-8 text-center fade-in';
        container.innerHTML = `
            <h1 class="text-5xl font-bold gradient-text mb-6">Welcome to PONG</h1>
            <p class="text-xl text-gray-300 mb-12">The ultimate Pong tournament platform</p>
            <div class="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
                <button class="btn-primary text-lg px-8 py-4" onclick="window.location.href='/game'">Quick Play</button>
                <button class="btn-primary text-lg px-8 py-4" onclick="window.location.href='/tournament'">Start Tournament</button>
            </div>
        `;
        return container;
    }
}
