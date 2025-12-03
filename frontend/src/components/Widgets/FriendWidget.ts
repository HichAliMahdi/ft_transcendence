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
    private chatContainer: HTMLElement | null = null;
    private openChats: Map<number, {
        box: HTMLElement;
        messagesEl: HTMLElement;
        inputEl: HTMLInputElement;
        minimized: boolean;
    }> = new Map();
    private unreadCounts: Map<number, number> = new Map();
    private directMessageHandler: ((ev: Event) => void) | null = null;


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
        this.root.className = 'fixed bottom-5 right-5 z-[9998]';
        document.body.appendChild(this.root);

        (window as any)._friendWidget = this;

        this.btn = document.createElement('button');
        this.btn.id = 'friend-widget-btn';
        this.btn.title = 'Friends';
        this.btn.className = 'bg-game-dark hover:bg-blue-800 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg cursor-pointer text-2xl relative z-10';
        this.btn.innerHTML = '👥';
        this.btn.onclick = () => this.toggle();
        this.root.appendChild(this.btn);

        this.panel = document.createElement('div');
        this.panel.id = 'friend-widget-panel';
        this.panel.className = 'glass-effect p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] w-[340px] max-h-[70vh] overflow-auto absolute bottom-16 right-0 hidden';
        this.root.appendChild(this.panel);

        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'chat-windows-root';
        this.chatContainer.className = 'fixed bottom-5 flex flex-row-reverse gap-3 z-[10000]';
        document.body.appendChild(this.chatContainer);

        try {
            let offset = 24;
            const fw = document.getElementById('friend-widget-root');
            if (fw) {
                const r = fw.getBoundingClientRect();
                offset += Math.round(r.width) + 12; // small spacing after widget
            }
            const nw = document.getElementById('notification-widget-root');
            if (nw) {
                const r2 = nw.getBoundingClientRect();
                offset += Math.round(r2.width) + 12;
            }
            // Add extra safety margin to ensure no overlap with other UI chrome
            offset += 40;
            // Increase minimum offset to keep chat clearly left of widgets
            if (offset < 260) offset = 260;
            this.chatContainer.style.right = `${offset}px`;
        } catch (e) {
            // best-effort: ensure it's not exactly on top
            this.chatContainer.style.right = '260px';
        }

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
            const isActive = currentStatus === s.value;
            statusBtn.className = `flex items-center gap-3 p-2 rounded-lg hover:bg-blue-800 transition-colors text-left ${isActive ? 'bg-blue-500/30' : 'bg-transparent'}`;
            
            const dot = document.createElement('span');
            const glowClass = s.value !== 'Offline' && isActive ? 'shadow-[0_0_8px_currentColor]' : '';
            dot.className = `w-3 h-3 rounded-full inline-block ${glowClass}`;
            dot.style.backgroundColor = s.color;
            
            const label = document.createElement('span');
            label.className = 'text-white text-sm flex-1';
            label.textContent = `${s.emoji} ${s.label}`;
            
            const checkmark = document.createElement('span');
            checkmark.textContent = isActive ? '✓' : '';
            checkmark.className = 'text-green-400 font-bold';
            
            statusBtn.appendChild(dot);
            statusBtn.appendChild(label);
            statusBtn.appendChild(checkmark);
            
            statusBtn.onclick = async () => {
                try {
                    await AuthService.setStatus(s.value as any);
                    // Update UI
                    statusSelector.querySelectorAll('button').forEach(btn => {
                        btn.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-blue-800 transition-colors text-left bg-transparent';
                        const check = btn.querySelector('span:last-child');
                        if (check) check.textContent = '';
                    });
                    statusBtn.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-blue-800 transition-colors text-left bg-blue-500/30';
                    checkmark.textContent = '✓';
                    
                    // Update dot glow
                    statusSelector.querySelectorAll('button span:first-child').forEach(d => {
                        (d as HTMLElement).className = 'w-3 h-3 rounded-full inline-block';
                    });
                    if (s.value !== 'Offline') {
                        dot.className = 'w-3 h-3 rounded-full inline-block shadow-[0_0_8px_currentColor]';
                    }
                    
                    // Update header status dot
                    const headerDot = document.getElementById('header-status-dot');
                    if (headerDot) {
                        headerDot.style.backgroundColor = s.color;
                        if (s.value !== 'Offline') {
                            headerDot.className = 'w-2.5 h-2.5 rounded-full inline-block shadow-[0_0_8px_currentColor]';
                        } else {
                            headerDot.className = 'w-2.5 h-2.5 rounded-full inline-block';
                        }
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

        // register global incoming direct message handler so widget can react (unread / refresh)
        // Only register once to avoid duplicate messages
        if (!this.directMessageHandler) {
            this.registerGlobalMessageListener();
        }
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
                
                // Left side: name + status badge
                const left = document.createElement('div');
                left.className = 'flex items-center gap-3 flex-1';
                
                const nameContainer = document.createElement('div');
                nameContainer.className = 'flex flex-col';
                
                const name = document.createElement('div');
                name.className = 'text-white font-medium';
                name.textContent = f.display_name || f.username;
                // clicking the name opens chat window (bottom-right)
                name.style.cursor = 'pointer';
                name.onclick = () => this.openChatWindow(f.id, f.display_name || f.username);
                
                // Status badge with emoji and color coding
                const statusBadge = document.createElement('span');
                statusBadge.className = 'status-text text-xs px-2 py-0.5 rounded-full inline-block mt-1 w-fit';
                
                const userStatus = (f as any).user_status || 'Offline';
                
                if (f.status === 'pending') {
                    statusBadge.textContent = '⏳ Pending';
                    statusBadge.className += ' bg-gray-500/20 text-gray-400';
                } else if (f.is_online) {
                    if (userStatus === 'Busy') {
                        statusBadge.textContent = '🔴 Busy';
                        statusBadge.className += ' bg-red-500/20 text-red-400';
                    } else if (userStatus === 'Away') {
                        statusBadge.textContent = '🟡 Away';
                        statusBadge.className += ' bg-amber-500/20 text-amber-400';
                    } else {
                        statusBadge.textContent = '🟢 Online';
                        statusBadge.className += ' bg-green-500/20 text-green-400';
                    }
                } else {
                    statusBadge.textContent = '⚫ Offline';
                    statusBadge.className += ' bg-slate-500/20 text-slate-400';
                }
                
                nameContainer.appendChild(name);
                nameContainer.appendChild(statusBadge);
                
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
                const statusBadge = row.querySelector('.status-text') as HTMLElement | null;
                
                if (statusBadge && !statusBadge.textContent?.includes('Pending')) {
                    // Reset classes
                    statusBadge.className = 'status-text text-xs px-2 py-0.5 rounded-full inline-block mt-1 w-fit';
                    
                    if (isOnline) {
                        if (status === 'Busy') {
                            statusBadge.textContent = '🔴 Busy';
                            statusBadge.className += ' bg-red-500/20 text-red-400';
                        } else if (status === 'Away') {
                            statusBadge.textContent = '🟡 Away';
                            statusBadge.className += ' bg-amber-500/20 text-amber-400';
                        } else {
                            statusBadge.textContent = '🟢 Online';
                            statusBadge.className += ' bg-green-500/20 text-green-400';
                        }
                    } else {
                        statusBadge.textContent = '⚫ Offline';
                        statusBadge.className += ' bg-slate-500/20 text-slate-400';
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

    // Global listener to react to incoming direct messages (keeps UI updated)
    private registerGlobalMessageListener(): void {
        this.directMessageHandler = async (ev: Event) => {
            try {
                const d = (ev as CustomEvent).detail;
                if (!d) return;
                const fromId = Number(d.from);
                const meId = AuthService.getUser()?.id;
                
                // Ignore messages from ourselves - we already displayed them when sending
                if (fromId === meId) return;
                
                const chat = this.openChats.get(fromId);
                if (chat) {
                    // Append the new message directly (no reload)
                    // Format timestamp for display
                    const formatTime = (dateString: string): string => {
                        if (!dateString) return '';
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
                    };
                    const el = document.createElement('div');
                    el.className = `mb-2 text-left`;
                    el.innerHTML = `<div class="inline-block px-3 py-1 rounded bg-gray-700">${d.content}</div><div class="text-xs text-gray-400 mt-1">${formatTime(d.created_at)}</div>`;
                    chat.messagesEl.appendChild(el);
                    chat.messagesEl.scrollTop = chat.messagesEl.scrollHeight;
                    // if minimized, increment unread badge
                    if (chat.minimized) {
                        const headerBadge = chat.box.querySelector('.chat-unread') as HTMLElement | null;
                        const prev = this.unreadCounts.get(fromId) || 0;
                        this.unreadCounts.set(fromId, prev + 1);
                        if (headerBadge) headerBadge.textContent = String(this.unreadCounts.get(fromId));
                    }
                } else {
                    // No open chat: increment unread for friend list, show small indicator
                    const prev = this.unreadCounts.get(fromId) || 0;
                    this.unreadCounts.set(fromId, prev + 1);
                    const row = this.panel?.querySelector(`div[data-friend-id="${fromId}"]`) as HTMLElement | null;
                    if (row) {
                        let badge = row.querySelector('.friend-unread') as HTMLElement | null;
                        if (!badge) {
                            badge = document.createElement('span');
                            badge.className = 'friend-unread bg-accent-pink text-white rounded-full text-xs px-2 py-0.5 ml-2';
                            (row.querySelector('div.flex.flex-col') || row).appendChild(badge);
                        }
                        badge.textContent = String(this.unreadCounts.get(fromId));
                    }
                }
                // Always refresh friend list to show new requests/status
                this.refreshNow();

                // Also refresh notifications if widget is present and visible
                const nw = (window as any)._notificationWidget;
                if (nw && typeof nw.refreshNow === 'function') {
                    nw.refreshNow();
                }
            } catch (e) {
                // ignore
            }
        };
        window.addEventListener('direct_message', this.directMessageHandler);
    }

    // Ensure polling helper is syntactically correct
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
        
        // Remove direct message listener
        if (this.directMessageHandler) {
            window.removeEventListener('direct_message', this.directMessageHandler);
            this.directMessageHandler = null;
        }
        
        // Remove DOM elements
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }

        // Remove chat windows container
        if (this.chatContainer && document.body.contains(this.chatContainer)) {
            document.body.removeChild(this.chatContainer);
        }
        this.openChats.clear();
        this.unreadCounts.clear();

        // clean global reference if it points to this instance
        try {
            if ((window as any)._friendWidget === this) delete (window as any)._friendWidget;
        } catch (e) { }

        // Clear all references
        this.root = null;
        this.panel = null;
        this.btn = null;
        this.searchInput = null;
        this.searchBtn = null;
    }

    // Open a persistent chat window (bottom-right). Focus existing if already open.
    private async openChatWindow(peerId: number, peerName: string): Promise<void> {
        // Ensure chat container exists
        if (!this.chatContainer) {
            this.chatContainer = document.getElementById('chat-windows-root') as HTMLElement | null;
            if (!this.chatContainer) {
                this.chatContainer = document.createElement('div');
                this.chatContainer.id = 'chat-windows-root';
                this.chatContainer.className = 'fixed bottom-5 right-5 flex flex-row-reverse gap-3 z-[10000]';
                document.body.appendChild(this.chatContainer);
            }
        }

        // If already open, restore/focus
        const existing = this.openChats.get(peerId);
        if (existing) {
            if (existing.minimized) {
                existing.minimized = false;
                existing.box.classList.remove('chat-minimized');
                existing.messagesEl.style.display = '';
                existing.inputEl.style.display = '';
                const badge = existing.box.querySelector('.chat-unread') as HTMLElement | null;
                if (badge) { badge.classList.add('hidden'); badge.textContent = ''; }
            }
            existing.inputEl.focus();
            this.unreadCounts.delete(peerId);
            return;
        }

        // Build chat box
        const box = document.createElement('div');
        box.className = 'w-80 bg-game-dark rounded-lg shadow-lg flex flex-col overflow-hidden chat-box';
        box.setAttribute('data-chat-user', String(peerId));

        // Header
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between px-3 py-2 bg-[#0b1220]';
        const title = document.createElement('div');
        title.className = 'text-sm text-white font-semibold truncate';
        title.textContent = peerName;
        const controls = document.createElement('div');
        controls.className = 'flex items-center gap-2';
        const unreadBadge = document.createElement('span');
        unreadBadge.className = 'chat-unread bg-accent-pink text-white rounded-full text-xs px-2 py-0.5 hidden';
        unreadBadge.setAttribute('aria-hidden', 'true');
        const minBtn = document.createElement('button');
        minBtn.className = 'text-gray-300 hover:text-white';
        minBtn.title = 'Minimize';
        minBtn.textContent = '−';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'text-gray-300 hover:text-white';
        closeBtn.title = 'Close';
        closeBtn.textContent = '✕';
        controls.appendChild(unreadBadge);
        controls.appendChild(minBtn);
        controls.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(controls);

        // Messages area
        const messagesEl = document.createElement('div');
        messagesEl.className = 'px-3 py-2 flex-1 overflow-auto text-sm';
        messagesEl.style.maxHeight = '240px';
        messagesEl.textContent = 'Loading...';

        // Input
        const inputRow = document.createElement('div');
        inputRow.className = 'px-3 py-2 flex gap-2 border-t border-gray-700';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Write a message…';
        input.className = 'flex-1 px-3 py-2 rounded bg-[#0f1724] text-white text-sm';
        const send = document.createElement('button');
        send.className = 'px-3 py-2 btn-primary text-sm';
        send.textContent = 'Send';
        inputRow.appendChild(input);
        inputRow.appendChild(send);

        box.appendChild(header);
        box.appendChild(messagesEl);
        box.appendChild(inputRow);

        // Insert box so newest is nearest the friend widget
        if (this.chatContainer) this.chatContainer.insertBefore(box, this.chatContainer.firstChild);

        this.openChats.set(peerId, { box, messagesEl, inputEl: input, minimized: false });

        // Load history
        try {
            const history = await AuthService.getMessages(peerId);
            messagesEl.innerHTML = '';
            history.forEach((m: any) => {
                const el = document.createElement('div');
                const isMine = m.sender_id === AuthService.getUser()?.id;
                el.className = `mb-2 ${isMine ? 'text-right' : 'text-left'}`;
                el.innerHTML = `<div class="inline-block px-3 py-1 rounded ${isMine ? 'bg-blue-600' : 'bg-gray-700'}">${m.content}</div><div class="text-xs text-gray-400 mt-1">${m.created_at}</div>`;
                messagesEl.appendChild(el);
            });
            messagesEl.scrollTop = messagesEl.scrollHeight;
        } catch (e) {
            messagesEl.textContent = 'Failed to load messages';
        }

        // Send action helper
        const sendMessage = async () => {
            const txt = input.value.trim();
            if (!txt) return;
            send.disabled = true;
            try {
                await AuthService.sendMessage(peerId, txt);
                const el = document.createElement('div');
                el.className = 'mb-2 text-right';
                el.innerHTML = `<div class="inline-block px-3 py-1 rounded bg-blue-600">${txt}</div><div class="text-xs text-gray-400 mt-1">now</div>`;
                messagesEl.appendChild(el);
                messagesEl.scrollTop = messagesEl.scrollHeight;
                input.value = '';
            } catch (err: any) {
                await (window as any).app.showInfo('Send failed', AuthService.extractErrorMessage(err) || String(err));
            } finally {
                send.disabled = false;
            }
        };

        // Send button click
        send.onclick = sendMessage;

        // Enter to send, Shift+Enter for new line
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Minimize / restore
        minBtn.onclick = () => {
            const info = this.openChats.get(peerId);
            if (!info) return;
            info.minimized = !info.minimized;
            if (info.minimized) {
                info.box.classList.add('chat-minimized');
                info.messagesEl.style.display = 'none';
                info.inputEl.style.display = 'none';
                const badge = info.box.querySelector('.chat-unread') as HTMLElement | null;
                if (badge) badge.classList.remove('hidden');
            } else {
                info.box.classList.remove('chat-minimized');
                info.messagesEl.style.display = '';
                info.inputEl.style.display = '';
                const badge = info.box.querySelector('.chat-unread') as HTMLElement | null;
                if (badge) { badge.classList.add('hidden'); badge.textContent = ''; }
                this.unreadCounts.delete(peerId);
            }
        };

        // Close chat
        closeBtn.onclick = () => {
            if (this.openChats.has(peerId)) {
                const info = this.openChats.get(peerId)!;
                if (this.chatContainer && this.chatContainer.contains(info.box)) {
                    this.chatContainer.removeChild(info.box);
                }
                this.openChats.delete(peerId);
                this.unreadCounts.delete(peerId);
            }
        };

        // focus input
        setTimeout(() => { input.focus(); }, 50);
    }
}
