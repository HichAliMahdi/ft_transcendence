interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

interface Paddle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
}

interface Score {
    player1: number;
    player2: number;
}

export class PongGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private ball: Ball;
    private paddle1: Paddle;
    private paddle2: Paddle;
    private score: Score;
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private readonly FRAME_TIME: number = 1000 / 60;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;

        // Initialize properties directly in constructor
        this.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            dx: 5,
            dy: 5,
            radius: 8
        };

        this.paddle1 = {
            x: 20,
            y: canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 8
        };

        this.paddle2 = {
            x: canvas.width - 30,
            y: canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 8
        };

        this.score = {
            player1: 0,
            player2: 0
        };

        this.setupControls();
    }

    private setupControls(): void {
        // Remove existing listeners first to prevent duplicates
        this.removeEventListeners();

        // Create new handler
        this.keyHandler = (e: KeyboardEvent) => {
            if (['w', 's', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
                e.preventDefault();
            }
            
            if (e.key === ' ') {
                // Space bar to restart
                if (!this.isRunning && (this.score.player1 >= 5 || this.score.player2 >= 5)) {
                    this.resetGame();
                    this.start();
                }
                return;
            }
            
            this.keys[e.key] = (e.type === 'keydown');
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

    private update(): void {
        // Move paddles with boundary checking
        if (this.keys['w']) {
            this.paddle1.y = Math.max(0, this.paddle1.y - this.paddle1.speed);
        }
        if (this.keys['s']) {
            this.paddle1.y = Math.min(this.canvas.height - this.paddle1.height, this.paddle1.y + this.paddle1.speed);
        }
        if (this.keys['ArrowUp']) {
            this.paddle2.y = Math.max(0, this.paddle2.y - this.paddle2.speed);
        }
        if (this.keys['ArrowDown']) {
            this.paddle2.y = Math.min(this.canvas.height - this.paddle2.height, this.paddle2.y + this.paddle2.speed);
        }

        // Move ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Ball collision with top/bottom walls
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.y = this.ball.radius;
            this.ball.dy *= -1;
        } else if (this.ball.y + this.ball.radius >= this.canvas.height) {
            this.ball.y = this.canvas.height - this.ball.radius;
            this.ball.dy *= -1;
        }

        // Ball collision with paddles with better collision detection
        if (this.checkPaddleCollision(this.paddle1)) {
            this.ball.x = this.paddle1.x + this.paddle1.width + this.ball.radius;
            this.ball.dx = Math.abs(this.ball.dx); // Ensure positive direction
            this.adjustBallAngle(this.paddle1);
        } else if (this.checkPaddleCollision(this.paddle2)) {
            this.ball.x = this.paddle2.x - this.ball.radius;
            this.ball.dx = -Math.abs(this.ball.dx); // Ensure negative direction
            this.adjustBallAngle(this.paddle2);
        }

        // Ball out of bounds (scoring)
        if (this.ball.x - this.ball.radius <= 0) {
            this.score.player2++;
            this.resetBall();
        } else if (this.ball.x + this.ball.radius >= this.canvas.width) {
            this.score.player1++;
            this.resetBall();
        }

        // Check for game end
        if (this.score.player1 >= 5 || this.score.player2 >= 5) {
            this.endGame();
        }
    }

    private adjustBallAngle(paddle: Paddle): void {
        // Calculate hit position relative to paddle center (-0.5 to 0.5)
        const hitPos = (this.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        
        // Adjust angle based on where the ball hit the paddle
        const maxAngle = Math.PI / 4; // 45 degrees max
        const angle = hitPos * maxAngle;
        
        // Calculate new speed while maintaining overall velocity
        const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const direction = this.ball.dx > 0 ? 1 : -1;
        
        this.ball.dx = direction * speed * Math.cos(angle);
        this.ball.dy = speed * Math.sin(angle);
        
        // Slight speed increase after each hit (capped)
        const newSpeed = Math.min(speed * 1.05, 15);
        const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const ratio = newSpeed / currentSpeed;
        
        this.ball.dx *= ratio;
        this.ball.dy *= ratio;
    }

    private checkPaddleCollision(paddle: Paddle): boolean {
        // Improved collision detection
        const closestX = Math.max(paddle.x, Math.min(this.ball.x, paddle.x + paddle.width));
        const closestY = Math.max(paddle.y, Math.min(this.ball.y, paddle.y + paddle.height));
        
        const distanceX = this.ball.x - closestX;
        const distanceY = this.ball.y - closestY;
        
        return (distanceX * distanceX + distanceY * distanceY) <= (this.ball.radius * this.ball.radius);
    }

    private resetBall(): void {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        
        // Random direction but consistent speed
        const angle = (Math.random() * Math.PI / 2) - Math.PI / 4; // -45 to +45 degrees
        const speed = 5;
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        this.ball.dx = direction * speed * Math.cos(angle);
        this.ball.dy = speed * Math.sin(angle);
    }

    private resetGame(): void {
        this.score.player1 = 0;
        this.score.player2 = 0;
        this.resetBall();
        
        // Reset paddle positions
        this.paddle1.y = this.canvas.height / 2 - 50;
        this.paddle2.y = this.canvas.height / 2 - 50;
        
        // Clear any existing game over state
        this.isRunning = true;
    }

    private draw(): void {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw paddles
        this.ctx.fillStyle = '#0f3460';
        this.ctx.fillRect(this.paddle1.x, this.paddle1.y, this.paddle1.width, this.paddle1.height);
        this.ctx.fillRect(this.paddle2.x, this.paddle2.y, this.paddle2.width, this.paddle2.height);

        // Draw ball
        this.ctx.fillStyle = '#e94560';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw score
        this.ctx.fillStyle = '#eee';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.score.player1.toString(), this.canvas.width / 4, 50);
        this.ctx.fillText(this.score.player2.toString(), (3 * this.canvas.width) / 4, 50);

        // Draw controls hint
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#888';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('W/S', 20, this.canvas.height - 20);
        this.ctx.textAlign = 'right';
        this.ctx.fillText('↑/↓', this.canvas.width - 20, this.canvas.height - 20);
    }

    private gameLoop = (timestamp: number): void => {
        if (!this.isRunning) return;

        // Frame rate limiting
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
        const winner = this.score.player1 >= 5 ? 'Player 1' : 'Player 2';
        
        // Draw game over screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#e94560';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.fillStyle = '#eee';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`${winner} Wins!`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#888';
        this.ctx.fillText('Press SPACE to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    public destroy(): void {
        this.stop();
        this.removeEventListeners();
    }

    // Public method to completely reset the game for a new match
    public resetForNewMatch(): void {
        this.stop();
        this.resetGameState();
        this.keys = {};
    }

    private resetGameState(): void {
        // Reset ball
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = 5;
        this.ball.dy = 5;
        this.ball.radius = 8;

        // Reset paddles
        this.paddle1.x = 20;
        this.paddle1.y = this.canvas.height / 2 - 50;
        this.paddle1.width = 10;
        this.paddle1.height = 100;
        this.paddle1.speed = 8;

        this.paddle2.x = this.canvas.width - 30;
        this.paddle2.y = this.canvas.height / 2 - 50;
        this.paddle2.width = 10;
        this.paddle2.height = 100;
        this.paddle2.speed = 8;

        // Reset score
        this.score.player1 = 0;
        this.score.player2 = 0;
    }
}
