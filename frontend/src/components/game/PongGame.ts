// Simple Pong Game Prototype
// Add this to: frontend/src/components/game/PongGame.ts

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

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;

        // Initialize ball
        this.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            dx: 4,
            dy: 4,
            radius: 8
        };

        // Initialize paddles
        this.paddle1 = {
            x: 20,
            y: canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 6
        };

        this.paddle2 = {
            x: canvas.width - 30,
            y: canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 6
        };

        // Initialize score
        this.score = {
            player1: 0,
            player2: 0
        };

        this.setupControls();
    }

    private setupControls(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    private update(): void {
        // Move paddles
        if (this.keys['w'] && this.paddle1.y > 0) {
            this.paddle1.y -= this.paddle1.speed;
        }
        if (this.keys['s'] && this.paddle1.y < this.canvas.height - this.paddle1.height) {
            this.paddle1.y += this.paddle1.speed;
        }
        if (this.keys['ArrowUp'] && this.paddle2.y > 0) {
            this.paddle2.y -= this.paddle2.speed;
        }
        if (this.keys['ArrowDown'] && this.paddle2.y < this.canvas.height - this.paddle2.height) {
            this.paddle2.y += this.paddle2.speed;
        }

        // Move ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Ball collision with top/bottom walls
        if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.canvas.height) {
            this.ball.dy *= -1;
        }

        // Ball collision with paddles
        if (this.checkPaddleCollision(this.paddle1) || this.checkPaddleCollision(this.paddle2)) {
            this.ball.dx *= -1;
            // Add slight speed increase
            this.ball.dx *= 1.05;
            this.ball.dy *= 1.05;
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

    private checkPaddleCollision(paddle: Paddle): boolean {
        return (
            this.ball.x - this.ball.radius <= paddle.x + paddle.width &&
            this.ball.x + this.ball.radius >= paddle.x &&
            this.ball.y >= paddle.y &&
            this.ball.y <= paddle.y + paddle.height
        );
    }

    private resetBall(): void {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
        this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * 4;
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
        this.ctx.fillText(this.score.player1.toString(), this.canvas.width / 4, 50);
        this.ctx.fillText(this.score.player2.toString(), (3 * this.canvas.width) / 4, 50);

        // Draw controls hint
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#888';
        this.ctx.fillText('W/S', 20, this.canvas.height - 20);
        this.ctx.fillText('↑/↓', this.canvas.width - 50, this.canvas.height - 20);
    }

    private gameLoop = (): void => {
        if (!this.isRunning) return;

        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.gameLoop();
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
        this.ctx.fillText('Refresh to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    public destroy(): void {
        this.stop();
        window.removeEventListener('keydown', this.setupControls);
        window.removeEventListener('keyup', this.setupControls);
    }
}
