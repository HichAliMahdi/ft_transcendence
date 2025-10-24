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

type GameMode = 'pvp' | 'pve';
type AIDifficulty = 'easy' | 'medium' | 'hard';

interface GameConfig {
    mode: GameMode;
    aiDifficulty?: AIDifficulty;
}

export class PongGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private cssWidth: number;
    private cssHeight: number;
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
    private visibilityHandler: (() => void) | null = null;
    private resizeHandler: (() => void) | null = null;
    
    // AI properties
    private gameMode: GameMode;
    private aiDifficulty: AIDifficulty;
    private aiTarget: number = 0;
    private aiLastUpdate: number = 0;

    constructor(canvas: HTMLCanvasElement, config: GameConfig = { mode: 'pvp' }) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;

        this.gameMode = config.mode;
        this.aiDifficulty = config.aiDifficulty || 'medium';

        // store CSS size then scale canvas for DPR; drawing uses CSS pixels coordinates
        this.cssWidth = canvas.width;
        this.cssHeight = canvas.height;
        this.scaleCanvasForDPR();

        // Initialize properties (use css sizes)
        this.ball = {
            x: this.cssWidth / 2,
            y: this.cssHeight / 2,
            dx: 5,
            dy: 5,
            radius: 8
        };

        this.paddle1 = {
            x: 20,
            y: this.cssHeight / 2 - 50,
            width: 10,
            height: 100,
            speed: 8
        };

        this.paddle2 = {
            x: this.cssWidth - 30,
            y: this.cssHeight / 2 - 50,
            width: 10,
            height: 100,
            speed: 8
        };

        this.score = {
            player1: 0,
            player2: 0
        };

        this.setupControls();
        // Pause/resume on visibility change
        this.visibilityHandler = () => {
            if (document.hidden) {
                this.stop();
            } else if (this.isRunning) {
                // When returning, reset timing to avoid huge delta
                this.lastTime = performance.now();
                this.start();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        // handle resize (re-scale only when CSS size changes)
        this.resizeHandler = () => {
            // no-op placeholder for responsive resizing if needed
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    private scaleCanvasForDPR(): void {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        // CSS pixels
        const cssW = this.cssWidth;
        const cssH = this.cssHeight;
        this.canvas.style.width = `${cssW}px`;
        this.canvas.style.height = `${cssH}px`;
        // backing buffer
        this.canvas.width = Math.floor(cssW * dpr);
        this.canvas.height = Math.floor(cssH * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    }

    private setupControls(): void {
        this.removeEventListeners();

        this.keyHandler = (e: KeyboardEvent) => {
            if (['w', 's', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
                e.preventDefault();
            }
            
            if (e.key === ' ') {
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

    private getAISettings(): { speed: number, error: number, reactionDelay: number } {
        switch (this.aiDifficulty) {
            case 'easy':
                return { 
                    speed: 0.5,
                    error: 80,
                    reactionDelay: 200
                };
            case 'medium':
                return { 
                    speed: 0.75, 
                    error: 40,
                    reactionDelay: 100
                };
            case 'hard':
                return { 
                    speed: 0.95, 
                    error: 15,
                    reactionDelay: 30
                };
            default:
                return { speed: 0.75, error: 40, reactionDelay: 100 };
        }
    }

    private predictBallY(): number {
        const distanceX = this.paddle2.x - this.ball.x;
        const timeToReach = distanceX / Math.abs(this.ball.dx);
        let predictedY = this.ball.y + (this.ball.dy * timeToReach);
        
        // Account for wall bounces
        const bounces = Math.floor(Math.abs(predictedY) / this.canvas.height);
        predictedY = predictedY % this.canvas.height;
        
        if (predictedY < 0) {
            predictedY = Math.abs(predictedY);
        }
        if (bounces % 2 === 1) {
            predictedY = this.canvas.height - predictedY;
        }
        
        return predictedY;
    }

    private updateAIPaddle(): void {
        const currentTime = performance.now();
        const settings = this.getAISettings();
        
        // Update AI target with reaction delay
        if (currentTime - this.aiLastUpdate > settings.reactionDelay) {
            if (this.ball.dx > 0) {
                // Ball moving toward AI
                this.aiTarget = this.predictBallY();
                // Add error based on difficulty
                this.aiTarget += (Math.random() - 0.5) * settings.error * 2;
            } else {
                // Ball moving away, return to center
                this.aiTarget = this.cssHeight / 2;
            }
            this.aiLastUpdate = currentTime;
        }
        
        // Move AI paddle toward target
        const paddleCenter = this.paddle2.y + this.paddle2.height / 2;
        const distance = this.aiTarget - paddleCenter;
        
        if (Math.abs(distance) > 5) {
            const moveSpeed = this.paddle2.speed * settings.speed;
            if (distance > 0) {
                this.paddle2.y = Math.min(
                    this.cssHeight - this.paddle2.height,
                    this.paddle2.y + moveSpeed
                );
            } else {
                this.paddle2.y = Math.max(0, this.paddle2.y - moveSpeed);
            }
        }
    }

    private adjustBallAngle(paddle: Paddle): void {
        const hitPos = (this.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        const maxAngle = Math.PI / 4;
        const angle = hitPos * maxAngle;
        const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const direction = this.ball.dx > 0 ? 1 : -1;
        
        this.ball.dx = direction * speed * Math.cos(angle);
        this.ball.dy = speed * Math.sin(angle);
        
        const newSpeed = Math.min(speed * 1.05, 15);
        const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const ratio = newSpeed / currentSpeed;
        
        this.ball.dx *= ratio;
        this.ball.dy *= ratio;
    }

    private checkPaddleCollision(paddle: Paddle): boolean {
        const closestX = Math.max(paddle.x, Math.min(this.ball.x, paddle.x + paddle.width));
        const closestY = Math.max(paddle.y, Math.min(this.ball.y, paddle.y + paddle.height));
        
        const distanceX = this.ball.x - closestX;
        const distanceY = this.ball.y - closestY;
        
        return (distanceX * distanceX + distanceY * distanceY) <= (this.ball.radius * this.ball.radius);
    }

    private resetBall(): void {
        this.ball.x = this.cssWidth / 2;
        this.ball.y = this.cssHeight / 2;
        
        const angle = (Math.random() * Math.PI / 2) - Math.PI / 4;
        const speed = 5;
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        this.ball.dx = direction * speed * Math.cos(angle);
        this.ball.dy = speed * Math.sin(angle);
    }

    private resetGame(): void {
        this.score.player1 = 0;
        this.score.player2 = 0;
        this.resetBall();
        this.paddle1.y = this.cssHeight / 2 - 50;
        this.paddle2.y = this.cssHeight / 2 - 50;
        this.isRunning = true;
    }

    private draw(): void {
        // Clear canvas (draw in CSS pixel coords)
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

        // Draw center line
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.cssWidth / 2, this.cssHeight);
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
        this.ctx.fillText(this.score.player1.toString(), this.cssWidth / 4, 50);
        this.ctx.fillText(this.score.player2.toString(), (3 * this.cssWidth) / 4, 50);

        // Draw controls hint
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#888';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('W/S', 20, this.cssHeight - 20);
        this.ctx.textAlign = 'right';
        if (this.gameMode === 'pvp') {
            this.ctx.fillText('↑/↓', this.cssWidth - 20, this.cssHeight - 20);
        } else {
            this.ctx.fillText(`AI (${this.aiDifficulty})`, this.cssWidth - 20, this.cssHeight - 20);
        }
    }

    private gameLoop = (timestamp: number): void => {
        if (!this.isRunning) return;

        const deltaTime = Math.min(100, timestamp - this.lastTime || this.FRAME_TIME);
        const factor = deltaTime / this.FRAME_TIME;

        // Player movement scaled by delta-time
        if (this.keys['w']) {
            this.paddle1.y = Math.max(0, this.paddle1.y - this.paddle1.speed * factor);
        }
        if (this.keys['s']) {
            this.paddle1.y = Math.min(this.cssHeight - this.paddle1.height, this.paddle1.y + this.paddle1.speed * factor);
        }

        // Move player 2 / AI
        if (this.gameMode === 'pvp') {
            if (this.keys['ArrowUp']) {
                this.paddle2.y = Math.max(0, this.paddle2.y - this.paddle2.speed * factor);
            }
            if (this.keys['ArrowDown']) {
                this.paddle2.y = Math.min(this.cssHeight - this.paddle2.height, this.paddle2.y + this.paddle2.speed * factor);
            }
        } else {
            this.updateAIPaddle();
        }

        // Move ball scaled by delta-time
        this.ball.x += this.ball.dx * factor;
        this.ball.y += this.ball.dy * factor;

        // Collisions & scoring (use css dims)
        // Ball collision with top/bottom walls
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.y = this.ball.radius;
            this.ball.dy *= -1;
        } else if (this.ball.y + this.ball.radius >= this.cssHeight) {
            this.ball.y = this.cssHeight - this.ball.radius;
            this.ball.dy *= -1;
        }

        // Ball collision with paddles
        if (this.checkPaddleCollision(this.paddle1)) {
            this.ball.x = this.paddle1.x + this.paddle1.width + this.ball.radius;
            this.ball.dx = Math.abs(this.ball.dx);
            this.adjustBallAngle(this.paddle1);
        } else if (this.checkPaddleCollision(this.paddle2)) {
            this.ball.x = this.paddle2.x - this.ball.radius;
            this.ball.dx = -Math.abs(this.ball.dx);
            this.adjustBallAngle(this.paddle2);
        }

        // Ball out of bounds (scoring)
        if (this.ball.x - this.ball.radius <= 0) {
            this.score.player2++;
            this.resetBall();
        } else if (this.ball.x + this.ball.radius >= this.cssWidth) {
            this.score.player1++;
            this.resetBall();
        }

        // Check for game end
        if (this.score.player1 >= 5 || this.score.player2 >= 5) {
            this.endGame();
        } else {
            this.draw();
        }

        this.lastTime = timestamp;
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
        const winner = this.score.player1 >= 5 
            ? 'Player 1' 
            : this.gameMode === 'pvp' ? 'Player 2' : 'AI';
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
        
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
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }

    public resetForNewMatch(): void {
        this.stop();
        this.resetGameState();
        this.keys = {};
    }

    private resetGameState(): void {
        this.ball.x = this.cssWidth / 2;
        this.ball.y = this.cssHeight / 2;
        this.ball.dx = 5;
        this.ball.dy = 5;
        this.ball.radius = 8;

        this.paddle1.x = 20;
        this.paddle1.y = this.cssHeight / 2 - 50;
        this.paddle1.width = 10;
        this.paddle1.height = 100;
        this.paddle1.speed = 8;

        this.paddle2.x = this.cssWidth - 30;
        this.paddle2.y = this.cssHeight / 2 - 50;
        this.paddle2.width = 10;
        this.paddle2.height = 100;
        this.paddle2.speed = 8;

        this.score.player1 = 0;
        this.score.player2 = 0;
    }
    
    public getScore(): Score {
        return { ...this.score };
    }
}
