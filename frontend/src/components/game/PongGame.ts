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

    // added fields for responsive sizing
    private cssWidth: number;
    private cssHeight: number;
    private aspectRatio = 4 / 3;
    private resizeObserver: ResizeObserver | null = null;

    private ball: Ball;
    private paddle1: Paddle;
    private paddle2: Paddle;
    private score: Score;

    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private isRunning = false;
    private lastTime = 0;
    private readonly FRAME_TIME = 1000 / 60;

    private keyHandler: ((e: KeyboardEvent) => void) | null = null;
    private visibilityHandler: (() => void) | null = null;
    private resizeHandler: (() => void) | null = null;

    // AI
    private gameMode: GameMode;
    private aiDifficulty: AIDifficulty;
    private aiTarget = 0;
    private aiLastUpdate = 0;

    constructor(canvas: HTMLCanvasElement, config: GameConfig = { mode: 'pvp' }) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;

        this.gameMode = config.mode;
        this.aiDifficulty = config.aiDifficulty ?? 'medium';

        // initialize css sizes and create DPR-backed buffer
        this.cssWidth = 800;
        this.cssHeight = Math.round(this.cssWidth / this.aspectRatio);
        this.updateCanvasSize();

        // Observe size changes of the canvas container and update backing buffer
        try {
            this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
            if (this.canvas.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
            else this.resizeObserver.observe(this.canvas);
        } catch (e) {
            // fallback: window resize
            window.addEventListener('resize', this.updateCanvasSize.bind(this));
        }

        // init state based on CSS sizes
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

        this.score = { player1: 0, player2: 0 };

        this.setupControls();

        this.visibilityHandler = () => {
            if (document.hidden) {
                this.stop();
            } else if (this.isRunning) {
                this.lastTime = performance.now();
                this.start();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        this.resizeHandler = () => {
            // no-op for now; keep canvas size fixed unless explicit responsive behavior is desired
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    // new: compute CSS size and set high-DPR canvas backing store
    private updateCanvasSize(): void {
        const rect = this.canvas.getBoundingClientRect();
        const computedWidth = Math.max(
            1,
            Math.round(rect.width || parseFloat(getComputedStyle(this.canvas).width) || this.cssWidth)
        );
        const computedHeight = Math.max(1, Math.round(rect.height || Math.round(computedWidth / this.aspectRatio)));

        this.cssWidth = computedWidth;
        this.cssHeight = computedHeight;

        const dpr = Math.max(1, window.devicePixelRatio || 1);
        this.canvas.style.width = `${this.cssWidth}px`;
        this.canvas.style.height = `${this.cssHeight}px`;
        this.canvas.width = Math.floor(this.cssWidth * dpr);
        this.canvas.height = Math.floor(this.cssHeight * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
            this.keys[e.key] = e.type === 'keydown';
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

    private getAISettings(): { speed: number; error: number; reactionDelay: number } {
        switch (this.aiDifficulty) {
            case 'easy': return { speed: 0.5, error: 80, reactionDelay: 200 };
            case 'medium': return { speed: 0.75, error: 40, reactionDelay: 100 };
            case 'hard': return { speed: 0.95, error: 15, reactionDelay: 30 };
            default: return { speed: 0.75, error: 40, reactionDelay: 100 };
        }
    }

    private predictBallY(): number {
        const distanceX = this.paddle2.x - this.ball.x;
        const timeToReach = Math.abs(this.ball.dx) < 0.0001 ? 0 : distanceX / Math.abs(this.ball.dx);
        let predictedY = this.ball.y + (this.ball.dy * timeToReach);

        // wrap/bounce prediction on CSS height
        const h = this.cssHeight;
        predictedY = ((predictedY % h) + h) % h;
        const bounceCount = Math.floor(Math.abs((this.ball.y + this.ball.dy * timeToReach) / h));
        if (bounceCount % 2 === 1) predictedY = h - predictedY;
        return predictedY;
    }

    private updateAIPaddle(): void {
        const now = performance.now();
        const s = this.getAISettings();

        if (now - this.aiLastUpdate > s.reactionDelay) {
            if (this.ball.dx > 0) {
                this.aiTarget = this.predictBallY() + (Math.random() - 0.5) * s.error * 2;
            } else {
                this.aiTarget = this.cssHeight / 2;
            }
            this.aiLastUpdate = now;
        }

        const paddleCenter = this.paddle2.y + this.paddle2.height / 2;
        const dist = this.aiTarget - paddleCenter;
        if (Math.abs(dist) > 5) {
            const move = this.paddle2.speed * s.speed;
            this.paddle2.y = Math.max(0, Math.min(this.cssHeight - this.paddle2.height, this.paddle2.y + Math.sign(dist) * move));
        }
    }

    private checkPaddleCollision(p: Paddle): boolean {
        const closestX = Math.max(p.x, Math.min(this.ball.x, p.x + p.width));
        const closestY = Math.max(p.y, Math.min(this.ball.y, p.y + p.height));
        const dx = this.ball.x - closestX;
        const dy = this.ball.y - closestY;
        return (dx * dx + dy * dy) <= (this.ball.radius * this.ball.radius);
    }

    private adjustBallAngle(p: Paddle): void {
        const hitPos = (this.ball.y - (p.y + p.height / 2)) / (p.height / 2);
        const maxAngle = Math.PI / 4;
        const angle = hitPos * maxAngle;
        const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const dir = this.ball.dx > 0 ? 1 : -1;

        this.ball.dx = dir * speed * Math.cos(angle);
        this.ball.dy = speed * Math.sin(angle);

        const newSpeed = Math.min(speed * 1.05, 15);
        const curSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const ratio = newSpeed / curSpeed;
        this.ball.dx *= ratio;
        this.ball.dy *= ratio;
    }

    private resetBall(): void {
        this.ball.x = this.cssWidth / 2;
        this.ball.y = this.cssHeight / 2;
        const angle = (Math.random() * Math.PI / 2) - Math.PI / 4;
        const speed = 5;
        const dir = Math.random() > 0.5 ? 1 : -1;
        this.ball.dx = dir * speed * Math.cos(angle);
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
        // background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

        // center dashed line
        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.cssWidth / 2, 0);
        this.ctx.lineTo(this.cssWidth / 2, this.cssHeight);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // paddles
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.paddle1.x, this.paddle1.y, this.paddle1.width, this.paddle1.height);
        this.ctx.fillRect(this.paddle2.x, this.paddle2.y, this.paddle2.width, this.paddle2.height);

        // ball
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // score
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(String(this.score.player1), this.cssWidth / 4, 50);
        this.ctx.fillText(String(this.score.player2), (3 * this.cssWidth) / 4, 50);

        // hints
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('W/S', 20, this.cssHeight - 20);
        this.ctx.textAlign = 'right';
        if (this.gameMode === 'pvp') {
            this.ctx.fillText('↑/↓', this.cssWidth - 20, this.cssHeight - 20);
        } else {
            this.ctx.fillText(`AI (${this.aiDifficulty})`, this.cssWidth - 20, this.cssHeight - 20);
        }
    }

    private endGame(): void {
        this.stop();
        const winner = this.score.player1 >= 5 ? 'Player 1' : (this.gameMode === 'pvp' ? 'Player 2' : 'AI');

        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.cssWidth / 2, this.cssHeight / 2 - 40);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`${winner} Wins!`, this.cssWidth / 2, this.cssHeight / 2 + 20);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.fillText('Press SPACE to play again', this.cssWidth / 2, this.cssHeight / 2 + 60);
    }

    private gameLoop = (timestamp: number): void => {
        if (!this.isRunning) return;

        const delta = Math.min(100, (timestamp - this.lastTime) || this.FRAME_TIME);
        const factor = delta / this.FRAME_TIME;

        // player 1
        if (this.keys['w']) {
            this.paddle1.y = Math.max(0, this.paddle1.y - this.paddle1.speed * factor);
        }
        if (this.keys['s']) {
            this.paddle1.y = Math.min(this.cssHeight - this.paddle1.height, this.paddle1.y + this.paddle1.speed * factor);
        }

        // player 2 / AI
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

        // ball movement
        this.ball.x += this.ball.dx * factor;
        this.ball.y += this.ball.dy * factor;

        // collisions
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.y = this.ball.radius;
            this.ball.dy *= -1;
        } else if (this.ball.y + this.ball.radius >= this.cssHeight) {
            this.ball.y = this.cssHeight - this.ball.radius;
            this.ball.dy *= -1;
        }

        if (this.checkPaddleCollision(this.paddle1)) {
            this.ball.x = this.paddle1.x + this.paddle1.width + this.ball.radius;
            this.ball.dx = Math.abs(this.ball.dx);
            this.adjustBallAngle(this.paddle1);
        } else if (this.checkPaddleCollision(this.paddle2)) {
            this.ball.x = this.paddle2.x - this.ball.radius;
            this.ball.dx = -Math.abs(this.ball.dx);
            this.adjustBallAngle(this.paddle2);
        }

        // scoring
        if (this.ball.x - this.ball.radius <= 0) {
            this.score.player2++;
            this.resetBall();
        } else if (this.ball.x + this.ball.radius >= this.cssWidth) {
            this.score.player1++;
            this.resetBall();
        }

        if (this.score.player1 >= 5 || this.score.player2 >= 5) {
            this.endGame();
        } else {
            this.draw();
            this.lastTime = timestamp;
            this.animationId = requestAnimationFrame(this.gameLoop);
        }
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
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
        // cleanup ResizeObserver or fallback listener
        if (this.resizeObserver) {
            try {
                if (this.canvas.parentElement) this.resizeObserver.unobserve(this.canvas.parentElement);
                else this.resizeObserver.unobserve(this.canvas);
            } catch (e) {}
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        } else {
            window.removeEventListener('resize', this.updateCanvasSize as any);
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
