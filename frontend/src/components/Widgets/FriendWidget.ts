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
        if (!this.authChangeHandler) {
            this.authChangeHandler = () => {
                if (AuthService.isAuthenticated()) {
                    if (!this.root || !document.body.contains(this.root)) {
                        this.createUI();
                    }
                } else {
                    if (this.root && document.body.contains(this.root)) {
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

        const existing = document.getElementById('friend-widget-root');
        if (existing) {
            this.root = existing as HTMLElement;
            this.panel = this.root.querySelector('#friend-widget-panel') as HTMLElement | null;
            this.btn = this.root.querySelector('#friend-widget-btn') as HTMLElement | null;
            this.searchInput = this.root.querySelector('#friend-widget-search-input') as HTMLInputElement | null;
            this.searchBtn = this.root.querySelector('#friend-widget-search-btn') as HTMLButtonElement | null;
            if (AuthService.isAuthenticated()) this.startPolling();
            else {
                if (document.body.contains(existing)) {
                    document.body.removeChild(existing);
                }
                this.root = null;
                this.panel = null;
                this.btn = null;
                this.searchInput = null;
                this.searchBtn = null;
            }

            (window as any)._friendWidget = this;
            return;
        }

        if (AuthService.isAuthenticated()) {
            this.createUI();
        }
    }

    private createUI(): void {
        this.root = document.createElement('div');
        this.root.id = 'friend-widget-root';
        this.root.style.position = 'fixed';
        this.root.style.bottom = '20px';
        this.root.style.right = '20px';
        this.root.style.zIndex = '9999';
        document.body.appendChild(this.root);

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
        this.panel.style.width = '340px';
        this.panel.style.maxHeight = '70vh';
        this.panel.style.overflow = 'auto';
        this.panel.style.marginBottom = '12px';
        this.panel.style.display = 'none';
        this.panel.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
        this.root.appendChild(this.panel);

        // Personal Status Section
        const statusSection = document.createElement('div');
        statusSection.className = 'mb-4 pb-4 border-b border-gray-600';
        
        const statusHeader = document.createElement('div');
        statusHeader.className = 'flex items-center justify-between mb-2';
        
        const myStatusLabel = document.createElement('h4');
        myStatusLabel.textContent = 'My Status';
        myStatusLabel.className = 'text-sm font-semibold text-gray-400';
        statusHeader.appendChild(myStatusLabel);
        
        statusSection.appendChild(statusHeader);
        
        const statusSelector = document.createElement('div');
        statusSelector.className = 'flex flex-col gap-2';
        
        const statuses: Array<{value: string; label: string; color: string; emoji: string}> = [
            { value: 'Online', label: 'Online', color: '#22c55e', emoji: '🟢' },
            { value: 'Busy', label: 'Busy', color: '#ef4444', emoji: '🔴' },
            { value: 'Away', label: 'Away', color: '#f59e0b', emoji: '🟡' },
            { value: 'Offline', label: 'Offline', color: '#94a3b8', emoji: '⚫' }
        ];
        
        const user = AuthService.getUser();
        const currentStatus = (user && (user as any).status) ? (user as any).status : 'Online';
        
        statuses.forEach(s => {
            const statusBtn = document.createElement('button');
            statusBtn.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-blue-800 transition-colors text-left';
            statusBtn.style.background = currentStatus === s.value ? 'rgba(59, 130, 246, 0.3)' : 'transparent';
            
            const dot = document.createElement('span');
            dot.style.width = '12px';
            dot.style.height = '12px';
            dot.style.borderRadius = '50%';
            dot.style.background = s.color;
            dot.style.display = 'inline-block';
            if (currentStatus === s.value && s.value !== 'Offline') {
                dot.style.boxShadow = `0 0 8px ${s.color}`;
            }
            
            const label = document.createElement('span');
            label.className = 'text-white text-sm flex-1';
            label.textContent = `${s.emoji} ${s.label}`;
            
            const checkmark = document.createElement('span');
            checkmark.textContent = currentStatus === s.value ? '✓' : '';
            checkmark.className = 'text-green-400 font-bold';
            
            statusBtn.appendChild(dot);
            statusBtn.appendChild(label);
            statusBtn.appendChild(checkmark);
            
            statusBtn.onclick = async () => {
                try {
                    await AuthService.setStatus(s.value as any);
                    // Update UI
                    statusSelector.querySelectorAll('button').forEach(btn => {
                        btn.style.background = 'transparent';
                        const check = btn.querySelector('span:last-child');
                        if (check) check.textContent = '';
                    });
                    statusBtn.style.background = 'rgba(59, 130, 246, 0.3)';
                    checkmark.textContent = '✓';
                    
                    // Update dot glow
                    statusSelector.querySelectorAll('.status-dot').forEach(d => {
                        (d as HTMLElement).style.boxShadow = 'none';
                    });
                    if (s.value !== 'Offline') {
                        dot.style.boxShadow = `0 0 8px ${s.color}`;
                    }
                } catch (err: any) {
                    await (window as any).app.showInfo('Status update failed', AuthService.extractErrorMessage(err) || String(err));
                }
            };
            
            statusSelector.appendChild(statusBtn);
        });
        
        statusSection.appendChild(statusSelector);
        this.panel.appendChild(statusSection);

        // Friends Header
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
                row.className = 'flex items-center justify-between p-3 rounded-lg hover:bg-blue-800 transition-colors duration-200 mb-2';
                row.setAttribute('data-friend-id', String(f.id));
                
                // Left side: status dot + name + status badge
                const left = document.createElement('div');
                left.className = 'flex items-center gap-3 flex-1';
                
                const dot = document.createElement('span');
                dot.className = 'status-dot';
                dot.style.width = '12px';
                dot.style.height = '12px';
                dot.style.borderRadius = '50%';
                dot.style.display = 'inline-block';
                dot.style.flexShrink = '0';
                
                // Status colors: Online=green, Busy=red, Away=yellow, Offline=gray
                const userStatus = (f as any).user_status || 'Offline';
                if (f.is_online) {
                    if (userStatus === 'Busy') {
                        dot.style.background = '#ef4444'; // red
                        dot.style.boxShadow = '0 0 6px rgba(239, 68, 68, 0.6)';
                    } else if (userStatus === 'Away') {
                        dot.style.background = '#f59e0b'; // yellow/amber
                        dot.style.boxShadow = '0 0 6px rgba(245, 158, 11, 0.6)';
                    } else {
                        dot.style.background = '#22c55e'; // green (Online)
                        dot.style.boxShadow = '0 0 6px rgba(34, 197, 94, 0.6)';
                    }
                } else {
                    dot.style.background = '#94a3b8'; // gray (Offline)
                }
                
                const nameContainer = document.createElement('div');
                nameContainer.className = 'flex flex-col';
                
                const name = document.createElement('div');
                name.className = 'text-white font-medium';
                name.textContent = f.display_name || f.username;
                
                // Status badge with emoji and color coding
                const statusBadge = document.createElement('span');
                statusBadge.className = 'status-text text-xs px-2 py-0.5 rounded-full inline-block mt-1';
                statusBadge.style.width = 'fit-content';
                
                if (f.status === 'pending') {
                    statusBadge.textContent = '⏳ Pending';
                    statusBadge.style.background = 'rgba(156, 163, 175, 0.2)';
                    statusBadge.style.color = '#9ca3af';
                } else if (f.is_online) {
                    if (userStatus === 'Busy') {
                        statusBadge.textContent = '🔴 Busy';
                        statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
                        statusBadge.style.color = '#ef4444';
                    } else if (userStatus === 'Away') {
                        statusBadge.textContent = '🟡 Away';
                        statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
                        statusBadge.style.color = '#f59e0b';
                    } else {
                        statusBadge.textContent = '🟢 Online';
                        statusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
                        statusBadge.style.color = '#22c55e';
                    }
                } else {
                    statusBadge.textContent = '⚫ Offline';
                    statusBadge.style.background = 'rgba(148, 163, 184, 0.2)';
                    statusBadge.style.color = '#94a3b8';
                }
                
                nameContainer.appendChild(name);
                nameContainer.appendChild(statusBadge);
                
                left.appendChild(dot);
                left.appendChild(nameContainer);

                // Right side: action buttons
                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-2';

                // If the relation is 'incoming' and status is pending, show accept/decline
                if (f.status === 'pending' && f.relation === 'incoming') {
                    const accept = document.createElement('button');
                    accept.className = 'bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors';
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
                    decline.className = 'bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors';
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

                    actions.appendChild(accept);
                    actions.appendChild(decline);
                } else if (f.status === 'pending' && f.relation === 'outgoing') {
                    // outgoing pending -> allow cancel
                    const cancel = document.createElement('button');
                    cancel.className = 'bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm transition-colors';
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
                    actions.appendChild(cancel);
                } else {
                    // accepted friend -> show remove
                    const remove = document.createElement('button');
                    remove.className = 'bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs transition-colors';
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

    // Add method to update friend presence from WebSocket broadcasts
    updateFriendPresence(userId: number, status: string, isOnline: boolean): void {
        // Update even when not visible - this keeps the data fresh for when user opens the panel
        if (!this.panel) return;
        
        const listEl = this.panel.querySelector('#friend-list') as HTMLElement | null;
        if (!listEl) return;
        
        // Find the friend row and update its status indicator
        const rows = listEl.querySelectorAll('div[data-friend-id]');
        rows.forEach((row) => {
            const friendId = parseInt(row.getAttribute('data-friend-id') || '0');
            if (friendId === userId) {
                const dot = row.querySelector('.status-dot') as HTMLElement | null;
                const statusBadge = row.querySelector('.status-text') as HTMLElement | null;
                
                if (dot) {
                    if (isOnline) {
                        if (status === 'Busy') {
                            dot.style.background = '#ef4444';
                            dot.style.boxShadow = '0 0 6px rgba(239, 68, 68, 0.6)';
                        } else if (status === 'Away') {
                            dot.style.background = '#f59e0b';
                            dot.style.boxShadow = '0 0 6px rgba(245, 158, 11, 0.6)';
                        } else {
                            dot.style.background = '#22c55e';
                            dot.style.boxShadow = '0 0 6px rgba(34, 197, 94, 0.6)';
                        }
                    } else {
                        dot.style.background = '#94a3b8';
                        dot.style.boxShadow = 'none';
                    }
                }
                
                if (statusBadge && !statusBadge.textContent?.includes('Pending')) {
                    if (isOnline) {
                        if (status === 'Busy') {
                            statusBadge.textContent = '🔴 Busy';
                            statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
                            statusBadge.style.color = '#ef4444';
                        } else if (status === 'Away') {
                            statusBadge.textContent = '🟡 Away';
                            statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
                            statusBadge.style.color = '#f59e0b';
                        } else {
                            statusBadge.textContent = '🟢 Online';
                            statusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
                            statusBadge.style.color = '#22c55e';
                        }
                    } else {
                        statusBadge.textContent = '⚫ Offline';
                        statusBadge.style.background = 'rgba(148, 163, 184, 0.2)';
                        statusBadge.style.color = '#94a3b8';
                    }
                }
            }
        });
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
