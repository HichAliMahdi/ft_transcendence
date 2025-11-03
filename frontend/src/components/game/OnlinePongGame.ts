interface OnlineGameState {
    ball: { x: number; y: number; dx: number; dy: number };
    paddles: { player1: number; player2: number };
    score: { player1: number; player2: number };
    width: number;
    height: number;
}

export class OnlinePongGame {
    private ctx: CanvasRenderingContext2D;
    private socket: WebSocket;
    private gameState: OnlineGameState | null = null;
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private isRunning: boolean = false;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;
    private visibilityHandler: (() => void) | null = null;

    constructor(canvas: HTMLCanvasElement, socket: WebSocket) {
        const context = canvas.getContext('2d');
        if (!context){
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;
        this.socket = socket;

        this.gameState = {
            ball: { x: canvas.width / 2, y: canvas.height / 2, dx: 0, dy: 0 },
            paddles: { player1: canvas.height / 2 - 50, player2: canvas.height / 2 - 50 },
            score: { player1: 0, player2: 0 },
            width: canvas.width,
            height: canvas.height
        };

        this.setupControls();

        (this as any).onSocketMessage = (msg: any) => {
            this.handleSocketMessage(msg);
        };

        this.visibilityHandler = () => {
            if (document.hidden) this.stop();
            else if (this.isRunning) {
                this.start();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        this.start();
    }

    private setupControls(): void {
        this.removeEventListeners();

        this.keyHandler = (e: KeyboardEvent) => {
            if (['w', 's'].includes(e.key)) {
                e.preventDefault();
                const down = e.type === 'keydown';
                this.keys[e.key] = down;
                if (this.socket && (this.socket as any).readyState === 1) {
                    this.socket.send(JSON.stringify({
                        type: 'paddleMove',
                        direction: e.key === 'w' ? 'up' : 'down',
                        keydown: down
                    }));
                }
            }
        };
        window.addEventListener('keydown', this.keyHandler);
        window.addEventListener('keyup', this.keyHandler);
    }

    private removeEventListeners(): void {
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
            window.removeEventListener('keyup', this.keyHandler);
            this.keyHandler = null;
        }
    }

    private draw(): void {
        const state = this.gameState;
        if (!state) return;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, state.width, state.height);

        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(state.width / 2, 0);
        this.ctx.lineTo(state.width / 2, state.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(20, state.paddles.player1, 10, 100);
        this.ctx.fillRect(state.width - 30, state.paddles.player2, 10, 100);

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(state.ball.x, state.ball.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(String(state.score.player1), state.width / 4, 50);
        this.ctx.fillText(String(state.score.player2), (3 * state.width) / 4, 50);

        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('W/S to move', 20, state.height - 20);

        if (state.score.player1 >= 5 || state.score.player2 >= 5) {
            this.drawGameOver();
        }
    }

    private drawGameOver(): void {
        const state = this.gameState;
        if (!state) return;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, state.width, state.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', state.width / 2, state.height / 2 - 40);

        const winner = state.score.player1 >= 5 ? 'Player 1' : 'Player 2';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`${winner} Wins!`, state.width / 2, state.height / 2 + 20);
    }

    private gameLoop = (_timestamp?: number): void => {
        this.draw();
        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animationId = requestAnimationFrame(this.gameLoop);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    public destroy(): void {
        this.stop();
        this.removeEventListeners();
        if (this.socket) {
            try { this.socket.close(); } catch (e) {}
        }
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
    }

    private handleSocketMessage(msg: any): void {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'paddleMove') {
            return;
        } else if (msg.type === 'gameState' && msg.state) {
            this.gameState = msg.state as OnlineGameState;
        } else if (msg.type === 'gameOver' && msg.state) {
            this.gameState = msg.state as OnlineGameState;
        }
    }
}
