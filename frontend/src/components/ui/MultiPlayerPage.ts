import { OnlinePongGame } from '../game/OnlinePongGame';

export class MultiplayerPage {
    private game: OnlinePongGame | null = null;
    private container: HTMLElement | null = null;
    private socket: WebSocket | null = null;
    private roomId: string | null = null;
    private status: 'disconnected' | 'connecting' | 'waiting' | 'playing' = 'disconnected';
    private isHost: boolean = false;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 fade-in'
        this.renderConnectionScreen();
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
            quickMatchButton.onclick = () => this.createPrivateRoom();

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
            cancelButton.textContent = 'Cancel';
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

        this.container.appendChild(title);
        this.container.appendChild(gameInfo);
        this.container.appendChild(canvas);
        this.container.appendChild(disconnectButton);

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

    // replaced buildWsUrl to use window.location.* (host was undefined) and expose alternate forms
    private buildWsUrl(room?: string, trailingSlash = true): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || `${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        const base = `${protocol}//${host}`;
        // If trailingSlash=true produce /ws/ (helps nginx location /ws/); otherwise produce /ws (some proxies/clients prefer no trailing slash)
        if (room) {
            // always place room segment after /ws/
            return `${base}/ws/${encodeURIComponent(room)}`;
        } else {
            return trailingSlash ? `${base}/ws/` : `${base}/ws`;
        }
    }

    private connectWithRoom(room?: string): void {
        this.status = 'connecting';
        this.renderConnectionScreen();

        // List of candidate URLs to try (ordered). Only allow insecure ws on http pages.
        const candidates: string[] = [];
        const prefersSecure = window.location.protocol === 'https:';
        // prefer trailing slash first (matches nginx location /ws/)
        candidates.push(this.buildWsUrl(room, true));
        // also try without trailing slash as some setups forward differently
        candidates.push(this.buildWsUrl(room, false));
        // if page is http, also try ws scheme variants (shouldn't on https due to mixed-content)
        if (!prefersSecure) {
            // swap protocol by constructing from current host but with ws (buildWsUrl respects protocol)
            const alt1 = this.buildWsUrl(room, true).replace(/^wss:/i, 'ws:');
            const alt2 = this.buildWsUrl(room, false).replace(/^wss:/i, 'ws:');
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
                // try next candidate
                return tryConnect(idx + 1);
            }

            // connect timeout guard
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

            socket.onmessage = (evt) => {
                let msg: any;
                try { msg = JSON.parse(evt.data); } catch (e) { console.warn('Invalid WS message', e); return; }

                switch (msg.type) {
                    case 'joined':
                        this.roomId = msg.roomId;
                        this.isHost = !!msg.isHost;
                        this.status = this.isHost ? 'waiting' : 'playing';
                        if (this.status === 'playing') this.renderGameScreen();
                        else this.renderConnectionScreen();
                        break;
                    case 'created':
                        this.roomId = msg.roomId;
                        this.isHost = true;
                        this.status = 'waiting';
                        this.renderConnectionScreen();
                        break;
                    case 'peerJoined':
                        this.status = 'playing';
                        this.renderGameScreen();
                        break;
                    case 'peerLeft':
                        this.status = 'disconnected';
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
                        alert(msg.message || 'WebSocket error');
                        break;
                    default:
                        if (this.game && typeof (this.game as any).onSocketMessage === 'function') {
                            (this.game as any).onSocketMessage(msg);
                        }
                        break;
                }
            };

            socket.onerror = (err) => {
                console.error('WebSocket error event on', wsUrl, err);
                // If we haven't established a connection yet, try the next candidate.
                if (!this.socket) {
                    clearTimeout(to);
                    try { socket.close(); } catch (e) {}
                    // slight delay to avoid rapid retries
                    setTimeout(() => tryConnect(idx + 1), 200);
                } else {
                    alert('WebSocket connection failed. Make sure the server is running.');
                    this.status = 'disconnected';
                    this.renderConnectionScreen();
                }
            };

            socket.onclose = (ev) => {
                clearTimeout(to);
                console.info('WebSocket closed', wsUrl, ev.code, ev.reason);
                // If connection never opened (timedOut=true or close shortly after), try next candidate
                if (!this.socket || timedOut) {
                    // if this socket was not accepted as the active socket, try next
                    if (!this.socket) {
                        setTimeout(() => tryConnect(idx + 1), 100);
                    }
                    return;
                }

                // Normal close when we had an active socket
                if (this.status !== 'disconnected') {
                    this.status = 'disconnected';
                    this.renderConnectionScreen();
                }
            };

            // If after short delay we still don't have this.socket set (onopen didn't run), wait for timeout handler to advance
            // When socket.onopen runs it will set this.socket.
        };

        // start attempts
        tryConnect(0);
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
         this.renderConnectionScreen();
     }
 
     public cleanup(): void {
         this.disconnect();
     }

     private showInfoModal(title: string, message: string, actions: Array<{ label: string; style?: 'primary' | 'danger' | 'default'; action: () => void }>): void {
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
        closeX.className = 'absolute top-4 right-6 text-gray-400 hover:text-white';
        closeX.innerHTML = '&times;';
        closeX.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };

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
 }
