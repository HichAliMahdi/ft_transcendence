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

