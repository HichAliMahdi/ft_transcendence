import { AuthService } from '../game/AuthService';

export class NotificationWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private authChangeHandler: ((e?: Event) => void) | null = null;

    mount(): void {
        // Single stable auth change handler: mount on login, unmount on logout.
        if (!this.authChangeHandler) {
            this.authChangeHandler = () => {
                if (AuthService.isAuthenticated()) {
                    // Create UI if it doesn't exist
                    if (!this.root || !document.body.contains(this.root)) {
                        this.createUI();
                    }
                } else {
                    // IMMEDIATELY unmount when logged out (but keep the handler!)
                    if (this.root && document.body.contains(this.root)) {
                        // Only remove DOM elements, not the event listener
                        if (this.intervalId) {
                            clearInterval(this.intervalId);
                            this.intervalId = null;
                        }
                        if (this.root && document.body.contains(this.root)) {
                            document.body.removeChild(this.root);
                        }
                        if ((window as any)._notificationWidget === this) {
                            delete (window as any)._notificationWidget;
                        }
                        this.root = null;
                        this.panel = null;
                        this.btn = null;
                    }
                }
            };
            window.addEventListener('auth:change', this.authChangeHandler);
        }

        // If already present, ensure polling runs only when authenticated
        const existing = document.getElementById('notification-widget-root');
        if (existing) {
            this.root = existing as HTMLElement;
            this.panel = this.root.querySelector('#notification-widget-panel') as HTMLElement | null;
            this.btn = this.root.querySelector('#notification-widget-btn') as HTMLElement | null;
            // Ensure global instance is set so other widgets can interact
            (window as any)._notificationWidget = this;
            if (AuthService.isAuthenticated()) this.startPolling();
            else {
                // Remove if not authenticated but keep listener
                if (document.body.contains(existing)) {
                    document.body.removeChild(existing);
                }
                this.root = null;
                this.panel = null;
                this.btn = null;
            }
            return;
        }

        if (AuthService.isAuthenticated()) {
            this.createUI();
        }
        // No need for polling to check auth - auth:change event will handle it
    }

    private createUI(): void {
        this.root = document.createElement('div');
        this.root.id = 'notification-widget-root';
        this.root.className = 'fixed bottom-5 right-24 z-[9999]';
        document.body.appendChild(this.root);

        // expose global reference so other widgets can interact with notification widget
        (window as any)._notificationWidget = this;

        this.btn = document.createElement('button');
        this.btn.id = 'notification-widget-btn';
        this.btn.title = 'Notifications';
        this.btn.className = 'bg-game-dark hover:bg-blue-800 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg relative cursor-pointer text-xl z-10';
        this.btn.innerHTML = '🔔';
        this.btn.onclick = () => this.toggle();
        this.root.appendChild(this.btn);

        const badge = document.createElement('span');
        badge.id = 'notification-badge';
        badge.className = 'absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs hidden min-w-[20px] text-center';
        this.btn.appendChild(badge);

        this.panel = document.createElement('div');
        this.panel.id = 'notification-widget-panel';
        this.panel.className = 'glass-effect p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] w-[360px] max-h-[60vh] overflow-auto absolute bottom-16 right-0 hidden';
        this.root.appendChild(this.panel);

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-3';
        const h = document.createElement('h4');
        h.textContent = 'Notifications';
        h.className = 'text-lg font-semibold text-white';
        header.appendChild(h);

        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.className = 'text-sm text-gray-400 hover:text-white transition-colors';
        clearAllBtn.onclick = async () => {
            try {
                await AuthService.clearNotifications();
                this.refreshNow();
            } catch (err: any) {
                console.error('Failed to clear notifications:', err);
            }
        };
        header.appendChild(clearAllBtn);

        this.panel.appendChild(header);

        const list = document.createElement('div');
        list.id = 'notification-list';
        this.panel.appendChild(list);

        this.refreshNow();
        this.startPolling();
    }

    closePanel(): void {
        this.visible = false;
        if (this.panel) {
            this.panel.classList.remove('block');
            this.panel.classList.add('hidden');
        }
        if (this.btn) {
            this.btn.classList.remove('bg-accent-pink');
        }
    }

    toggle(): void {
        this.visible = !this.visible;
        if (!this.panel || !this.btn) return;
        
        // If opening, ask friend widget to close its panel to avoid overlap
        if (this.visible) {
            const fw = (window as any)._friendWidget;
            if (fw && fw !== this && typeof fw.closePanel === 'function') {
                try { fw.closePanel(); } catch (e) { /* ignore */ }
            }
        }

        if (this.visible) {
            this.panel.classList.remove('hidden');
            this.panel.classList.add('block');
        } else {
            this.panel.classList.remove('block');
            this.panel.classList.add('hidden');
        }
        
        this.btn.classList.toggle('bg-accent-pink', this.visible);
        
        if (this.visible) this.refreshNow();
    }

    async refreshNow(): Promise<void> {
        await this.fetchAndRender();
    }

    private async fetchAndRender(): Promise<void> {
        const listEl = this.panel ? this.panel.querySelector('#notification-list') as HTMLElement | null : null;
        if (!listEl) return;

        listEl.innerHTML = '<p class="text-gray-400 text-center py-2">Loading...</p>';

        try {
            const notifications = await AuthService.getNotifications();
            
            // Update badge
            const badge = document.getElementById('notification-badge');
            if (badge) {
                const unreadCount = notifications.filter(n => !n.is_read).length;
                if (unreadCount > 0) {
                    badge.textContent = String(unreadCount);
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            if (!notifications || notifications.length === 0) {
                listEl.innerHTML = '<p class="text-gray-400 text-center py-4">No notifications</p>';
                return;
            }

            listEl.innerHTML = '';
            notifications.forEach(notif => {
                const item = document.createElement('div');
                item.className = `p-3 rounded-lg mb-2 transition-colors cursor-pointer ${
                    notif.is_read ? 'bg-game-dark/30' : 'bg-blue-900/40'
                }`;
                
                const content = document.createElement('div');
                content.className = 'flex items-start gap-3';

                const icon = document.createElement('span');
                icon.className = 'text-2xl';
                icon.textContent = notif.type === 'friend_request' ? '👤' : 
                                   notif.type === 'game_invite' ? '🎮' : 
                                   notif.type === 'tournament' ? '🏆' : '📢';
                
                const textContainer = document.createElement('div');
                textContainer.className = 'flex-1';

                const message = document.createElement('p');
                message.className = `text-sm ${notif.is_read ? 'text-gray-300' : 'text-white font-semibold'}`;
                
                // Extract message from payload or create a default message
                let messageText = '';
                try {
                    const payload = typeof notif.payload === 'string' ? JSON.parse(notif.payload) : notif.payload;
                    messageText = payload?.message || `New ${notif.type.replace('_', ' ')}`;
                } catch {
                    messageText = `New ${notif.type.replace('_', ' ')}`;
                }
                message.textContent = messageText;

                const time = document.createElement('p');
                time.className = 'text-xs text-gray-500 mt-1';
                time.textContent = this.formatTime(notif.created_at);

                textContainer.appendChild(message);
                textContainer.appendChild(time);
                content.appendChild(icon);
                content.appendChild(textContainer);

                if (!notif.is_read) {
                    const dot = document.createElement('span');
                    dot.className = 'w-2 h-2 bg-blue-500 rounded-full';
                    content.appendChild(dot);
                }

                item.appendChild(content);
                
                item.onclick = async () => {
                    if (!notif.is_read) {
                        try {
                            await AuthService.markNotificationRead(notif.id);
                            this.refreshNow();
                        } catch (err) {
                            console.error('Failed to mark notification as read:', err);
                        }
                    }
                };

                listEl.appendChild(item);
            });
        } catch (err) {
            listEl.innerHTML = '<p class="text-red-400 text-center py-2">Error loading notifications</p>';
            console.error(err);
        }
    }

    private formatTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    private startPolling(): void {
        if (this.intervalId) return;
        
        this.intervalId = window.setInterval(() => {
            if (!this.visible) {
                this.fetchAndRender();
            }
        }, 30000) as unknown as number;
    }

    unmount(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        if (this.authChangeHandler) {
            window.removeEventListener('auth:change', this.authChangeHandler);
            this.authChangeHandler = null;
        }
        
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }

        try {
            if ((window as any)._notificationWidget === this) delete (window as any)._notificationWidget;
        } catch (e) {}
        
        this.root = null;
        this.panel = null;
        this.btn = null;
    }
}
