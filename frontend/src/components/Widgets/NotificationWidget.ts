import { AuthService } from '../game/AuthService';


export class NotificationWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private unreadCount = 0;
    private authWatcherId: number | null = null;

    mount(): void {
        // If already present, ensure polling runs only when authenticated
        const existing = document.getElementById('notification-widget-root');
        if (existing) {
            this.root = existing as HTMLElement;
            this.panel = this.root.querySelector('#notification-widget-panel') as HTMLElement | null;
            this.btn = this.root.querySelector('#notification-widget-btn') as HTMLElement | null;
            // Ensure global instance is set so other widgets can interact
            (window as any)._notificationWidget = this;
            if (AuthService.isAuthenticated()) this.startPolling();
            this.startAuthWatcher();
            return;
        }

        if (AuthService.isAuthenticated()) {
            this.createUI();
        } else {
            // wait for authentication before creating UI
            this.authWatcherId = window.setInterval(() => {
                if (AuthService.isAuthenticated()) {
                    if (this.authWatcherId) { clearInterval(this.authWatcherId); this.authWatcherId = null; }
                    this.createUI();
                }
            }, 1500) as unknown as number;
        }
        this.startAuthWatcher();
    }

    private startAuthWatcher(): void {
        if (this.authWatcherId) return;
        this.authWatcherId = window.setInterval(() => {
            if (!AuthService.isAuthenticated()) {
                if (this.root && document.body.contains(this.root)) {
                    this.unmount();
                }
            }
        }, 2000) as unknown as number;
    }

    private createUI(): void {
        this.root = document.createElement('div');
        this.root.id = 'notification-widget-root';
        this.root.style.position = 'fixed';
        this.root.style.bottom = '20px';
        this.root.style.right = '100px';
        this.root.style.zIndex = '10000';
        document.body.appendChild(this.root);

        // expose global reference so other widgets can interact with notification widget
        (window as any)._notificationWidget = this;

        this.btn = document.createElement('button');
        this.btn.id = 'notification-widget-btn';
        this.btn.title = 'Notifications';
        this.btn.className = 'bg-game-dark hover:bg-blue-800 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg relative';
        this.btn.style.cursor = 'pointer';
        this.btn.innerHTML = '🔔';
        this.btn.onclick = () => this.toggle();
        this.root.appendChild(this.btn);

        const badge = document.createElement('span');
        badge.id = 'notification-badge';
        badge.style.position = 'absolute';
        badge.style.top = '4px';
        badge.style.right = '4px';
        badge.style.background = '#ef4444';
        badge.style.color = '#fff';
        badge.style.borderRadius = '999px';
        badge.style.padding = '2px 6px';
        badge.style.fontSize = '12px';
        badge.style.display = 'none';
        this.btn.appendChild(badge);

        this.panel = document.createElement('div');
        this.panel.id = 'notification-widget-panel';
        this.panel.className = 'glass-effect p-4 rounded-2xl shadow-xl';
        this.panel.style.width = '360px';
        this.panel.style.maxHeight = '60vh';
        this.panel.style.overflow = 'auto';
        this.panel.style.marginBottom = '12px';
        this.panel.style.display = 'none';
        this.panel.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
        this.root.appendChild(this.panel);

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-3';
        
        const h = document.createElement('h4');
        h.textContent = 'Notifications';
        h.className = 'text-lg font-semibold text-white';
        header.appendChild(h);

        const clearAll = document.createElement('button');
        // left: refresh, right: clear all
        clearAll.textContent = 'Refresh';
        clearAll.className = 'text-sm text-gray-300 hover:text-white mr-3';
        clearAll.onclick = () => this.refreshNow();
        header.appendChild(clearAll);

        const markAllBtn = document.createElement('button');
        markAllBtn.textContent = 'Mark All Read';
        markAllBtn.className = 'text-sm text-green-300 hover:text-green-200 mr-3';
        markAllBtn.title = 'Mark all notifications as read';
        markAllBtn.onclick = async () => {
            try {
                await AuthService.markAllNotificationsRead();
                await this.refreshNow();
                // optional small feedback
                try { (window as any).app.showInfo('Notifications', 'All notifications marked as read'); } catch (e) {}
            } catch (err: any) {
                (window as any).app.showInfo('Error', AuthService.extractErrorMessage(err) || 'Failed to mark all as read');
            }
        };
        header.appendChild(markAllBtn);

        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.className = 'text-sm text-red-400 hover:text-red-200';
        clearAllBtn.title = 'Clear all notifications';
        clearAllBtn.onclick = async () => {
            try {
                const ok = await (window as any).app.confirm('Clear all notifications', 'Are you sure you want to delete all notifications? This cannot be undone.');
                if (!ok) return;
                await AuthService.clearNotifications();
                this.refreshNow();
            } catch (err: any) {
                await (window as any).app.showInfo('Clear failed', AuthService.extractErrorMessage(err) || 'Failed to clear notifications');
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

    // Close the panel without unmounting (used to avoid overlapping widgets)
    closePanel(): void {
        this.visible = false;
        if (this.panel) this.panel.style.display = 'none';
        if (this.btn) (this.btn as HTMLElement).classList.remove('bg-accent-pink');
    }

    private async fetchAndRender(): Promise<void> {
        const listEl = this.panel ? this.panel.querySelector('#notification-list') as HTMLElement | null : null;
        if (!listEl || !this.btn) return;
        
        listEl.innerHTML = '<p class="text-gray-400">Loading...</p>';
        
        try {
            const notifications = await AuthService.getNotifications();
            this.unreadCount = (notifications || []).filter((n: any) => n.is_read === 0).length;
            
            // Update badge
            const badge = this.btn.querySelector('#notification-badge') as HTMLElement | null;
            if (badge) {
                badge.style.display = this.unreadCount > 0 ? 'inline-block' : 'none';
                badge.textContent = String(this.unreadCount);
            }

            if (!notifications || notifications.length === 0) {
                listEl.innerHTML = '<p class="text-gray-400">No notifications</p>';
                return;
            }

            listEl.innerHTML = '';
            (notifications as any[]).forEach(n => {
                const row = document.createElement('div');
                row.className = 'p-2 rounded mb-2 flex justify-between gap-3 hover:bg-blue-800';
                
                // Left side: notification content
                const left = document.createElement('div');
                left.className = 'text-white text-sm';
                
                const payload = (() => {
                    try { 
                        return JSON.parse(n.payload || '{}'); 
                    } catch (e) { 
                        return n.payload; 
                    }
                })();
                
                if (n.type === 'friend_request') {
                    // prefer username when available, fallback to id
                    const senderName = (payload && (payload.senderUsername || payload.sender_name || payload.sender || null))
                        || (payload && payload.senderId ? `#${payload.senderId}` : 'Someone');

                    const titleLine = document.createElement('div');
                    titleLine.className = 'text-white font-medium';
                    const strong = document.createElement('strong');
                    strong.textContent = String(senderName);
                    titleLine.appendChild(strong);
                    titleLine.appendChild(document.createTextNode(' sent you a friend request'));

                    const timeLine = document.createElement('div');
                    timeLine.className = 'text-gray-400 text-xs mt-1';
                    timeLine.textContent = new Date(n.created_at).toLocaleString();

                    left.appendChild(titleLine);
                    left.appendChild(timeLine);
                } else {
                    left.textContent = (n.type || 'Notification') + ` • ${new Date(n.created_at).toLocaleString()}`;
                }
                
                // Right side: mark read button
                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-2';
                
                const markBtn = document.createElement('button');
                markBtn.className = 'bg-accent-pink text-white px-2 py-1 rounded text-sm';
                markBtn.textContent = n.is_read ? 'Read' : 'Mark read';
                markBtn.disabled = n.is_read;
                markBtn.onclick = async () => {
                    try {
                        await AuthService.markNotificationRead(n.id);
                        this.refreshNow();
                    } catch (err: any) {
                        (window as any).app.showInfo('Notification Error', AuthService.extractErrorMessage(err) || 'Failed to mark read');
                    }
                };
                
                const clearBtn = document.createElement('button');
                clearBtn.className = 'bg-game-dark text-white px-2 py-1 rounded text-sm';
                clearBtn.title = 'Delete notification';
                clearBtn.textContent = 'Clear';
                clearBtn.onclick = async () => {
                    try {
                        const ok = await (window as any).app.confirm('Delete notification', 'Are you sure you want to delete this notification?');
                        if (!ok) return;
                        await AuthService.deleteNotification(n.id);
                        this.refreshNow();
                    } catch (err: any) {
                        (window as any).app.showInfo('Delete failed', AuthService.extractErrorMessage(err) || 'Failed to delete notification');
                    }
                };
                
                actions.appendChild(markBtn);
                actions.appendChild(clearBtn);
                row.appendChild(left);
                row.appendChild(actions);
                listEl.appendChild(row);
            });
        } catch (err: any) {
            const msg = AuthService.extractErrorMessage(err) || 'Error loading notifications';
            listEl.innerHTML = `<p class="text-red-400">${msg}</p>`;
            console.error(err);
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

        this.panel.style.display = this.visible ? 'block' : 'none';
        (this.btn as HTMLElement).classList.toggle('bg-accent-pink', this.visible);
        
        if (this.visible) this.refreshNow();
    }


    async refreshNow(): Promise<void> {
        await this.fetchAndRender();
    }


    private startPolling(): void {
        if (this.intervalId) return;
        
        this.intervalId = window.setInterval(() => {
            if (this.visible) {
                this.refreshNow();
            } else {
                // Update badge count even when widget is closed
                (async () => {
                    try {
                        const notifications = await AuthService.getNotifications();
                        this.unreadCount = (notifications || []).filter((n: any) => n.is_read === 0).length;
                        const badge = this.btn?.querySelector('#notification-badge') as HTMLElement | null;
                        if (badge) {
                            badge.style.display = this.unreadCount > 0 ? 'inline-block' : 'none';
                            badge.textContent = String(this.unreadCount);
                        }
                    } catch (_) {
                        // Silent fail for background updates
                    }
                })();
            }
        }, 15000) as unknown as number;
    }

    unmount(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.authWatcherId) {
            clearInterval(this.authWatcherId);
            this.authWatcherId = null;
        }
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }
        // clean global reference if it points to this instance
        try {
            if ((window as any)._notificationWidget === this) delete (window as any)._notificationWidget;
        } catch (e) {}
        this.root = null;
        this.panel = null;
        this.btn = null;
    }
}
