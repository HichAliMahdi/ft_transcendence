export class HomePage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container mx-auto p-8 text-center fade-in';

        const title = document.createElement('h1');
        title.className = 'text-5xl font-bold gradient-text mb-6';
        title.textContent = 'Welcome to PONG';

        const subtitle = document.createElement('p');
        subtitle.className = 'text-xl text-gray-300 mb-12';
        subtitle.textContent = 'The ultimate Pong tournament platform';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex flex-col sm:flex-row gap-6 justify-center items-center mt-12';

        const quickPlayButton = document.createElement('button');
        quickPlayButton.className = 'btn-primary text-lg px-8 py-4';
        quickPlayButton.textContent = 'Quick Play';
        quickPlayButton.onclick = () => {
            window.location.href = '/game';
        };
        const tournamentButton = document.createElement('button');
        tournamentButton.className = 'btn-primary text-lg px-8 py-4';
        tournamentButton.textContent = 'Start Tournament';
        tournamentButton.onclick = () => {
            window.location.href = '/tournament';
        }
        const multiplayerbutton = document.createElement('button');
        multiplayerbutton.className = 'btn-primary text-lg px-8 py-4';
        multiplayerbutton.textContent = 'Multiplayer';
        multiplayerbutton.onclick = () => {
            window.location.href = '/multiplayer';
        }
        buttonContainer.appendChild(quickPlayButton);
        buttonContainer.appendChild(tournamentButton);
        buttonContainer.appendChild(multiplayerbutton);

        container.appendChild(title);
        container.appendChild(subtitle);
        container.appendChild(buttonContainer);
        return container;
    }
}
