import { AuthService } from '../game/AuthService';

export class FriendWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private searchInput: HTMLInputElement | null = null;
    private searchBtn: HTMLButtonElement | null = null;
    private authWatcherId: number | null = null;


    mount(): void {
        // If already created (e.g., SSR or remount), reuse existing root elements
        const existing = document.getElementById('friend-widget-root');
        if (existing) {
            this.root = existing as HTMLElement;
            this.panel = this.root.querySelector('#friend-widget-panel') as HTMLElement | null;
            this.btn = this.root.querySelector('#friend-widget-btn') as HTMLElement | null;
            this.searchInput = this.root.querySelector('#friend-widget-search-input') as HTMLInputElement | null;
            this.searchBtn = this.root.querySelector('#friend-widget-search-btn') as HTMLButtonElement | null;
            // start background polling only if authenticated
            if (AuthService.isAuthenticated()) this.startPolling();
            // watch for auth changes to unmount on logout
            this.startAuthWatcher();
            return;
        }

        // Defer creating UI until user is authenticated
        if (AuthService.isAuthenticated()) {
            this.createUI();
        } else {
            // poll for auth; when authenticated create UI
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
        // ensure we unmount UI on logout
        if (this.authWatcherId) return;
        this.authWatcherId = window.setInterval(() => {
            if (!AuthService.isAuthenticated()) {
                // user logged out -> remove UI if present
                if (this.root && document.body.contains(this.root)) {
                    this.unmount();
                }
            }
        }, 2000) as unknown as number;
    }

    private createUI(): void {
        // create widget root and elements (extracted from previous mount logic)
        this.root = document.createElement('div');
        this.root.id = 'friend-widget-root';
        this.root.style.position = 'fixed';
        this.root.style.bottom = '20px';
        this.root.style.right = '20px';
        this.root.style.zIndex = '9999';
        document.body.appendChild(this.root);

        this.btn = document.createElement('button');
        this.btn.id = 'friend-widget-btn';
        this.btn.title = 'Friends';
        this.btn.className = 'bg-game-dark hover:bg-blue-800 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg';
        this.btn.style.cursor = 'pointer';
        this.btn.innerHTML = '👥';
        this.btn.onclick = () => this.toggle();
        this.root.appendChild(this.btn);

        this.panel = document.createElement('div');
        this.panel.id = 'friend-widget-panel';
        this.panel.className = 'glass-effect p-4 rounded-2xl shadow-xl';
        this.panel.style.width = '320px';
        this.panel.style.maxHeight = '70vh';
        this.panel.style.overflow = 'auto';
        this.panel.style.marginBottom = '12px';
        this.panel.style.display = 'none';
        this.panel.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
        this.root.appendChild(this.panel);

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-3 gap-2';
        const h = document.createElement('h4');
        h.textContent = 'Friends';
        h.className = 'text-lg font-semibold text-white';
        header.appendChild(h);

        const searchContainer = document.createElement('div');
        searchContainer.className = 'flex gap-2 items-center';

        this.searchInput = document.createElement('input');
        this.searchInput.id = 'friend-widget-search-input';
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Add by username';
        this.searchInput.className = 'px-2 py-1 rounded bg-game-dark text-white text-sm';
        searchContainer.appendChild(this.searchInput);

        this.searchBtn = document.createElement('button');
        this.searchBtn.id = 'friend-widget-search-btn';
        this.searchBtn.textContent = '+';
        this.searchBtn.title = 'Send friend request by username';
        this.searchBtn.className = 'bg-accent-pink text-white rounded px-2 py-1 text-sm';
        this.searchBtn.onclick = async () => {
            const val = this.searchInput?.value?.trim();
            if (!val) { 
                await (window as any).app.showInfo('Add Friend', 'Enter a username');
                return;
            }
            try {
                await AuthService.sendFriendRequestByUsername(val);
                this.searchInput!.value = '';
                this.refreshNow();
                await (window as any).app.showInfo('Friend Request Sent', `Friend request sent to ${val}`);
            } catch (err: any) {
                await (window as any).app.showInfo('Failed to send request', AuthService.extractErrorMessage(err) || String(err));
            }
        };
        searchContainer.appendChild(this.searchBtn);

        header.appendChild(searchContainer);
        this.panel.appendChild(header);

        const list = document.createElement('div');
        list.id = 'friend-list';
        this.panel.appendChild(list);

        this.refreshNow();
        this.startPolling();
    }

    private async fetchAndRender(): Promise<void> {
        const listEl = this.panel ? this.panel.querySelector('#friend-list') as HTMLElement | null : null;
        if (!listEl) return;
        
        listEl.innerHTML = '<p class="text-gray-400">Loading...</p>';

        try {
            const me = AuthService.getUser();
            if (!me) {
                listEl.innerHTML = '<p class="text-gray-400">Not signed in</p>';
                return;
            }

            const friends = await AuthService.getFriends(me.id);
            if (!friends || friends.length === 0) {
                listEl.innerHTML = '<p class="text-gray-400">No friends yet</p>';
                return;
            }

            listEl.innerHTML = '';
            friends.forEach(f => {
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between p-2 rounded hover:bg-blue-800';
                
                // Left side: status dot + name
                const left = document.createElement('div');
                left.className = 'flex items-center gap-3';
                
                const dot = document.createElement('span');
                dot.style.width = '10px';
                dot.style.height = '10px';
                dot.style.borderRadius = '50%';
                dot.style.display = 'inline-block';
                dot.style.marginRight = '6px';
                dot.style.background = f.is_online ? '#22c55e' : '#94a3b8';
                
                const name = document.createElement('div');
                name.className = 'text-white';
                name.textContent = f.display_name || f.username;
                
                left.appendChild(dot);
                left.appendChild(name);

                // Right side: status text + remove button
                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-2';
                
                const status = document.createElement('span');
                status.className = 'text-sm text-gray-300';
                status.textContent = f.status === 'pending' ? 'Pending' : (f.is_online ? 'Online' : 'Offline');
                
                const remove = document.createElement('button');
                remove.className = 'ml-2 bg-game-red text-white px-2 py-1 rounded text-xs';
                remove.textContent = 'Remove';
                remove.onclick = async () => {
                    const me = AuthService.getUser();
                    if (!me) { 
                        await (window as any).app.showInfo('Not authenticated', 'You must be logged in to remove a friend.');
                        return; 
                    }
                    const ok = await this.showConfirmModal(`Remove ${f.display_name || f.username}`, 'Are you sure you want to remove this friend?');
                    if (!ok) return;
                    try {
                        await AuthService.removeFriend(me.id, f.id);
                        this.refreshNow();
                    } catch (err: any) {
                        await (window as any).app.showInfo('Failed to remove friend', AuthService.extractErrorMessage(err) || String(err));
                    }
                };

                actions.appendChild(status);
                actions.appendChild(remove);

                row.appendChild(left);
                row.appendChild(actions);
                listEl.appendChild(row);
            });
        } catch (err) {
            listEl.innerHTML = `<p class="text-red-400">Error loading friends</p>`;
            console.error(err);
        }
    }

    toggle(): void {
        this.visible = !this.visible;
        if (!this.panel || !this.btn) return;
        
        this.panel.style.display = this.visible ? 'block' : 'none';
        this.btn.classList.toggle('bg-accent-pink', this.visible);
        
        if (this.visible) this.refreshNow();
    }


    async refreshNow(): Promise<void> {
        await this.fetchAndRender();
    }


    private startPolling(): void {
        if (this.intervalId) return;
        
        this.intervalId = window.setInterval(() => {
            if (this.visible) this.refreshNow();
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
        this.root = null;
        this.panel = null;
        this.btn = null;
    }

    private showConfirmModal(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';

            const modal = document.createElement('div');
            modal.className = 'glass-effect p-6 rounded-2xl max-w-sm w-full mx-4 relative text-left border-2 border-white/5';

            const h = document.createElement('h3');
            h.className = 'text-lg font-bold text-white mb-2';
            h.textContent = title;

            const p = document.createElement('p');
            p.className = 'text-gray-300 mb-4';
            p.textContent = message;

            const row = document.createElement('div');
            row.className = 'flex gap-3 justify-end';

            const cancel = document.createElement('button');
            cancel.className = 'px-4 py-2 rounded bg-game-dark text-white';
            cancel.textContent = 'Cancel';
            cancel.onclick = () => {
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                resolve(false);
            };

            const confirm = document.createElement('button');
            confirm.className = 'px-4 py-2 rounded btn-primary';
            confirm.textContent = 'Remove';
            confirm.onclick = () => {
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                resolve(true);
            };

            row.appendChild(cancel);
            row.appendChild(confirm);
            modal.appendChild(h);
            modal.appendChild(p);
            modal.appendChild(row);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => confirm.focus(), 50);
        });
    }
}
