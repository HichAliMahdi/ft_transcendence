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
        setInterval(() => {
            this.simulateGameUpdate();
        }, 16); // ~60fps
    }

    // This is just for demonstration - in real implementation, server handles game logic
    private simulateGameUpdate(): void {
        const ball = this.gameState.ball;
        
        // Update ball position
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collision
        if (ball.y <= 0 || ball.y >= this.canvas.height) {
            ball.dy *= -1;
        }

        // Paddle collision (simplified)
        if (ball.x <= 30 && ball.x >= 20) {
            const paddle1 = this.gameState.paddles.player1;
            if (ball.y >= paddle1 && ball.y <= paddle1 + 100) {
                ball.dx = Math.abs(ball.dx);
                // Adjust angle based on where ball hit paddle
                const hitPos = (ball.y - (paddle1 + 50)) / 50;
                ball.dy = hitPos * 8;
            }
        }

        if (ball.x >= this.canvas.width - 30 && ball.x <= this.canvas.width - 20) {
            const paddle2 = this.gameState.paddles.player2;
            if (ball.y >= paddle2 && ball.y <= paddle2 + 100) {
                ball.dx = -Math.abs(ball.dx);
                // Adjust angle based on where ball hit paddle
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

        // Move paddles based on key input
        if (this.keys['w']) {
            this.gameState.paddles.player1 = Math.max(0, this.gameState.paddles.player1 - 8);
        }
        if (this.keys['s']) {
            this.gameState.paddles.player1 = Math.min(this.canvas.height - 100, this.gameState.paddles.player1 + 8);
        }

        // Simulate opponent movement (in real implementation, this comes from server)
        const ballCenter = this.gameState.ball.y;
        const paddle2Center = this.gameState.paddles.player2 + 50;
        if (paddle2Center < ballCenter - 10) {
            this.gameState.paddles.player2 = Math.min(this.canvas.height - 100, this.gameState.paddles.player2 + 5);
        } else if (paddle2Center > ballCenter + 10) {
            this.gameState.paddles.player2 = Math.max(0, this.gameState.paddles.player2 - 5);
        }
    }

    private resetBall(): void {
        this.gameState.ball.x = this.canvas.width / 2;
        this.gameState.ball.y = this.canvas.height / 2;
        this.gameState.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
        this.gameState.ball.dy = (Math.random() - 0.5) * 8;
    }

    private draw(): void {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        const paddleColors = ['#e94560', '#7873f5', '#ff6ec4', '#0f3460'];
        this.paddles.forEach((paddle, index) => {
            this.ctx.fillStyle = paddleColors[index];
            this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            if (paddle.playerId === 1 || paddle.playerId === 3) {
                this.ctx.fillText(
                    `P${paddle.playerId}`,
                    paddle.x + paddle.width / 2,
                    paddle.y + paddle.height / 2
                );
            } else {
                this.ctx.save();
                this.ctx.translate(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
                this.ctx.rotate(Math.PI / 2);
                this.ctx.fillText(`P${paddle.playerId}`, 0, 0);
                this.ctx.restore();
            }
        });
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        

        this.ctx.fillText(this.score.player1.toString(), this.canvas.width / 2, 60);

        this.ctx.fillText(this.score.player2.toString(), this.canvas.width - 60, this.canvas.height / 2);

        this.ctx.fillText(this.score.player3.toString(), this.canvas.width / 2, this.canvas.height - 40);

        this.ctx.fillText(this.score.player4.toString(), 60, this.canvas.height / 2);


        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#64748b';
        

        this.ctx.textAlign = 'center';
        this.ctx.fillText('P1: A/D', this.canvas.width / 2, 30);

        this.ctx.save();
        this.ctx.translate(this.canvas.width - 20, this.canvas.height / 2);
        this.ctx.rotate(Math.PI / 2);
        this.ctx.fillText('P2: ↑/↓', 0, 0);
        this.ctx.restore();
 
        this.ctx.fillText('P3: J/L', this.canvas.width / 2, this.canvas.height - 15);

        this.ctx.save();
        this.ctx.translate(20, this.canvas.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('P4: W/S', 0, 0);
        this.ctx.restore();
    }

    private gameLoop = (timestamp: number): void => {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        
        if (deltaTime >= this.FRAME_TIME) {
            this.update();
            this.draw();
            this.lastTime = timestamp - (deltaTime % this.FRAME_TIME);
        }

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

    private endGame(): void {
        this.stop();
        const winner = this.getWinner();
        
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#e94560';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);
        
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`Player ${winner} Wins!`, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText('Press SPACE to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    private removeEventListeners(): void {
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
            window.removeEventListener('keyup', this.keyHandler);
            this.keyHandler = null;
        }
    }
    
    public destroy(): void {
        this.stop();
        this.removeEventListeners();
        window.removeEventListener('resize', () => this.resizeCanvas());
    }

    public resetGame(): void {
        this.score = { player1: 0, player2: 0, player3: 0, player4: 0 };
        this.resetBall();
        this.resetPaddlePositions();
        this.keys = {};
        this.isRunning = true;
    }
}

//TODO Change logic