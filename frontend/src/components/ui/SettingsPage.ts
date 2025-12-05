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

        // Profile Section
        const profileSection = document.createElement('div');
        profileSection.className = 'mb-8 pb-8 border-b border-white/10';

        const profileTitle = document.createElement('h2');
        profileTitle.className = 'text-2xl font-bold text-white mb-6';
        profileTitle.textContent = 'Profile Settings';

        const user = AuthService.getUser();
        
        // Display Name Section (with edit button)
        const displayNameContainer = document.createElement('div');
        displayNameContainer.className = 'mb-6';

        const displayNameLabel = document.createElement('label');
        displayNameLabel.className = 'block text-sm font-semibold text-gray-400 mb-2';
        displayNameLabel.textContent = 'Display Name';

        // View mode (default)
        const viewMode = document.createElement('div');
        viewMode.id = 'display-name-view';
        viewMode.className = 'flex items-center gap-3 px-4 py-3 rounded-lg bg-game-dark border-2 border-gray-600';

        const displayNameText = document.createElement('span');
        displayNameText.className = 'text-white font-semibold flex-1';
        displayNameText.textContent = user?.display_name || '';

        const editBtn = document.createElement('button');
        editBtn.className = 'text-gray-400 hover:text-accent-pink transition-colors duration-300 hover:scale-110 transform';
        editBtn.title = 'Edit display name';
        editBtn.innerHTML = '✏️';

        viewMode.appendChild(displayNameText);
        viewMode.appendChild(editBtn);

        // Edit mode (hidden by default)
        const editMode = document.createElement('div');
        editMode.id = 'display-name-edit';
        editMode.className = 'hidden';

        const editInputGroup = document.createElement('div');
        editInputGroup.className = 'flex gap-3';

        const displayNameInput = document.createElement('input');
        displayNameInput.type = 'text';
        displayNameInput.value = user?.display_name || '';
        displayNameInput.maxLength = 50;
        displayNameInput.className = 'flex-1 px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-accent-pink focus:outline-none transition-colors duration-300';
        displayNameInput.placeholder = 'Enter your display name';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn-primary px-6 py-3';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'px-6 py-3 rounded-lg bg-game-dark text-white hover:bg-gray-700 transition-colors duration-300';

        editInputGroup.appendChild(displayNameInput);
        editInputGroup.appendChild(saveBtn);
        editInputGroup.appendChild(cancelBtn);
        editMode.appendChild(editInputGroup);

        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mt-2 hidden';
        
        const successMsg = document.createElement('p');
        successMsg.className = 'text-green-500 text-sm mt-2 hidden';

        displayNameContainer.appendChild(displayNameLabel);
        displayNameContainer.appendChild(viewMode);
        displayNameContainer.appendChild(editMode);
        displayNameContainer.appendChild(errorMsg);
        displayNameContainer.appendChild(successMsg);

        // Toggle edit mode
        editBtn.onclick = () => {
            viewMode.classList.add('hidden');
            editMode.classList.remove('hidden');
            displayNameInput.value = user?.display_name || '';
            displayNameInput.focus();
            errorMsg.classList.add('hidden');
            successMsg.classList.add('hidden');
        };

        cancelBtn.onclick = () => {
            editMode.classList.add('hidden');
            viewMode.classList.remove('hidden');
            displayNameInput.value = user?.display_name || '';
            errorMsg.classList.add('hidden');
            successMsg.classList.add('hidden');
        };

        saveBtn.onclick = async () => {
            const newDisplayName = displayNameInput.value.trim();
            errorMsg.classList.add('hidden');
            successMsg.classList.add('hidden');

            if (!newDisplayName) {
                errorMsg.textContent = 'Display name cannot be empty';
                errorMsg.classList.remove('hidden');
                return;
            }

            if (newDisplayName === user?.display_name) {
                errorMsg.textContent = 'Display name is unchanged';
                errorMsg.classList.remove('hidden');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                await AuthService.updateDisplayName(newDisplayName);
                successMsg.textContent = 'Display name updated successfully!';
                successMsg.classList.remove('hidden');
                displayNameText.textContent = newDisplayName;
                
                // Switch back to view mode after 1 second
                setTimeout(() => {
                    editMode.classList.add('hidden');
                    viewMode.classList.remove('hidden');
                    successMsg.classList.add('hidden');
                    
                    // Trigger auth change to update UI everywhere
                    window.dispatchEvent(new Event('auth:change'));
                }, 1000);
            } catch (err: any) {
                errorMsg.textContent = AuthService.extractErrorMessage(err) || 'Failed to update display name';
                errorMsg.classList.remove('hidden');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        };

        // Allow Enter to save, Escape to cancel
        displayNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });

        // Read-only Account Info
        const accountInfoGrid = document.createElement('div');
        accountInfoGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-6';

        const createInfoCard = (label: string, value: string) => {
            const card = document.createElement('div');
            card.className = 'bg-game-dark p-4 rounded-lg';
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'text-sm text-gray-400 mb-1';
            labelDiv.textContent = label;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'text-white font-semibold';
            valueDiv.textContent = value;
            
            card.appendChild(labelDiv);
            card.appendChild(valueDiv);
            return card;
        };

        accountInfoGrid.appendChild(createInfoCard('Username', user?.username || 'N/A'));
        accountInfoGrid.appendChild(createInfoCard('Email', user?.email || 'N/A'));

        profileSection.appendChild(profileTitle);
        profileSection.appendChild(displayNameContainer);
        profileSection.appendChild(accountInfoGrid);

        // Placeholder sections for future settings
        const preferencesSection = document.createElement('div');
        preferencesSection.className = 'mb-8';
        preferencesSection.innerHTML = `
            <h2 class="text-2xl font-bold text-white mb-4">Preferences</h2>
            <div class="text-gray-400 text-center py-8">
                <p>⚙️ More settings coming soon...</p>
            </div>
        `;

        settingsCard.appendChild(profileSection);
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
