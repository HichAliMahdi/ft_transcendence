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

    }

    private setupControls(): void {
        this.removeEventListeners();
        this.keyHandler = (e: KeyboardEvent) => {
            if (['w', 's', 'a', 'd', 'j', 'l', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === ' ' ) {
                if (!this.isRunning && this.isGameOver()) {
                    this.resetGame();
                    this.start();
                }
                return;
            }
            this.keys[e.key] = (e.type === 'keydown');
        };
        window.addEventListener('keydown', this.keyHandler);
        window.addEventListener('keyup', this.keyHandler);
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private resizeCanvas(): void {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.resetPaddlePositions();
        }
    }

    private resetPaddlePositions(): void {
        this.paddles[0].x = this.canvas.width / 2 - 50; // Player 1
        this.paddles[0].y = 20;

        this.paddles[1].x = this.canvas.width - 30; // Player 2
        this.paddles[1].y = this.canvas.height / 2 - 50;

        this.paddles[2].x = this.canvas.width / 2 - 50; // Player 3
        this.paddles[2].y = this.canvas.height - 30;

        this.paddles[3].x = 20; // Player 4
        this.paddles[3].y = this.canvas.height / 2 - 50;
    }

    private update(): void {
        // Update paddle position
        this.paddles.forEach(paddle => {
            if (this.keys[paddle.keys.up]) {
                this.movePaddle(paddle, -paddle.speed);
            }
            if (this.keys[paddle.keys.down]) {
                this.movePaddle(paddle, paddle.speed);
            }
        });
        // update ball position
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        // Ball collision with paddles
        this.paddles.forEach(paddle => {
            if (this.checkPaddleCollision(paddle)) {
                this.handlePaddleCollision(paddle);
            }
        });
        // Ball wall colision and scoring
        if (this.ball.x - this.ball.radius <= 0) { // player 2 scores
            this.score.player2++;
            this.resetBall();
        } else if (this.ball.x + this.ball.radius >= this.canvas.width) { //player 4 scores
            this.score.player4++;
            this.resetBall();
        }
        if (this.ball.y - this.ball.radius <= 0) { // player 3 scores
            this.score.player3++;
            this.resetBall();
        } else if (this.ball.y + this.ball.radius >= this.canvas.height) { // player 1 scores
            this.score.player1++;
            this.resetBall();
        }
        if (this.isGameOver()) // game ending first to 5
            this.endGame();
    }

    private movePaddle(paddle: MultiplayerPaddle, delta: number): void {
        if (paddle.playerId === 1 || paddle.playerId === 3) { // Horizontal
            paddle.x = Math.max(0, Math.min(this.canvas.width - paddle.width, paddle.x + delta));
        } else { // Vertical
            paddle.y = Math.max(0, Math.min(this.canvas.height - paddle.height, paddle.y + delta));
        }
    }

    private checkPaddleCollision(paddle: MultiplayerPaddle): boolean {
        const closestX = Math.max(paddle.x, Math.min(this.ball.x, paddle.x + paddle.width));
        const closestY = Math.max(paddle.y, Math.min(this.ball.y, paddle.y + paddle.height));

        const distanceX = this.ball.x - closestX;
        const distanceY = this.ball.y - closestY;

        return (distanceX * distanceX + distanceY * distanceY) <= (this.ball.radius * this.ball.radius);
    }

    private handlePaddleCollision(paddle: MultiplayerPaddle): void {
        const paddleCenterX = paddle.x + paddle.width / 2;
        const paddleCenterY = paddle.y + paddle.height / 2;

        let hitRatio: number;

        if (paddle.playerId === 1 || paddle.playerId === 3) {
            hitRatio = (this.ball.x - paddleCenterX) / (paddle.width / 2);
            this.ball.dy = -this.ball.dy;
            this.ball.dx = hitRatio * 8;

            if (paddle.playerId === 1) {
                this.ball.y = paddle.y + paddle.height + this.ball.radius;
            } else {
                this.ball.y = paddle.y - this.ball.radius;
            }
        } else {
            // Vertical paddles
            hitRatio = (this.ball.y - paddleCenterY) / (paddle.height / 2);
            this.ball.dx = -this.ball.dx;
            this.ball.dy = hitRatio * 8;
            
            // Adjust ball position
            if (paddle.playerId === 2) {
                this.ball.x = paddle.x - this.ball.radius;
            } else {
                this.ball.x = paddle.x + paddle.width + this.ball.radius;
            }
        }

        // increase speed
        const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const newSpeed = Math.min(speed * 1.05, 12);
        const ratio = newSpeed / speed;

        this.ball.dx *= ratio;
        this.ball.dy *= ratio;
    }

    private resetBall(): void {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;

        const angle = Math.random() * Math.PI * 2;
        const speed = 4;

        this.ball.dx = Math.cos(angle) * speed;
        this.ball.dy = Math.sin(angle) * speed;
    }

    private isGameOver(): boolean {
        return this.score.player1 >= 5 || this.score.player2 >= 5 || this.score.player3 >= 5 || this.score.player4 >= 5;
    }

    private getWinner(): number {
        const scores = [
            { player: 1, score: this.score.player1 },
            { player: 2, score: this.score.player2 },
            { player: 3, score: this.score.player3 },
            { player: 4, score: this.score.player4 }
        ];
        return scores.reduce((max, current) => current.score > max.score ? current : max).player;
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