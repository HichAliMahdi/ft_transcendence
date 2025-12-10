import { AuthService } from '../game/AuthService';

interface ChatWindow {
    box: HTMLElement;
    messagesEl: HTMLElement;
    inputEl: HTMLInputElement;
    minimized: boolean;
}

export class ChatWidget {
    private chatContainer: HTMLElement | null = null;
    private openChats: Map<number, ChatWindow> = new Map();
    private openingChats: Set<number> = new Set();
    private displayedMessageIds: Set<number> = new Set();
    private timestampUpdateInterval: number | null = null;
    private directMessageHandler: ((ev: Event) => void) | null = null;
    private presenceUpdateHandler: ((ev: Event) => void) | null = null;

    mount(): void {
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

        this.registerGlobalMessageListener();
        this.registerPresenceUpdateListener();
        this.startTimestampUpdates();
    }

    private registerGlobalMessageListener(): void {
        if (this.directMessageHandler) return;

        this.directMessageHandler = async (ev: Event) => {
            try {
                const d = (ev as CustomEvent).detail;
                if (!d) return;
                const fromId = Number(d.from);
                const meId = AuthService.getUser()?.id;
                const msgId = d.id ? Number(d.id) : null;

                if (fromId === meId) return;

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
                    const user = AuthService.getUser();
                    const userStatus = (user as any)?.status || 'Online';
                    
                    if (userStatus === 'Busy') {
                        return;
                    }
                    
                    this.openingChats.add(fromId);
                    
                    const friendName = await this.getFriendName(fromId);
                    if (friendName) {
                        await this.openChatWindow(fromId, friendName, { content: d.content, msgId, timestamp: d.created_at });
                    } else {
                        this.openingChats.delete(fromId);
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        window.addEventListener('direct_message', this.directMessageHandler);
    }

    private registerPresenceUpdateListener(): void {
        if (this.presenceUpdateHandler) return;

        this.presenceUpdateHandler = (ev: Event) => {
            try {
                const detail = (ev as CustomEvent).detail;
                if (!detail || !detail.user_id) return;

                const userId = Number(detail.user_id);
                const status = detail.status || 'Online';
                const isOnline = detail.is_online !== false;

                // Update status dot in chat window header if chat is open for this user
                const chat = this.openChats.get(userId);
                if (chat) {
                    const statusDot = chat.box.querySelector('.w-2\\.5.h-2\\.5.rounded-full') as HTMLElement | null;
                    if (statusDot) {
                        let statusColor = '#94a3b8'; // Offline
                        if (isOnline) {
                            if (status === 'Busy') statusColor = '#ef4444';
                            else if (status === 'Away') statusColor = '#f59e0b';
                            else statusColor = '#22c55e'; // Online
                        }
                        statusDot.style.backgroundColor = statusColor;
                        
                        // Update glow effect
                        if (isOnline && status !== 'Offline') {
                            statusDot.className = 'w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]';
                        } else {
                            statusDot.className = 'w-2.5 h-2.5 rounded-full flex-shrink-0';
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        };

        window.addEventListener('presence:update', this.presenceUpdateHandler);
    }

    private formatTimestamp(dateString: string): string {
        if (!dateString) return 'Just now';
        try {
            // Parse the date string - if it doesn't end with 'Z', assume it's UTC
            let date: Date;
            if (dateString.endsWith('Z')) {
                date = new Date(dateString);
            } else {
                // Append 'Z' to treat as UTC
                date = new Date(dateString + 'Z');
            }
            
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
        }, 10000) as unknown as number;
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

    async openChatWindow(peerId: number, peerName: string, incomingMessage?: { content: string; msgId: number | null; timestamp?: string }): Promise<void> {
        if (!this.chatContainer) {
            this.chatContainer = document.getElementById('chat-windows-root') as HTMLElement | null;
            if (!this.chatContainer) {
                this.mount();
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
            return;
        }

        const box = document.createElement('div');
        box.className = 'w-80 rounded-2xl shadow-2xl flex flex-col chat-box bg-gradient-to-b from-game-dark to-blue-900/90 border border-white/10 transition-all duration-300';

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 backdrop-blur-sm rounded-t-2xl border-b border-white/10 flex-shrink-0';
        
        const titleContainer = document.createElement('div');
        titleContainer.className = 'flex items-center gap-2';

        const me = AuthService.getUser();
        let statusColor = '#94a3b8';
        if (me) {
            try {
                const friends = await AuthService.getFriends(me.id);
                const friend = friends.find((f: any) => f.id === peerId);
                if (friend && friend.is_online) {
                    const userStatus = (friend as any).user_status || 'Online';
                    if (userStatus === 'Busy') statusColor = '#ef4444';
                    else if (userStatus === 'Away') statusColor = '#f59e0b';
                    else statusColor = '#22c55e';
                }
            } catch (e) {
                // Keep default color
            }
        }

        const statusDot = document.createElement('span');
        statusDot.className = 'w-2.5 h-2.5 rounded-full flex-shrink-0';
        statusDot.style.backgroundColor = statusColor;
        if (statusColor !== '#94a3b8') {
            statusDot.className += ' shadow-[0_0_8px_currentColor]';
        }

        const title = document.createElement('div');
        title.className = 'text-sm text-white font-bold truncate';
        title.textContent = peerName;

        titleContainer.appendChild(statusDot);
        titleContainer.appendChild(title);

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

        header.appendChild(titleContainer);
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

        this.openChats.set(peerId, { box, messagesEl, inputEl: input, minimized: false });
        this.openingChats.delete(peerId);

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

    minimizeAll(): void {
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
    }

    unmount(): void {
        if (this.timestampUpdateInterval) {
            clearInterval(this.timestampUpdateInterval);
            this.timestampUpdateInterval = null;
        }
        if (this.directMessageHandler) {
            window.removeEventListener('direct_message', this.directMessageHandler);
            this.directMessageHandler = null;
        }
        if (this.presenceUpdateHandler) {
            window.removeEventListener('presence:update', this.presenceUpdateHandler);
            this.presenceUpdateHandler = null;
        }
        if (this.chatContainer && document.body.contains(this.chatContainer)) {
            document.body.removeChild(this.chatContainer);
        }
        this.openChats.clear();
        this.displayedMessageIds.clear();
        this.openingChats.clear();
        this.chatContainer = null;
    }
}
