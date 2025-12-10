import { AuthService } from '../game/AuthService';

export class StatusWidget {
    private container: HTMLElement | null = null;
    private statusSelector: HTMLElement | null = null;
    private authChangeHandler: ((e?: Event) => void) | null = null;

    render(parentElement: HTMLElement): void {
        const statusSection = document.createElement('div');
        statusSection.className = 'mb-6 pb-6 border-b border-gradient-to-r from-transparent via-white/20 to-transparent';

        const statusHeader = document.createElement('div');
        statusHeader.className = 'flex items-center justify-between mb-4';

        const myStatusLabel = document.createElement('h4');
        myStatusLabel.textContent = 'My Status';
        myStatusLabel.className = 'text-base font-bold text-white flex items-center gap-2';
        myStatusLabel.innerHTML = '<span class="text-accent-pink">●</span> My Status';
        statusHeader.appendChild(myStatusLabel);

        statusSection.appendChild(statusHeader);

        const statusSelector = document.createElement('div');
        statusSelector.className = 'grid grid-cols-2 gap-2';
        
        // Assign to this.statusSelector BEFORE using it
        this.statusSelector = statusSelector;

        const statuses: Array<{value: string; label: string; color: string; icon: string}> = [
            { value: 'Online', label: 'Online', color: '#22c55e', icon: '✓' },
            { value: 'Busy', label: 'Busy', color: '#ef4444', icon: '🚫' },
            { value: 'Away', label: 'Away', color: '#f59e0b', icon: '⏰' },
            { value: 'Offline', label: 'Offline', color: '#94a3b8', icon: '○' }
        ];

        const user = AuthService.getUser();
        const currentStatus = (user && (user as any).status) ? (user as any).status : 'Online';

        statuses.forEach(s => {
            const statusBtn = document.createElement('button');
            const isActive = currentStatus === s.value;
            statusBtn.className = `group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left ${isActive ? 'bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 ring-2 ring-accent-pink/50' : 'bg-white/5 hover:scale-105'}`;

            const dot = document.createElement('span');
            const glowClass = s.value !== 'Offline' && isActive ? 'shadow-[0_0_12px_currentColor] animate-pulse' : '';
            dot.className = `w-3 h-3 rounded-full inline-block ${glowClass} transition-all duration-300`;
            dot.style.backgroundColor = s.color;

            const content = document.createElement('div');
            content.className = 'flex-1';

            const label = document.createElement('span');
            label.className = `text-white text-sm font-medium ${isActive ? 'text-accent-pink' : ''}`;
            label.textContent = s.label;

            content.appendChild(label);
            statusBtn.appendChild(dot);
            statusBtn.appendChild(content);

            statusBtn.onclick = async () => {
                try {
                    await AuthService.setStatus(s.value as any);
                    
                    statusSelector.querySelectorAll('button').forEach(btn => {
                        btn.className = 'group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left bg-white/5 hover:scale-105';
                        const lbl = btn.querySelector('span:nth-child(2) span');
                        if (lbl) lbl.className = 'text-white text-sm font-medium';
                        const btnDot = btn.querySelector('span:first-child') as HTMLElement | null;
                        if (btnDot) {
                            btnDot.className = 'w-3 h-3 rounded-full inline-block transition-all duration-300';
                        }
                    });
                    
                    statusBtn.className = 'group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 ring-2 ring-accent-pink/50';
                    label.className = 'text-white text-sm font-medium text-accent-pink';
                    
                    if (s.value !== 'Offline') {
                        dot.className = 'w-3 h-3 rounded-full inline-block shadow-[0_0_12px_currentColor] animate-pulse transition-all duration-300';
                    } else {
                        dot.className = 'w-3 h-3 rounded-full inline-block transition-all duration-300';
                    }

                    const headerDot = document.getElementById('header-status-dot');
                    if (headerDot) {
                        headerDot.style.backgroundColor = s.color;
                        if (s.value !== 'Offline') {
                            headerDot.className = 'w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]';
                        } else {
                            headerDot.className = 'w-2 h-2 rounded-full';
                        }
                    }

                    window.dispatchEvent(new Event('auth:change'));
                } catch (err: any) {
                    await (window as any).app.showInfo('Status update failed', AuthService.extractErrorMessage(err) || String(err));
                }
            };

            statusSelector.appendChild(statusBtn);
        });

        statusSection.appendChild(statusSelector);
        parentElement.appendChild(statusSection);
        this.container = statusSection;

        // Listen for auth changes to update status display
        this.authChangeHandler = () => this.updateStatusDisplay();
        window.addEventListener('auth:change', this.authChangeHandler);
    }

    private updateStatusDisplay(): void {
        if (!this.statusSelector) return;

        const user = AuthService.getUser();
        const currentStatus = (user && (user as any).status) ? (user as any).status : 'Online';

        // Update all button states
        const buttons = this.statusSelector.querySelectorAll('button');
        buttons.forEach((btn, index) => {
            const statuses = ['Online', 'Busy', 'Away', 'Offline'];
            const statusValue = statuses[index];
            const isActive = currentStatus === statusValue;
            
            const dot = btn.querySelector('span:first-child') as HTMLElement | null;
            const label = btn.querySelector('span:nth-child(2) span') as HTMLElement | null;

            if (isActive) {
                btn.className = 'group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 ring-2 ring-accent-pink/50';
                if (label) label.className = 'text-white text-sm font-medium text-accent-pink';
                if (dot && statusValue !== 'Offline') {
                    dot.className = 'w-3 h-3 rounded-full inline-block shadow-[0_0_12px_currentColor] animate-pulse transition-all duration-300';
                } else if (dot) {
                    dot.className = 'w-3 h-3 rounded-full inline-block transition-all duration-300';
                }
            } else {
                btn.className = 'group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left bg-white/5 hover:scale-105';
                if (label) label.className = 'text-white text-sm font-medium';
                if (dot) {
                    dot.className = 'w-3 h-3 rounded-full inline-block transition-all duration-300';
                }
            }
        });
    }

    destroy(): void {
        if (this.authChangeHandler) {
            window.removeEventListener('auth:change', this.authChangeHandler);
            this.authChangeHandler = null;
        }
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        this.container = null;
        this.statusSelector = null;
    }
}
