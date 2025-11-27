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
                        if ((window as any)._friendWidget === this) {
                            delete (window as any)._friendWidget;
                        }
                        this.root = null;
                        this.panel = null;
                        this.btn = null;
                        this.searchInput = null;
                        this.searchBtn = null;
                    }
                }
            };
            window.addEventListener('auth:change', this.authChangeHandler);
        }

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
            else {
                // Remove if not authenticated but keep listener
                if (document.body.contains(existing)) {
                    document.body.removeChild(existing);
                }
                this.root = null;
                this.panel = null;
                this.btn = null;
                this.searchInput = null;
                this.searchBtn = null;
            }

            // expose global ref so other widgets can interact
            (window as any)._friendWidget = this;
            return;
        }

        // Defer creating UI until user is authenticated
        if (AuthService.isAuthenticated()) {
            this.createUI();
        }
        // No need for polling to check auth - auth:change event will handle it
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

        // set global reference so other widgets (notification) can close this panel
        (window as any)._friendWidget = this;

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

    // Close the panel without unmounting (used to avoid overlapping widgets)
    closePanel(): void {
        this.visible = false;
        if (this.panel) this.panel.style.display = 'none';
        if (this.btn) (this.btn as HTMLElement).classList.remove('bg-accent-pink');
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

                // Right side: status text + action buttons
                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-2';

                const status = document.createElement('span');
                status.className = 'text-sm text-gray-300';
                status.textContent = f.status === 'pending' ? 'Pending' : (f.is_online ? 'Online' : 'Offline');

                // If the relation is 'incoming' and status is pending, show accept/decline
                if (f.status === 'pending' && f.relation === 'incoming') {
                    const accept = document.createElement('button');
                    accept.className = 'bg-game-dark text-white px-2 py-1 rounded text-sm';
                    accept.title = 'Accept';
                    accept.textContent = '✔';
                    accept.onclick = async () => {
                        try {
                            await AuthService.acceptFriend(me.id, f.id);
                            this.refreshNow();
                            await (window as any).app.showInfo('Friend Request Accepted', `${f.display_name || f.username} is now your friend`);
                        } catch (err: any) {
                            await (window as any).app.showInfo('Accept failed', AuthService.extractErrorMessage(err) || 'Failed to accept friend request');
                        }
                    };

                    const decline = document.createElement('button');
                    decline.className = 'bg-game-dark text-white px-2 py-1 rounded text-sm';
                    decline.title = 'Decline';
                    decline.textContent = '✖';
                    decline.onclick = async () => {
                        const ok = await (window as any).app.confirm('Decline friend request', `Decline friend request from ${f.display_name || f.username}?`);
                        if (!ok) return;
                        try {
                            await AuthService.removeFriend(me.id, f.id);
                            this.refreshNow();
                        } catch (err: any) {
                            await (window as any).app.showInfo('Decline failed', AuthService.extractErrorMessage(err) || 'Failed to decline request');
                        }
                    };

                    actions.appendChild(status);
                    actions.appendChild(accept);
                    actions.appendChild(decline);
                } else if (f.status === 'pending' && f.relation === 'outgoing') {
                    // outgoing pending -> allow cancel
                    const cancel = document.createElement('button');
                    cancel.className = 'ml-2 bg-game-dark text-white px-2 py-1 rounded text-sm';
                    cancel.textContent = 'Cancel';
                    cancel.onclick = async () => {
                        const ok = await (window as any).app.confirm('Cancel request', `Cancel friend request to ${f.display_name || f.username}?`);
                        if (!ok) return;
                        try {
                            await AuthService.removeFriend(me.id, f.id);
                            this.refreshNow();
                        } catch (err: any) {
                            await (window as any).app.showInfo('Cancel failed', AuthService.extractErrorMessage(err) || 'Failed to cancel request');
                        }
                    };
                    actions.appendChild(status);
                    actions.appendChild(cancel);
                } else {
                    // accepted friend -> show remove
                    const remove = document.createElement('button');
                    remove.className = 'ml-2 bg-game-red text-white px-2 py-1 rounded text-xs';
                    remove.textContent = 'Remove';
                    remove.onclick = async () => {
                        const ok = await (window as any).app.confirm(`Remove ${f.display_name || f.username}`, 'Are you sure you want to remove this friend?');
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
                }

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
        
        // If opening, ask notification widget to close to avoid overlap
        if (this.visible) {
            const nw = (window as any)._notificationWidget;
            if (nw && nw !== this && typeof nw.closePanel === 'function') {
                try { nw.closePanel(); } catch (e) { /* ignore */ }
            }
        }

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
        // Stop polling
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.authWatcherId) {
            clearInterval(this.authWatcherId);
            this.authWatcherId = null;
        }
        
        // Remove DOM elements
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }

        // clean global reference if it points to this instance
        try {
            if ((window as any)._friendWidget === this) delete (window as any)._friendWidget;
        } catch (e) {}
        
        // Clear all references
        this.root = null;
        this.panel = null;
        this.btn = null;
        this.searchInput = null;
        this.searchBtn = null;

    }
}
