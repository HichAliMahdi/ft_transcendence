// To update after properly creating the online mode in the backend

interface OnlineGameState {
    ball: { x: number; y: number; dx: number; dy: number };
    paddles: { player1: number; player2: number };
    score: { player1: number; player2: number };
}

export class OnlinePongGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private socket: WebSocket;
    private gameState: OnlineGameState;
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private isRunning: boolean = false;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;
    private lastTime: number = 0;
    private visibilityHandler: (() => void) | null = null;

    constructor(canvas: HTMLCanvasElement, socket: WebSocket) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context){
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;
        this.socket = socket;

        // initializing gameStates
        this.gameState = {
            ball: { x : canvas.width / 2, y: canvas.height / 2, dx:5, dy:5 },
            paddles: { player1: canvas.height / 2 - 50, player2: canvas.height / 2 - 50 },
            score: { player1:0, player2: 0 }
        };

        this.setupControls();
        this.setupSocketListeners();
        // Pause/resume on tab visibility
        this.visibilityHandler = () => {
            if (document.hidden) {
                this.stop();
            } else if (this.isRunning) {
                this.lastTime = performance.now();
                this.start();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        this.lastTime = performance.now();
        this.start();

    }

    private setupControls(): void {
        this.removeEventListeners();

        this.keyHandler = (e: KeyboardEvent) => {
            if (['w', 's'].includes(e.key)) {
                e.preventDefault();
                this.keys[e.key] = (e.type === 'keydown');
                // send paddle movement to server
                if (this.socket){
                    this.socket.send(JSON.stringify({
                        type: 'paddleMove',
                        direction: e.key === 'w' ? 'up' : 'down',
                        keydown: e.type === 'keydown'
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

    // Simulation for updating game locally 
    // TODO Implement real time socker listener in backend
    private setupSocketListeners(): void {
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'gameState') {
                    this.gameState = data.state;
                }
            } catch (error) {
                console.error('Error parsing game state:', error);
            }
        };
        // we used to run a setInterval here. simulation is now integrated into game loop (gameLoop).
    }

    // This is just for demonstration - in real implementation, server handles game logic
    // Integrated simulation step uses delta time.
    private simulateStep(deltaFactor: number): void {
        const ball = this.gameState.ball;

        // Update ball position (scale by factor)
        ball.x += ball.dx * deltaFactor;
        ball.y += ball.dy * deltaFactor;

        // Wall collision
        if (ball.y <= 0) {
            ball.y = 0;
            ball.dy *= -1;
        } else if (ball.y >= this.canvas.height) {
            ball.y = this.canvas.height;
            ball.dy *= -1;
        }

        // Paddle collision (simplified)
        if (ball.x <= 30 && ball.x >= 20) {
            const paddle1 = this.gameState.paddles.player1;
            if (ball.y >= paddle1 && ball.y <= paddle1 + 100) {
                ball.dx = Math.abs(ball.dx);
                const hitPos = (ball.y - (paddle1 + 50)) / 50;
                ball.dy = hitPos * 8;
            }
        }

        if (ball.x >= this.canvas.width - 30 && ball.x <= this.canvas.width - 20) {
            const paddle2 = this.gameState.paddles.player2;
            if (ball.y >= paddle2 && ball.y <= paddle2 + 100) {
                ball.dx = -Math.abs(ball.dx);
                const hitPos = (ball.y - (paddle2 + 50)) / 50;
                ball.dy = hitPos * 8;
            }
        }

        // Scoring
        if (ball.x <= 0) {
            this.gameState.score.player2++;
            this.resetBall();
        } else if (ball.x >= this.canvas.width) {
            this.gameState.score.player1++;
            this.resetBall();
        }

        // Move paddles based on key input (scale by factor)
        const move = 8 * deltaFactor;
        if (this.keys['w']) {
            this.gameState.paddles.player1 = Math.max(0, this.gameState.paddles.player1 - move);
        }
        if (this.keys['s']) {
            this.gameState.paddles.player1 = Math.min(this.canvas.height - 100, this.gameState.paddles.player1 + move);
        }

        // Simulate opponent movement (temporary)
        const ballCenter = this.gameState.ball.y;
        const paddle2Center = this.gameState.paddles.player2 + 50;
        if (paddle2Center < ballCenter - 10) {
            this.gameState.paddles.player2 = Math.min(this.canvas.height - 100, this.gameState.paddles.player2 + 5 * deltaFactor);
        } else if (paddle2Center > ballCenter + 10) {
            this.gameState.paddles.player2 = Math.max(0, this.gameState.paddles.player2 - 5 * deltaFactor);
        }
    }

    private resetBall(): void {
        this.gameState.ball.x = this.canvas.width / 2;
        this.gameState.ball.y = this.canvas.height / 2;
        this.gameState.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
        this.gameState.ball.dy = (Math.random() - 0.5) * 8;
    }

    private draw(): void {

        // bg
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // center line subtle white
        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // paddles (white)
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(20, this.gameState.paddles.player1, 10, 100);
        this.ctx.fillRect(this.canvas.width - 30, this.gameState.paddles.player2, 10, 100);

        // ball (white)
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.gameState.ball.x, this.gameState.ball.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // score (white)
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.gameState.score.player1.toString(), this.canvas.width / 4, 50);
        this.ctx.fillText(this.gameState.score.player2.toString(), (3 * this.canvas.width) / 4, 50);

        // hint
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('W/S to move', 20, this.canvas.height - 20);

        // Draw game over if someone won
        if (this.gameState.score.player1 >= 5 || this.gameState.score.player2 >= 5) {
            this.drawGameOver();
        }
    }

    private drawGameOver(): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        const winner = this.gameState.score.player1 >= 5 ? 'Player 1' : 'Player 2';
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`${winner} Wins!`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.fillText('Refresh page to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    private gameLoop = (timestamp?: number): void => {
        if (!this.isRunning) return;
        const now = timestamp || performance.now();
        const delta = Math.min(100, now - this.lastTime || 16);
        const factor = delta / (1000 / 60); // relative to 60fps baseline

        // simulate (local demo) and draw
        this.simulateStep(factor);
        this.draw();

        this.lastTime = now;
        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
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
            this.socket.close();
        }
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
    }
}
