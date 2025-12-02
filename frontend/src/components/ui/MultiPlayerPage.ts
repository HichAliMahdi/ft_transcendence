import { OnlinePongGame } from '../game/OnlinePongGame';
import { AuthService } from '../game/AuthService';
import { FriendWidget } from '../Widgets/FriendWidget';

export class MultiplayerPage {
    private game: OnlinePongGame | null = null;
    private container: HTMLElement | null = null;
    private socket: WebSocket | null = null;
    private roomId: string | null = null;
    private status: 'disconnected' | 'connecting' | 'waiting' | 'playing' = 'disconnected';
    private isHost: boolean = false;
    private friendWidget: FriendWidget | null = null;
    private playerNumber: 1 | 2 | null = null;
    private opponentUser: { id?: number; username?: string; display_name?: string } | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 fade-in'
        this.renderConnectionScreen();

        if (!this.friendWidget) {
            this.friendWidget = (window as any)._friendWidget || null;
        }

        return this.container;
    }

    private renderConnectionScreen(): void {
        if (!this.container) return;
        this.container.innerHTML = '';

        const title = document.createElement('h1');
        title.textContent = 'Online Multiplayer';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        const connectionCard = document.createElement('div');
        connectionCard.className = 'glass-effect p-8 rounded-2xl max-w-md mx-auto';

        if (this.status === 'disconnected') {
            const quickMatchButton = document.createElement('button');
            quickMatchButton.textContent = '🎮 Find Online Match';
            quickMatchButton.className = 'btn-primary w-full text-lg py-4 mb-4';
            quickMatchButton.onclick = () => this.joinQueue();

            const divider = document.createElement('div');
            divider.className = 'flex items-center my-6';
            const dividerLine1 = document.createElement('div');
            dividerLine1.className = 'flex-1 h-px bg-gray-600';
            const dividerText = document.createElement('span');
            dividerText.className = 'px-4 text-gray-400 text-sm';
            dividerText.textContent = 'OR';
            const dividerLine2 = document.createElement('div');
            dividerLine2.className = 'flex-1 h-px bg-gray-600';
            divider.appendChild(dividerLine1);
            divider.appendChild(dividerText);
            divider.appendChild(dividerLine2);

            const createRoomButton = document.createElement('button');
            createRoomButton.textContent = '🏠 Create Private Room';
            createRoomButton.className = 'btn-primary w-full text-lg py-4 mb-3';
            createRoomButton.onclick = () => this.createPrivateRoom();

            const joinRoomContainer = document.createElement('div');
            joinRoomContainer.className = 'mt-4';

            const joinRoomTitle = document.createElement('p');
            joinRoomTitle.className = 'text-gray-300 text-sm mb-2 text-center';
            joinRoomTitle.textContent = 'Have a room code?';

            const joinRoomInputContainer = document.createElement('div');
            joinRoomInputContainer.className = 'flex gap-2';

            const roomCodeInput = document.createElement('input');
            roomCodeInput.type = 'text';
            roomCodeInput.placeholder = 'Enter room code';
            roomCodeInput.className = 'flex-1 px-4 py-2 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none';
            roomCodeInput.maxLength = 9;

            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.className = 'bg-accent-purple hover:bg-purple-600 text-white font-bold px-6 py-2 rounded-lg transition-colors duration-300';
            joinButton.onclick = () => {
                const code = roomCodeInput.value.trim();
                if (code) {
                    this.joinPrivateRoom(code);
                }
            };

            joinRoomInputContainer.appendChild(roomCodeInput);
            joinRoomInputContainer.appendChild(joinButton);
            joinRoomContainer.appendChild(joinRoomTitle);
            joinRoomContainer.appendChild(joinRoomInputContainer);

            connectionCard.appendChild(quickMatchButton);
            connectionCard.appendChild(divider);
            connectionCard.appendChild(createRoomButton);
            connectionCard.appendChild(joinRoomContainer);

        } else if (this.status === 'connecting') {
            const statusText = document.createElement('p');
            statusText.textContent = 'Connecting to server...';
            statusText.className = 'text-white text-center text-lg';

            const spinner = document.createElement('div');
            spinner.className = 'loader mx-auto my-4';

            connectionCard.appendChild(statusText);
            connectionCard.appendChild(spinner);
            
        } else if (this.status === 'waiting') {
            const statusText = document.createElement('p');
            statusText.className = 'text-white text-center text-lg mb-4';
            
            if (this.isHost) {
                statusText.textContent = 'Waiting for opponent to join...';
                
                const roomCodeDisplay = document.createElement('div');
                roomCodeDisplay.className = 'bg-game-dark p-6 rounded-xl my-6';
                
                const codeLabel = document.createElement('p');
                codeLabel.className = 'text-gray-400 text-sm mb-2 text-center';
                codeLabel.textContent = 'Share this code with your friend:';
                
                const codeValue = document.createElement('p');
                codeValue.className = 'text-3xl font-bold text-accent-pink text-center tracking-wider';
                codeValue.textContent = this.roomId || '';
                
                const copyButton = document.createElement('button');
                copyButton.textContent = '📋 Copy Code';
                copyButton.className = 'bg-accent-purple hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 mt-4 mx-auto block';
                copyButton.onclick = () => {
                    navigator.clipboard.writeText(this.roomId || '');
                    copyButton.textContent = '✓ Copied!';
                    setTimeout(() => {
                        copyButton.textContent = '📋 Copy Code';
                    }, 2000);
                };
                
                roomCodeDisplay.appendChild(codeLabel);
                roomCodeDisplay.appendChild(codeValue);
                roomCodeDisplay.appendChild(copyButton);
                
                connectionCard.appendChild(statusText);
                connectionCard.appendChild(roomCodeDisplay);
            } else {
                statusText.textContent = 'Looking for opponent...';
                
                const spinner = document.createElement('div');
                spinner.className = 'loader mx-auto my-4';
                
                connectionCard.appendChild(statusText);
                connectionCard.appendChild(spinner);
            }

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Leave Queue/Room';
            cancelButton.className = 'bg-game-red hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4';
            cancelButton.onclick = () => this.disconnect();
            
            connectionCard.appendChild(cancelButton);
        }

        const instructions = document.createElement('div');
        instructions.className = 'glass-effect p-6 rounded-2xl mt-8 max-w-2xl mx-auto';

        const instructionsTitle = document.createElement('h3');
        instructionsTitle.textContent = 'How to Play Online';
        instructionsTitle.className = 'text-xl font-semibold text-white mb-4 text-center';

        const instructionsList = document.createElement('ul');
        instructionsList.className = 'text-gray-300 space-y-2';

        const points = [
            'Quick Match: Get paired with a random opponent automatically',
            'Private Room: Create a room and share the code with a friend',
            'Join Room: Enter a room code to join a friend\'s game',
            'Control your paddle using W (up) and S (down) keys',
            'First to 5 points wins the match'
        ];

        points.forEach(point => {
            const li = document.createElement('li');
            li.className = 'flex items-start';
            
            const bullet = document.createElement('span');
            bullet.textContent = '•';
            bullet.className = 'mr-2 text-accent-pink';
            
            li.appendChild(bullet);
            li.appendChild(document.createTextNode(point));
            instructionsList.appendChild(li);
        });

        instructions.appendChild(instructionsTitle);
        instructions.appendChild(instructionsList);

        this.container.appendChild(title);
        this.container.appendChild(connectionCard);
        this.container.appendChild(instructions);
    }

    private renderGameScreen(): void {
        if (!this.container) return;

        this.container.innerHTML = '';

        const title = document.createElement('h1');
        title.textContent = 'Online Match';
        title.className = 'text-3xl font-bold text-white text-center mb-4 gradient-text';

        const gameInfo = document.createElement('div');
        gameInfo.className = 'text-center mb-6 glass-effect p-4 rounded-xl';
        
        const roomInfo = document.createElement('p');
        roomInfo.textContent = `Room: ${this.roomId}`;
        roomInfo.className = 'text-gray-300 mb-2';

        const opponentInfo = document.createElement('p');
        opponentInfo.textContent = 'Opponent: Connected';
        opponentInfo.className = 'text-green-400 mb-2';

        const controlsInfo = document.createElement('p');
        controlsInfo.textContent = 'Controls: W (up) / S (down)';
        controlsInfo.className = 'text-gray-300';

        gameInfo.appendChild(roomInfo);
        gameInfo.appendChild(opponentInfo);
        gameInfo.appendChild(controlsInfo);

        const canvas = document.createElement('canvas');
        canvas.id = 'onlineGameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.className = 'border-2 border-game-dark bg-black mx-auto my-6 rounded-xl block';

        const disconnectButton = document.createElement('button');
        disconnectButton.textContent = 'Leave Game';
        disconnectButton.className = 'bg-game-red hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4';
        disconnectButton.onclick = () => this.disconnect();

        // Quick Add Friend button - uses opponent username when available
        const addFriendButton = document.createElement('button');
        addFriendButton.textContent = '➕ Add Friend';
        addFriendButton.className = 'bg-accent-purple hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-4 ml-4';
        addFriendButton.onclick = async () => {
            // If we know opponent's username from server, use it directly
            const oppUsername = this.opponentUser?.username;
            if (oppUsername) {
                try {
                    await AuthService.sendFriendRequestByUsername(oppUsername);
                    await (window as any).app.showInfo('Friend Request Sent', `Friend request sent to ${oppUsername}`);
                    this.friendWidget?.refreshNow();
                    return;
                } catch (err: any) {
                    await (window as any).app.showInfo('Failed to send friend request', AuthService.extractErrorMessage(err) || String(err));
                    return;
                }
            }

            // Fallback: open a UI modal to enter username (replaces prompt)
            this.showInputModal(
                'Add Friend',
                'Enter username',
                'Send Request',
                async (username: string) => {
                    const u = username.trim();
                    if (!u) {
                        // showInputModal will prevent empty callback, but guard here too
                        alert('Please enter a valid username');
                        return;
                    }
                    try {
                        await AuthService.sendFriendRequestByUsername(u);
                        await (window as any).app.showInfo('Friend Request Sent', `Friend request sent to ${u}`);
                        this.friendWidget?.refreshNow();
                    } catch (err: any) {
                        await (window as any).app.showInfo('Failed to send friend request', AuthService.extractErrorMessage(err) || String(err));
                    }
                }
            );
        };

        const topRow = document.createElement('div');
        topRow.className = 'flex justify-center gap-4';
        topRow.appendChild(disconnectButton);
        topRow.appendChild(addFriendButton);

        this.container.appendChild(title);
        this.container.appendChild(gameInfo);
        this.container.appendChild(canvas);
        this.container.appendChild(topRow);

        if (this.socket) {
            this.game = new OnlinePongGame(canvas, this.socket);
        } else {
            this.game = new OnlinePongGame(canvas, this.createLocalSocketShim());
        }
    }

    private createLocalSocketShim(): WebSocket {
        const url = 'about:blank';
        const ws = new WebSocket(url);
        setTimeout(() => { try { ws.close(); } catch (e) {} }, 10);
        return ws;
    }

    private buildWsUrl(room?: string, trailingSlash = true, extraQuery?: Record<string, string | boolean>): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || `${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        const base = `${protocol}//${host}`;
        
        // Get authentication token
        const token = AuthService.getToken();
        const params: string[] = [];
        if (token) params.push(`token=${encodeURIComponent(token)}`);

        if (extraQuery) {
            for (const k of Object.keys(extraQuery)) {
                const v = extraQuery[k];
                if (v === true) params.push(`${encodeURIComponent(k)}=1`);
                else params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
            }
        }

        const qs = params.length ? `?${params.join('&')}` : '';

        if (room) {
            return `${base}/ws/${encodeURIComponent(room)}${qs}`;
        } else {
            const path = trailingSlash ? '/ws/' : '/ws';
            return `${base}${path}${qs}`;
        }
    }

    private connectWithRoom(room?: string, extraQuery?: Record<string, string | boolean>): void {
        this.status = 'connecting';
        this.renderConnectionScreen();

        const candidates: string[] = [];
        const prefersSecure = window.location.protocol === 'https:';
        candidates.push(this.buildWsUrl(room, true, extraQuery));
        candidates.push(this.buildWsUrl(room, false, extraQuery));
        
        if (!prefersSecure) {
            const alt1 = this.buildWsUrl(room, true, extraQuery).replace(/^wss:/i, 'ws:');
            const alt2 = this.buildWsUrl(room, false, extraQuery).replace(/^wss:/i, 'ws:');
            candidates.push(alt1, alt2);
        }

        const tryConnect = async (idx = 0) => {
            if (idx >= candidates.length) {
                console.error('All WebSocket connection attempts failed:', candidates);
                alert('WebSocket connection failed. Make sure the server is running and your browser trusts the TLS certificate.');
                this.status = 'disconnected';
                this.renderConnectionScreen();
                return;
            }

            const wsUrl = candidates[idx];
            console.info('Attempting WebSocket:', wsUrl);

            let socket: WebSocket | null = null;
            let timedOut = false;
            const timeoutMs = 8000;

            try {
                socket = new WebSocket(wsUrl);
            } catch (err) {
                console.error('WebSocket constructor threw:', err, wsUrl);
                return tryConnect(idx + 1);
            }

            const to = window.setTimeout(() => {
                timedOut = true;
                try {
                    socket?.close();
                } catch (e) {}
            }, timeoutMs);

            socket.onopen = () => {
                if (timedOut) {
                    socket?.close();
                    return;
                }
                clearTimeout(to);
                console.info('WS open', wsUrl);
                this.socket = socket as any;
            };

            this.setupWebSocketHandlers(socket);

            socket.onerror = (err) => {
                console.error('WebSocket error event on', wsUrl, err);
                if (!this.socket) {
                    clearTimeout(to);
                    try { socket.close(); } catch (e) {}
                    setTimeout(() => tryConnect(idx + 1), 200);
                } else {
                    (window as any).app.showInfo('WebSocket Error', 'WebSocket connection failed. Make sure the server is running.');
                    this.status = 'disconnected';
                    this.renderConnectionScreen();
                }
            };

            socket.onclose = (ev) => {
                clearTimeout(to);
                console.info('WebSocket closed', wsUrl, ev.code, ev.reason);
                if (!this.socket || timedOut) {
                    if (!this.socket) {
                        setTimeout(() => tryConnect(idx + 1), 100);
                    }
                    return;
                }

                if (this.status !== 'disconnected') {
                    this.status = 'disconnected';
                    this.renderConnectionScreen();
                }
            };
        };

        tryConnect(0);
    }

    // New helper: join matchmaking queue
    private joinQueue(): void {
        this.isHost = false;
        this.playerNumber = null;
        this.roomId = null;
        this.opponentUser = null;
        this.status = 'connecting';
        this.renderConnectionScreen();
        // add queue=1 query param so server treats this connection as matchmaking queue
        this.connectWithRoom(undefined, { queue: '1' });
    }

    private setupWebSocketHandlers(ws: WebSocket) {
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'joined':
                    // Store our player number
                    this.playerNumber = data.player ?? null;
                    this.roomId = data.roomId;
                    this.isHost = !!data.isHost;
                    this.status = this.isHost ? 'waiting' : 'playing';
                    if (this.status === 'playing') this.renderGameScreen();
                    else this.renderConnectionScreen();
                    break;
                case 'created':
                    // Server explicitly created a private room for us (host)
                    this.roomId = data.roomId;
                    this.isHost = true;
                    this.status = 'waiting';
                    this.renderConnectionScreen();
                    break;
                case 'waitingForOpponent':
                    // Server placed us in matchmaking queue
                    this.status = 'waiting';
                    this.isHost = false;
                    this.renderConnectionScreen();
                    break;
                case 'peerJoined':
                    // Server sends players array with attached user info when available
                    if (Array.isArray(data.players)) {
                        const players: Array<{ player: number; user?: any | null }> = data.players;
                        const opponent = players.find(p => p.player !== this.playerNumber);
                        if (opponent && opponent.user) {
                            this.opponentUser = {
                                id: opponent.user.id,
                                username: opponent.user.username,
                                display_name: opponent.user.display_name
                            };
                        }
                    }
                    this.status = 'playing';
                    this.renderGameScreen();
                    break;
                case 'peerLeft':
                    this.status = 'disconnected';
                    this.opponentUser = null;
                    this.showInfoModal(
                        'Opponent Left',
                        'Your opponent has left the room. You can return to the lobby or try reconnecting to the same room.',
                        [
                            { label: 'Return to Lobby', style: 'danger', action: () => { this.disconnect(); } },
                            { label: 'Reconnect', style: 'primary', action: () => { this.connectWithRoom(this.roomId || undefined); } }
                        ]
                    );
                    break;
                case 'error':
                    (window as any).app.showInfo('WebSocket Error', data.message || 'WebSocket error');
                    break;
                case 'ready':
                    // Start game UI immediately when both players are present
                    this.startGameUI();
                    break;
                default:
                    if (this.game && typeof (this.game as any).onSocketMessage === 'function') {
                        (this.game as any).onSocketMessage(data);
                    }
                    break;
            }
        };
    }

    private startGameUI() {
        this.status = 'playing';
        this.renderGameScreen();
    }

    private createPrivateRoom(): void {
        this.connectWithRoom();
    }
 
    private joinPrivateRoom(roomCode: string): void {
        this.connectWithRoom(roomCode);
    }
 
    private disconnect(): void {
        if (this.socket) {
            try { this.socket.close(); } catch (e) {}
        }
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
        this.status = 'disconnected';
        this.roomId = null;
        this.isHost = false;
        this.opponentUser = null;
        this.renderConnectionScreen();
    }
 
    public cleanup(): void {
        this.disconnect();
        if (this.friendWidget) {
            this.friendWidget.unmount();
            this.friendWidget = null;
        }
    }

    private showInfoModal(
        title: string, 
        message: string, 
        actions: Array<{ label: string; style?: 'primary' | 'danger' | 'default'; action: () => void }>
    ): void {
        if (!this.container) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const modal = document.createElement('div');
        modal.className = 'glass-effect p-6 rounded-2xl max-w-lg w-full mx-4 relative text-center border-2 border-white/5';

        const h = document.createElement('h2');
        h.className = 'text-2xl font-bold text-white mb-2 gradient-text';
        h.textContent = title;

        const p = document.createElement('p');
        p.className = 'text-gray-300 mb-6';
        p.textContent = message;

        const btnRow = document.createElement('div');
        btnRow.className = 'flex gap-4 justify-center';

        actions.forEach((act) => {
            const btn = document.createElement('button');
            const base = 'px-6 py-3 rounded-lg font-semibold transition-colors duration-200';
            if (act.style === 'primary') {
                btn.className = `${base} btn-primary`;
            } else if (act.style === 'danger') {
                btn.className = `${base} bg-game-red hover:bg-red-600 text-white`;
            } else {
                btn.className = `${base} bg-game-dark hover:bg-blue-800 text-white`;
            }
            btn.textContent = act.label;
            btn.onclick = () => {
                try { act.action(); } catch (e) { console.error('Modal action error', e); }
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
            };
            btnRow.appendChild(btn);
        });

        const closeX = document.createElement('button');
        closeX.className = 'absolute top-4 right-6 text-gray-400 hover:text-white text-2xl';
        closeX.innerHTML = '&times;';
        closeX.onclick = () => { 
            if (document.body.contains(overlay)) document.body.removeChild(overlay); 
        };

        modal.appendChild(closeX);
        modal.appendChild(h);
        modal.appendChild(p);
        modal.appendChild(btnRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => {
            const firstBtn = btnRow.querySelector('button') as HTMLElement | null;
            if (firstBtn) firstBtn.focus();
        }, 50);
    }

    private showInputModal(title: string, placeholder: string, submitLabel: string, onSubmit: (value: string) => Promise<void> | void): void {
        if (!this.container) return;
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const modal = document.createElement('div');
        modal.className = 'glass-effect p-6 rounded-2xl max-w-md w-full mx-4 relative text-left border-2 border-white/5';

        const h = document.createElement('h2');
        h.className = 'text-2xl font-bold text-white mb-2 gradient-text';
        h.textContent = title;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

        const error = document.createElement('p');
        error.className = 'text-red-400 text-sm mb-4 hidden';

        const btnRow = document.createElement('div');
        btnRow.className = 'flex gap-4 justify-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 rounded-lg bg-game-dark hover:bg-blue-800 text-white';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };

        const submitBtn = document.createElement('button');
        submitBtn.className = 'px-4 py-2 rounded-lg btn-primary';
        submitBtn.textContent = submitLabel;
        submitBtn.onclick = async () => {
            error.classList.add('hidden');
            const val = (input.value || '').trim();
            if (!val) {
                error.textContent = 'Please enter a username';
                error.classList.remove('hidden');
                input.focus();
                return;
            }
            try {
                await Promise.resolve(onSubmit(val));
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
            } catch (e: any) {
                error.textContent = e?.message || 'Failed to perform action';
                error.classList.remove('hidden');
            }
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitBtn.click();
        });

        modal.appendChild(h);
        modal.appendChild(input);
        modal.appendChild(error);
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(submitBtn);
        modal.appendChild(btnRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => input.focus(), 50);
    }
}
