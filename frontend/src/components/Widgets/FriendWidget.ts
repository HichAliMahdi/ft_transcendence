import { AuthService } from '../game/AuthService';

export class FriendWidget {
    private root: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private btn: HTMLElement | null = null;
    private intervalId: number | null = null;
    private visible = false;
    private searchInput: HTMLInputElement | null = null;
    private searchBtn: HTMLButtonElement | null = null;


    mount(): void {
        const existing = document.getElementById('friend-widget-root');
        if (existing) {
            this.root = existing as HTMLElement;
            this.panel = this.root.querySelector('#friend-widget-panel') as HTMLElement | null;
            this.btn = this.root.querySelector('#friend-widget-btn') as HTMLElement | null;
            this.searchInput = this.root.querySelector('#friend-widget-search-input') as HTMLInputElement | null;
            this.searchBtn = this.root.querySelector('#friend-widget-search-btn') as HTMLButtonElement | null;
            this.startPolling();
            return;
        }

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
                alert('Enter a username'); 
                return; 
            }
            try {
                await AuthService.sendFriendRequestByUsername(val);
                this.searchInput!.value = '';
                this.refreshNow();
                alert(`Friend request sent to ${val}`);
            } catch (err: any) {
                alert(`Failed to send request: ${err?.message || err}`);
            }
        };
        searchContainer.appendChild(this.searchBtn);

        header.appendChild(searchContainer);
        this.panel.appendChild(header);

        // Friends list container
        const list = document.createElement('div');
        list.id = 'friend-list';
        this.panel.appendChild(list);

        this.refreshNow();
        this.startPolling();
    }
