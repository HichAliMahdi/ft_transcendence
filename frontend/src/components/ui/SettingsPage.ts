import { AuthService } from '../game/AuthService';

export class SettingsPage {
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 max-w-4xl fade-in';

        const title = document.createElement('h1');
        title.className = 'text-4xl font-bold text-white mb-8 gradient-text text-center';
        title.textContent = 'Settings';

        const settingsCard = document.createElement('div');
        settingsCard.className = 'glass-effect p-8 rounded-2xl';

        // User Info Section
        const userSection = document.createElement('div');
        userSection.className = 'mb-8 pb-8 border-b border-white/10';

        const userTitle = document.createElement('h2');
        userTitle.className = 'text-2xl font-bold text-white mb-4';
        userTitle.textContent = 'Account Information';

        const user = AuthService.getUser();
        
        const userInfo = document.createElement('div');
        userInfo.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
        userInfo.innerHTML = `
            <div class="bg-game-dark p-4 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Username</div>
                <div class="text-white font-semibold">${user?.username || 'N/A'}</div>
            </div>
            <div class="bg-game-dark p-4 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Display Name</div>
                <div class="text-white font-semibold">${user?.display_name || 'N/A'}</div>
            </div>
            <div class="bg-game-dark p-4 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Email</div>
                <div class="text-white font-semibold">${user?.email || 'N/A'}</div>
            </div>
            <div class="bg-game-dark p-4 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Status</div>
                <div class="text-white font-semibold">${(user as any)?.status || 'Online'}</div>
            </div>
        `;

        userSection.appendChild(userTitle);
        userSection.appendChild(userInfo);

        // Placeholder sections for future settings
        const preferencesSection = document.createElement('div');
        preferencesSection.className = 'mb-8';
        preferencesSection.innerHTML = `
            <h2 class="text-2xl font-bold text-white mb-4">Preferences</h2>
            <div class="text-gray-400 text-center py-8">
                <p>⚙️ More settings coming soon...</p>
            </div>
        `;

        settingsCard.appendChild(userSection);
        settingsCard.appendChild(preferencesSection);

        this.container.appendChild(title);
        this.container.appendChild(settingsCard);

        return this.container;
    }

    public cleanup(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
