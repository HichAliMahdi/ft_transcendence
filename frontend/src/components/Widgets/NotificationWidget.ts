import { AuthService } from '../game/AuthService';


export class NotificationWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private unreadCount = 0;

    mount(): void {
        if (document.getElementById('notification-widget-root')) return;

        this.root = document.createElement('div');
        this.root.id = 'notification-widget-root';
        this.root.style.position = 'fixed';
        this.root.style.bottom = '20px';
        this.root.style.right = '100px';
        this.root.style.zIndex = '10000';
        document.body.appendChild(this.root);

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
        clearAll.textContent = 'Refresh';
        clearAll.className = 'text-sm text-gray-300 hover:text-white';
        clearAll.onclick = () => this.refreshNow();
        header.appendChild(clearAll);

        this.panel.appendChild(header);

        const list = document.createElement('div');
        list.id = 'notification-list';
        this.panel.appendChild(list);

        this.refreshNow();
        this.startPolling();
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
                
                let text = '';
                if (n.type === 'friend_request') {
                    const senderId = payload?.senderId;
                    text = `Friend request`;
                    if (senderId) text += ` (from user #${senderId})`;
                } else {
                    text = n.type || 'Notification';
                }
                
                left.textContent = text + ` • ${new Date(n.created_at).toLocaleString()}`;
                
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
                        alert('Failed to mark read');
                    }
                };
                
                actions.appendChild(markBtn);
                row.appendChild(left);
                row.appendChild(actions);
                listEl.appendChild(row);
            });
        } catch (err) {
            listEl.innerHTML = '<p class="text-red-400">Error loading notifications</p>';
            console.error(err);
        }
    }

    toggle(): void {
        this.visible = !this.visible;
        if (!this.panel || !this.btn) return;
        
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
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }
        this.root = null;
        this.panel = null;
        this.btn = null;
    }
}
