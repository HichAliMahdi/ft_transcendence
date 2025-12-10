import { AuthService } from '../game/AuthService';
import { StatusWidget } from './StatusWidget';
import { ChatWidget } from './ChatWidget';

export class FriendWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private searchInput: HTMLInputElement | null = null;
    private searchBtn: HTMLButtonElement | null = null;
    private authChangeHandler: ((e?: Event) => void) | null = null;
    private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
    private statusWidget: StatusWidget | null = null;
    private chatWidget: ChatWidget | null = null;

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

        // Initialize ChatWidget
        this.chatWidget = new ChatWidget();
        this.chatWidget.mount();

        // Initialize StatusWidget
        this.statusWidget = new StatusWidget();
        this.statusWidget.render(this.panel);

        // Friends Header
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
        this.setupClickOutsideListener();
    }

    private setupClickOutsideListener(): void {
        this.clickOutsideHandler = (e: MouseEvent) => {
            if (!this.visible || !this.root) return;

            const target = e.target as Node;
            if (this.root.contains(target)) return;

            // Check if clicking inside any chat window
            if (this.chatWidget) {
                const chatContainer = document.getElementById('chat-windows-root');
                if (chatContainer && chatContainer.contains(target)) return;
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
                    if (this.chatWidget) {
                        this.chatWidget.openChatWindow(f.id, f.display_name || f.username);
                    }
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

    updateFriendPresence(userId: number, status: string, isOnline: boolean): void {
        if (!this.panel) return;

        const listEl = this.panel.querySelector('#friend-list') as HTMLElement | null;
        if (!listEl) return;

        const rows = listEl.querySelectorAll('div[data-friend-id]');
        rows.forEach((row) => {
            const friendId = parseInt(row.getAttribute('data-friend-id') || '0');
            if (friendId === userId) {
                const statusBadge = row.querySelector('.status-text') as HTMLElement | null;

                if (statusBadge && !statusBadge.textContent?.includes('Pending')) {
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

        if (this.visible) {
            const nw = (window as any)._notificationWidget;
            if (nw && nw !== this && typeof nw.closePanel === 'function') {
                try { nw.closePanel(); } catch (e) { /* ignore */ }
            }
        }

        // Minimize all chat windows when toggling
        if (this.chatWidget) {
            this.chatWidget.minimizeAll();
        }

        this.panel.classList.toggle('hidden', !this.visible);
        this.panel.classList.toggle('block', this.visible);
        this.btn!.classList.toggle('bg-accent-pink', this.visible);
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
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
        if (this.authChangeHandler) {
            window.removeEventListener('auth:change', this.authChangeHandler);
            this.authChangeHandler = null;
        }
        if (this.statusWidget) {
            this.statusWidget.destroy();
            this.statusWidget = null;
        }
        if (this.chatWidget) {
            this.chatWidget.unmount();
            this.chatWidget = null;
        }
        if (this.root && document.body.contains(this.root)) {
            document.body.removeChild(this.root);
        }
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
