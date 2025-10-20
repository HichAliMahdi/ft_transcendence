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
            // Quick Match Button
            const quickMatchButton = document.createElement('button');
            quickMatchButton.textContent = '🎮 Find Online Match';
            quickMatchButton.className = 'btn-primary w-full text-lg py-4 mb-4';
            quickMatchButton.onclick = () => this.connectToServer();

            // Divider
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

            // Create Room Button
            const createRoomButton = document.createElement('button');
            createRoomButton.textContent = '🏠 Create Private Room';
            createRoomButton.className = 'btn-primary w-full text-lg py-4 mb-3';
            createRoomButton.onclick = () => this.createPrivateRoom();

            // Join Room Section
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
                
                // Show room code
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
        this.game = new OnlinePongGame(canvas, this.socket!);
    }


    // For demo purposes, we'll simulate WebSocket connection
    // In a real implementation, connect to your WebSocket server created in backend
    private connectToServer(): void {
        this.status = 'connecting';
        this.renderConnectionScreen();

        setTimeout(() => {
            this.socket = this.createMockWebSocket();
            this.status = 'waiting';
            this.renderConnectionScreen();

            // Simulate finding a match after 2-5 seconds
            setTimeout(() => {
                this.roomId = 'room_' + Math.random().toString(36).substr(2, 9);
                this.status = 'playing';
                this.renderGameScreen();
            }, 2000 + Math.random() * 3000);
        }, 1000);
    }

    private createPrivateRoom(): void {
        this.isHost = true;
        this.status = 'connecting';
        this.renderConnectionScreen();

        setTimeout(() => {
            this.socket = this.createMockWebSocket();
            // Generate a shorter, more user-friendly room code
            this.roomId = this.generateRoomCode();
            this.status = 'waiting';
            this.renderConnectionScreen();

            // Simulate someone joining after 5-10 seconds
            setTimeout(() => {
                this.status = 'playing';
                this.renderGameScreen();
            }, 5000 + Math.random() * 5000);
        }, 1000);
    }

    private generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    private joinPrivateRoom(roomCode: string): void {
        this.isHost = false;
        this.status = 'connecting';
        this.renderConnectionScreen();

        setTimeout(() => {
            // Simulate checking if room exists
            const roomExists = Math.random() > 0.3; // 70% success rate for demo
            
            if (roomExists) {
                this.socket = this.createMockWebSocket();
                this.roomId = roomCode;
                this.status = 'playing';
                this.renderGameScreen();
            } else {
                // Room not found
                alert('Room not found! Please check the code and try again.');
                this.status = 'disconnected';
                this.renderConnectionScreen();
            }
        }, 1000);
    }

    // This is a mock WebSocket for demonstration
    // In a real implementation, ze zill use actual WebSocket connection
    private createMockWebSocket(): WebSocket {
        const mockSocket = {
            send: (data: string) => {
                console.log('Sending:', data);
            },
            close: () => {
                console.log('Connection closed');
            },
            onmessage: null
        } as any;

        return mockSocket;
    }

    private disconnect(): void {
        if (this.socket) {
            this.socket.close();
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
}
