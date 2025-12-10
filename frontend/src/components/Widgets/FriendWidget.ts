import { AuthService } from '../game/AuthService';

export class FriendWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private searchInput: HTMLInputElement | null = null;
    private searchBtn: HTMLButtonElement | null = null;
    private authChangeHandler: ((e?: Event) => void) | null = null;
    private chatContainer: HTMLElement | null = null;
    private openChats: Map<number, {
        box: HTMLElement;
        messagesEl: HTMLElement;
        inputEl: HTMLInputElement;
        minimized: boolean;
    }> = new Map();
    private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
    private directMessageHandler: ((ev: Event) => void) | null = null;
    private openingChats: Set<number> = new Set();
    private displayedMessageIds: Set<number> = new Set();
    private timestampUpdateInterval: number | null = null;

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
        this.btn.className = 'bg-gradient-to-br from-accent-pink to-accent-purple hover:from-pink-600 hover:to-purple-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-[0_8px_24px_rgba(236,72,153,0.4)] hover:shadow-[0_12px_32px_rgba(236,72,153,0.6)] cursor-pointer text-3xl relative z-10 transition-all duration-300 hover:scale-110';
        this.btn.innerHTML = '<span class="relative">👥<span class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-game-dark animate-pulse"></span></span>';
        this.btn.onclick = () => this.toggle();
        this.root.appendChild(this.btn);

        this.panel = document.createElement('div');
        this.panel.id = 'friend-widget-panel';
        this.panel.className = 'glass-effect backdrop-blur-xl bg-gradient-to-br from-game-dark/95 to-blue-900/95 p-6 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 w-[380px] max-h-[75vh] overflow-hidden flex flex-col absolute bottom-20 right-0 hidden';
        this.root.appendChild(this.panel);

        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'chat-windows-root';
        this.chatContainer.className = 'fixed bottom-5 flex flex-row-reverse gap-3 z-[10000] items-end';
        document.body.appendChild(this.chatContainer);

        try {
            let offset = 24;
            const fw = document.getElementById('friend-widget-root');
            if (fw) {
                const r = fw.getBoundingClientRect();
                offset += Math.round(r.width) + 12;
            }
            offset += 40;
            if (offset < 200) offset = 200;
            this.chatContainer.style.right = `${offset}px`;
        } catch (e) {
            this.chatContainer.style.right = '200px';
        }

        // Personal Status Section with enhanced design
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
                    
                    // Remove active state from all buttons
                    statusSelector.querySelectorAll('button').forEach(btn => {
                        btn.className = 'group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left bg-white/5 hover:scale-105';
                        const lbl = btn.querySelector('span:nth-child(2) span');
                        if (lbl) lbl.className = 'text-white text-sm font-medium';
                        // Reset dot to non-glowing state
                        const btnDot = btn.querySelector('span:first-child') as HTMLElement | null;
                        if (btnDot) {
                            btnDot.className = 'w-3 h-3 rounded-full inline-block transition-all duration-300';
                        }
                    });
                    
                    // Add active state to clicked button
                    statusBtn.className = 'group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all duration-300 text-left bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 ring-2 ring-accent-pink/50';
                    label.className = 'text-white text-sm font-medium text-accent-pink';
                    
                    // Apply glow effect only to active status if not Offline
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
                } catch (err: any) {
                    await (window as any).app.showInfo('Status update failed', AuthService.extractErrorMessage(err) || String(err));
                }
            };

            statusSelector.appendChild(statusBtn);
        });

        statusSection.appendChild(statusSelector);
        this.panel.appendChild(statusSection);

        // Friends Header with enhanced styling
        const header = document.createElement('div');
        header.className = 'mb-4';

        const headerTop = document.createElement('div');
        headerTop.className = 'flex items-center justify-between mb-3';

        const h = document.createElement('h4');
        h.textContent = 'Friends';
        h.className = 'text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-pink to-accent-purple';
        headerTop.appendChild(h);

        header.appendChild(headerTop);

        const searchContainer = document.createElement('div');
        searchContainer.className = 'relative group';

        this.searchInput = document.createElement('input');
        this.searchInput.id = 'friend-widget-search-input';
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Add friend by username...';
        this.searchInput.className = 'w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 focus:border-accent-pink/50 focus:bg-white/10 text-white placeholder-gray-400 text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-pink/30';
        searchContainer.appendChild(this.searchInput);

        this.searchBtn = document.createElement('button');
        this.searchBtn.id = 'friend-widget-search-btn';
        this.searchBtn.textContent = '+';
        this.searchBtn.title = 'Send friend request';
        this.searchBtn.className = 'absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-accent-pink to-accent-purple hover:from-pink-600 hover:to-purple-700 text-white rounded-lg w-8 h-8 flex items-center justify-center text-xl font-bold transition-all duration-300 hover:scale-110 shadow-lg';
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
        list.className = 'overflow-y-auto overflow-x-hidden flex-1 pr-2 custom-scrollbar';
        this.panel.appendChild(list);

        // Add custom scrollbar styles
        const style = document.createElement('style');
        style.textContent = `
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: linear-gradient(to bottom, #ec4899, #a855f7);
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(to bottom, #db2777, #9333ea);
            }
        `;
        document.head.appendChild(style);

        this.refreshNow();
        this.startPolling();

        this.registerGlobalMessageListener();

        this.setupClickOutsideListener();
    }

    private setupClickOutsideListener(): void {
        this.clickOutsideHandler = (e: MouseEvent) => {
            if (!this.visible || !this.root) return;

            const target = e.target as Node;
            // Don't close if clicking inside the widget or any chat windows
            if (this.root.contains(target)) return;

            // Check if clicking inside any chat window
            for (const [_, chat] of this.openChats) {
                if (chat.box.contains(target)) return;
            }

            this.closePanel();
        };

        document.addEventListener('click', this.clickOutsideHandler);
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

    async refreshNow(): Promise<void> {
        await this.fetchAndRender();
    }

    private async fetchAndRender(): Promise<void> {
        const listEl = this.panel ? this.panel.querySelector('#friend-list') as HTMLElement | null : null;
        if (!listEl) return;

        listEl.innerHTML = '<div class="flex items-center justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-pink"></div></div>';

        try {
            const me = AuthService.getUser();
            if (!me) {
                listEl.innerHTML = '<p class="text-gray-400 text-center py-8">Not signed in</p>';
                return;
            }

            const friends = await AuthService.getFriends(me.id);
            if (!friends || friends.length === 0) {
                listEl.innerHTML = '<div class="text-center py-12"><div class="text-6xl mb-4">👋</div><p class="text-gray-400 text-sm">No friends yet</p><p class="text-gray-500 text-xs mt-2">Add friends to start chatting!</p></div>';
                return;
            }

            listEl.innerHTML = '';
            friends.forEach(f => {
                const row = document.createElement('div');
                row.className = 'group flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-300 mb-2 border border-transparent hover:border-white/10 hover:shadow-lg hover:shadow-accent-pink/10';
                row.setAttribute('data-friend-id', String(f.id));

                const left = document.createElement('div');
                left.className = 'flex items-center gap-3 flex-1 min-w-0';

                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'relative flex-shrink-0';

                const avatar = document.createElement('div');
                avatar.className = 'w-12 h-12 rounded-full bg-gradient-to-br from-accent-pink to-accent-purple flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/20 group-hover:ring-accent-pink/50 transition-all duration-300 overflow-hidden';
                
                // Display avatar if exists, otherwise show initials
                const avatarUrl = AuthService.getAvatarUrl(f as any);
                if (avatarUrl) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.className = 'w-full h-full object-cover';
                    img.alt = f.display_name || f.username;
                    avatar.appendChild(img);
                } else {
                    avatar.textContent = (f.display_name || f.username).charAt(0).toUpperCase();
                }
                
                avatarContainer.appendChild(avatar);

                const statusIndicator = document.createElement('span');
                const userStatus = (f as any).user_status || 'Offline';
                let statusColor = '#94a3b8';
                if (f.status !== 'pending' && f.is_online) {
                    if (userStatus === 'Busy') statusColor = '#ef4444';
                    else if (userStatus === 'Away') statusColor = '#f59e0b';
                    else statusColor = '#22c55e';
                }
                statusIndicator.className = 'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-game-dark';
                statusIndicator.style.backgroundColor = statusColor;
                if (f.status !== 'pending' && f.is_online && userStatus !== 'Away') {
                    statusIndicator.className += ' animate-pulse shadow-[0_0_8px_currentColor]';
                }
                avatarContainer.appendChild(statusIndicator);

                left.appendChild(avatarContainer);

                const nameContainer = document.createElement('div');
                nameContainer.className = 'flex flex-col min-w-0 flex-1';

                const name = document.createElement('div');
                name.className = 'text-white font-semibold text-base truncate cursor-pointer hover:text-accent-pink transition-colors duration-200';
                name.textContent = f.display_name || f.username;
                name.onclick = () => {
                    this.openChatWindow(f.id, f.display_name || f.username);
                    this.closePanel();
                };

                const statusBadge = document.createElement('span');
                statusBadge.className = 'status-text text-xs px-2.5 py-1 rounded-full inline-block mt-1 w-fit font-medium';

                if (f.status === 'pending') {
                    statusBadge.textContent = '⏳ Pending';
                    statusBadge.className += ' bg-gray-500/20 text-gray-300 border border-gray-500/30';
                } else if (f.is_online) {
                    const userStatus = (f as any).user_status || 'Offline';
                    if (userStatus === 'Busy') {
                        statusBadge.textContent = '🚫 Busy';
                        statusBadge.className += ' bg-red-500/20 text-red-300 border border-red-500/30';
                    } else if (userStatus === 'Away') {
                        statusBadge.textContent = '⏰ Away';
                        statusBadge.className += ' bg-amber-500/20 text-amber-300 border border-amber-500/30';
                    } else {
                        statusBadge.textContent = '✓ Online';
                        statusBadge.className += ' bg-green-500/20 text-green-300 border border-green-500/30';
                    }
                } else {
                    statusBadge.textContent = '○ Offline';
                    statusBadge.className += ' bg-slate-500/20 text-slate-300 border border-slate-500/30';
                }

                nameContainer.appendChild(name);
                nameContainer.appendChild(statusBadge);

                left.appendChild(nameContainer);

                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-2 flex-shrink-0';

                if (f.status === 'pending' && f.relation === 'incoming') {
                    const accept = document.createElement('button');
                    accept.className = 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg';
                    accept.title = 'Accept';
                    accept.textContent = '✓';
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
                    decline.className = 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg';
                    decline.title = 'Decline';
                    decline.textContent = '✗';
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
                    const cancel = document.createElement('button');
                    cancel.className = 'bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 border border-white/10';
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
                    const remove = document.createElement('button');
                    remove.className = 'opacity-0 group-hover:opacity-100 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 border border-red-500/30 hover:border-red-500/50';
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
            listEl.innerHTML = `<p class="text-red-400 text-center py-8">Error loading friends</p>`;
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
                            statusBadge.textContent = 'Busy';
                            statusBadge.className += ' bg-red-500/20 text-red-400';
                        } else if (status === 'Away') {
                            statusBadge.textContent = 'Away';
                            statusBadge.className += ' bg-amber-500/20 text-amber-400';
                        } else {
                            statusBadge.textContent = 'Online';
                            statusBadge.className += ' bg-green-500/20 text-green-400';
                        }
                    } else {
                        statusBadge.textContent = 'Offline';
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

        // Always minimize all open chat windows when toggling (both opening and closing)
        this.openChats.forEach((chat) => {
            if (!chat.minimized) {
                chat.minimized = true;
                chat.box.classList.add('chat-minimized');
                chat.messagesEl.style.display = 'none';
                chat.inputEl.parentElement!.style.display = 'none';

                const minBtn = chat.box.querySelector('button[title="Minimize"]') as HTMLElement | null;
                if (minBtn) minBtn.style.display = 'none';

                const header = chat.box.querySelector('.flex.items-center.justify-between') as HTMLElement;
                if (header) {
                    header.classList.add('cursor-pointer');
                }
            }
        });

        this.panel.classList.toggle('hidden', !this.visible);
        this.panel.classList.toggle('block', this.visible);
        this.btn!.classList.toggle('bg-accent-pink', this.visible);
    }

    private registerGlobalMessageListener(): void {
        if (this.directMessageHandler) {
            return;
        }

        this.directMessageHandler = async (ev: Event) => {
            try {
                const d = (ev as CustomEvent).detail;
                if (!d) return;
                const fromId = Number(d.from);
                const meId = AuthService.getUser()?.id;
                const msgId = d.id ? Number(d.id) : null;

                if (fromId === meId) return;

                // Prevent duplicate display
                if (msgId && this.displayedMessageIds.has(msgId)) {
                    return;
                }
                if (msgId) {
                    this.displayedMessageIds.add(msgId);
                    if (this.displayedMessageIds.size > 100) {
                        const firstId = this.displayedMessageIds.values().next().value;
                        if (firstId !== undefined) {
                            this.displayedMessageIds.delete(firstId);
                        }
                    }
                }
                
                const chat = this.openChats.get(fromId);
                const isOpening = this.openingChats.has(fromId);
                
                if (chat) {
                    // Hide timestamp on previous message from same sender
                    const lastMsg = chat.messagesEl.lastElementChild;
                    if (lastMsg && lastMsg.classList.contains('text-left')) {
                        const timestamp = lastMsg.querySelector('.timestamp');
                        if (timestamp) timestamp.classList.add('hidden');
                    }

                    const el = document.createElement('div');
                    el.className = `mb-2 text-left`;
                    el.setAttribute('data-message-id', String(msgId || ''));
                    el.setAttribute('data-timestamp', d.created_at || new Date().toISOString());
                    el.setAttribute('data-sender-id', String(fromId));
                    el.innerHTML = `
                        <div class="inline-block px-3 py-1 rounded bg-gray-700">${d.content}</div>
                        <div class="text-xs text-gray-400 mt-1 timestamp">${this.formatTimestamp(d.created_at)}</div>
                    `;
                    chat.messagesEl.appendChild(el);
                    chat.messagesEl.scrollTop = chat.messagesEl.scrollHeight;

                    // Auto-restore if minimized (only if not Busy)
                    const user = AuthService.getUser();
                    const userStatus = (user as any)?.status || 'Online';
                    
                    if (chat.minimized && userStatus !== 'Busy') {
                        chat.minimized = false;
                        chat.box.classList.remove('chat-minimized');
                        chat.messagesEl.style.display = '';
                        const inputRow = chat.box.querySelector('.chat-input-row') as HTMLElement | null;
                        if (inputRow) inputRow.style.display = '';
                        const badge = chat.box.querySelector('.chat-unread') as HTMLElement | null;
                        if (badge) { badge.classList.add('hidden'); badge.textContent = ''; }
                        const minBtn = chat.box.querySelector('button[title="Minimize"]') as HTMLElement | null;
                        if (minBtn) minBtn.style.display = '';
                    }
                } else if (!isOpening) {
                    // Check if user is in Busy mode before auto-opening
                    const user = AuthService.getUser();
                    const userStatus = (user as any)?.status || 'Online';
                    
                    if (userStatus === 'Busy') {
                        // Don't auto-open chat window if user is Busy
                        return;
                    }
                    
                    // Auto-open chat window for new message
                    this.openingChats.add(fromId);
                    
                    const friendName = await this.getFriendName(fromId);
                    if (friendName) {
                        await this.openChatWindow(fromId, friendName, { content: d.content, msgId, timestamp: d.created_at });
                    } else {
                        this.openingChats.delete(fromId);
                    }
                }
                await this.refreshNow();
            } catch (e) {
                // ignore
            }
        };
        window.addEventListener('direct_message', this.directMessageHandler);
    }

    private formatTimestamp(dateString: string): string {
        if (!dateString) return 'Just now';
        try {
            const date = new Date(dateString + 'Z');
            if (isNaN(date.getTime())) return 'Just now';

            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);

            if (diffSec < 10) return 'Just now';
            if (diffSec < 60) return `${diffSec}s ago`;
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHour < 24) return `${diffHour}h ago`;
            if (diffDay === 1) return 'Yesterday';
            if (diffDay < 7) return `${diffDay}d ago`;
            
            return date.toLocaleDateString();
        } catch (e) {
            return 'Just now';
        }
    }

    private updateAllTimestamps(): void {
        this.openChats.forEach((chat) => {
            const messages = chat.messagesEl.querySelectorAll('[data-timestamp]');
            messages.forEach((msgEl) => {
                const timestamp = msgEl.getAttribute('data-timestamp');
                const timeEl = msgEl.querySelector('.timestamp') as HTMLElement | null;
                if (timestamp && timeEl) {
                    timeEl.textContent = this.formatTimestamp(timestamp);
                }
            });
        });
    }

    private startTimestampUpdates(): void {
        if (this.timestampUpdateInterval) return;
        this.timestampUpdateInterval = window.setInterval(() => {
            this.updateAllTimestamps();
        }, 10000) as unknown as number; // Update every 10 seconds
    }

    private async getFriendName(userId: number): Promise<string | null> {
        try {
            const me = AuthService.getUser();
            if (!me) return null;
            
            const friends = await AuthService.getFriends(me.id);
            const friend = friends.find((f: any) => f.id === userId);
            return friend ? (friend.display_name || friend.username) : null;
        } catch (e) {
            return null;
        }
    }

    private startPolling(): void {
        if (this.intervalId) return;
        this.intervalId = window.setInterval(() => {
            if (this.visible) this.refreshNow();
        }, 15000) as unknown as number;
    }

    private async openChatWindow(peerId: number, peerName: string, incomingMessage?: { content: string; msgId: number | null; timestamp?: string }): Promise<void> {
        if (!this.chatContainer) {
            this.chatContainer = document.getElementById('chat-windows-root') as HTMLElement | null;
            if (!this.chatContainer) {
                this.chatContainer = document.createElement('div');
                this.chatContainer.id = 'chat-windows-root';
                this.chatContainer.className = 'fixed bottom-5 flex flex-row-reverse gap-3 z-[10000] items-end';
                document.body.appendChild(this.chatContainer);
            }
        }

        const existing = this.openChats.get(peerId);
        if (existing) {
            if (existing.minimized) {
                existing.minimized = false;
                existing.box.classList.remove('chat-minimized');
                existing.messagesEl.classList.remove('hidden');
                const inputRow = existing.box.querySelector('.chat-input-row') as HTMLElement | null;
                if (inputRow) inputRow.classList.remove('hidden');
                const badge = existing.box.querySelector('.chat-unread') as HTMLElement | null;
                if (badge) { badge.classList.add('hidden'); badge.textContent = ''; }
                const minBtn = existing.box.querySelector('button[title="Minimize"]') as HTMLElement | null;
                if (minBtn) minBtn.style.display = '';
            }
            existing.inputEl.focus();
            this.closePanel();
            return;
        }

        const box = document.createElement('div');
        box.className = 'w-80 rounded-2xl shadow-2xl flex flex-col chat-box bg-gradient-to-b from-game-dark to-blue-900/90 border border-white/10 transition-all duration-300';

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 backdrop-blur-sm rounded-t-2xl border-b border-white/10 flex-shrink-0';
        
        const title = document.createElement('div');
        title.className = 'text-sm text-white font-bold truncate';
        title.textContent = peerName;

        const controls = document.createElement('div');
        controls.className = 'flex items-center gap-2';

        const minBtn = document.createElement('button');
        minBtn.textContent = '−';
        minBtn.title = 'Minimize';
        minBtn.className = 'text-gray-300 hover:text-accent-pink transition-colors';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close';
        closeBtn.className = 'text-gray-300 hover:text-red-400 transition-colors';

        controls.appendChild(minBtn);
        controls.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(controls);

        const messagesEl = document.createElement('div');
        messagesEl.className = 'px-4 py-3 flex-1 overflow-auto text-sm chat-messages';

        const inputRow = document.createElement('div');
        inputRow.className = 'px-4 py-3 flex gap-2 border-t border-white/10 chat-input-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Write a message…';
        input.className = 'flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm';

        const send = document.createElement('button');
        send.textContent = 'Send';
        send.className = 'px-4 py-2 bg-gradient-to-r from-accent-pink to-accent-purple text-white rounded-lg text-sm';

        inputRow.appendChild(input);
        inputRow.appendChild(send);

        box.appendChild(header);
        box.appendChild(messagesEl);
        box.appendChild(inputRow);

        if (this.chatContainer) this.chatContainer.insertBefore(box, this.chatContainer.firstChild);

        // Register IMMEDIATELY to prevent race condition
        this.openChats.set(peerId, { box, messagesEl, inputEl: input, minimized: false });
        this.openingChats.delete(peerId);

        // Start timestamp updates if not already running
        this.startTimestampUpdates();

        // Load history and display incoming message if provided
        try {
            const history = await AuthService.getMessages(peerId);
            messagesEl.innerHTML = '';

            if (history && Array.isArray(history)) {
                history.forEach((msg: any, index: number) => {
                    const isMe = msg.sender_id === AuthService.getUser()?.id;
                    const currentSenderId = msg.sender_id;
                    const isLastInSequence = index === history.length - 1 || history[index + 1]?.sender_id !== currentSenderId;
                    
                    const el = document.createElement('div');
                    el.className = `mb-2 ${isMe ? 'text-right' : 'text-left'}`;
                    el.setAttribute('data-message-id', String(msg.id || ''));
                    el.setAttribute('data-timestamp', msg.created_at || '');
                    el.setAttribute('data-sender-id', String(currentSenderId));
                    const bgClass = isMe ? 'bg-blue-600' : 'bg-gray-700';
                    
                    // Only show timestamp on last message in sequence
                    const timestampHtml = isLastInSequence 
                        ? `<div class="text-xs text-gray-400 mt-1 timestamp">${this.formatTimestamp(msg.created_at)}</div>`
                        : `<div class="text-xs text-gray-400 mt-1 timestamp hidden">${this.formatTimestamp(msg.created_at)}</div>`;
                    
                    el.innerHTML = `
                        <div class="inline-block px-3 py-1 rounded ${bgClass}">${msg.content}</div>
                        ${timestampHtml}
                    `;
                    messagesEl.appendChild(el);
                });
            }

            // Display the incoming message that triggered the window to open
            if (incomingMessage && incomingMessage.msgId && !this.displayedMessageIds.has(incomingMessage.msgId)) {
                const el = document.createElement('div');
                el.className = 'mb-2 text-left';
                el.setAttribute('data-message-id', String(incomingMessage.msgId || ''));
                el.setAttribute('data-timestamp', incomingMessage.timestamp || new Date().toISOString());
                el.setAttribute('data-sender-id', String(peerId));
                el.innerHTML = `
                    <div class="inline-block px-3 py-1 rounded bg-gray-700">${incomingMessage.content}</div>
                    <div class="text-xs text-gray-400 mt-1 timestamp">${this.formatTimestamp(incomingMessage.timestamp || '')}</div>
                `;
                messagesEl.appendChild(el);
                if (incomingMessage.msgId) {
                    this.displayedMessageIds.add(incomingMessage.msgId);
                }
            }

            messagesEl.scrollTop = messagesEl.scrollHeight;
        } catch (err) {
            messagesEl.innerHTML = '<p class="text-gray-400 text-center py-4">Failed to load messages</p>';
        }

        const sendMessage = async () => {
            const txt = input.value.trim();
            if (!txt) return;
            try {
                await AuthService.sendMessage(peerId, txt);
                
                // Hide timestamp on previous message from me
                const lastMsg = messagesEl.lastElementChild;
                if (lastMsg && lastMsg.classList.contains('text-right')) {
                    const timestamp = lastMsg.querySelector('.timestamp');
                    if (timestamp) timestamp.classList.add('hidden');
                }
                
                const el = document.createElement('div');
                el.className = 'mb-2 text-right';
                el.setAttribute('data-timestamp', new Date().toISOString());
                el.setAttribute('data-sender-id', String(AuthService.getUser()?.id || ''));
                el.innerHTML = `
                    <div class="inline-block px-3 py-1 rounded bg-blue-600">${txt}</div>
                    <div class="text-xs text-gray-400 mt-1 timestamp">Just now</div>
                `;
                messagesEl.appendChild(el);
                messagesEl.scrollTop = messagesEl.scrollHeight;
                input.value = '';
            } catch (err: any) {
                await (window as any).app.showInfo('Send failed', AuthService.extractErrorMessage(err));
            }
        };

        send.onclick = sendMessage;
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Minimize / restore functionality
        minBtn.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            const info = this.openChats.get(peerId);
            if (!info) return;
            info.minimized = !info.minimized;
            info.box.classList.toggle('chat-minimized', info.minimized);
            
            if (info.minimized) {
                messagesEl.style.display = 'none';
                inputRow.style.display = 'none';
                header.classList.add('cursor-pointer');
                minBtn.style.display = 'none';
            } else {
                messagesEl.style.display = '';
                inputRow.style.display = '';
                header.classList.remove('cursor-pointer');
                minBtn.style.display = '';
                input.focus();
            }
        };

        closeBtn.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            if (this.chatContainer && this.chatContainer.contains(box)) {
                this.chatContainer.removeChild(box);
            }
            this.openChats.delete(peerId);
        };

        // Make header clickable to restore when minimized
        header.onclick = (e: MouseEvent) => {
            const info = this.openChats.get(peerId);
            if (!info || !info.minimized) return;

            const target = e.target as HTMLElement;
            if (target.closest('button')) return;

            info.minimized = false;
            info.box.classList.remove('chat-minimized');
            messagesEl.style.display = '';
            inputRow.style.display = '';
            header.classList.remove('cursor-pointer');
            minBtn.style.display = '';
            input.focus();
        };

        setTimeout(() => input.focus(), 50);
    }

    unmount(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.timestampUpdateInterval) {
            clearInterval(this.timestampUpdateInterval);
            this.timestampUpdateInterval = null;
        }
        if (this.directMessageHandler) {
            window.removeEventListener('direct_message', this.directMessageHandler);
            this.directMessageHandler = null;
        }
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
        if (this.authChangeHandler) {
            window.removeEventListener('auth:change', this.authChangeHandler);
            this.authChangeHandler = null;
        }
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }
        if (this.chatContainer && document.body.contains(this.chatContainer)) {
            document.body.removeChild(this.chatContainer);
        }
        this.openChats.clear();
        this.displayedMessageIds.clear();
        this.openingChats.clear();
        try {
            if ((window as any)._friendWidget === this) delete (window as any)._friendWidget;
        } catch (e) { }
        this.root = null;
        this.panel = null;
        this.btn = null;
        this.searchInput = null;
        this.searchBtn = null;
    }
}
