interface MultiplayerBall {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

interface MultiplayerPaddle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    playerId: number;
    keys: {up: string; down: string};
}

interface MultiplayerScore {
    player1: number;
    player2: number;
    player3: number;
    player4: number;
}

export class MultiplayerPongGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private ball: MultiplayerBall;
    private paddles: MultiplayerPaddle[];
    private score: MultiplayerScore;
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private readonly FRAME_TIME: number = 1000 / 60;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context){
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;

        // Initializing ball in the center of the game
        this.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            dx: 4,
            dy: 4,
            radius: 8
        };

        // initialize the paddles
        this.paddles = [
            {
                // Top paddle
                x: canvas.width / 2 - 50,
                y: 20,
                width: 100,
                height: 10,
                speed: 8,
                playerId: 1,
                keys: { up: 'a', down: 'd' }
            },
            {
                // Right paddle
                x: canvas.width - 30,
                y: canvas.height / 2 - 50,
                width: 10,
                height: 100,
                speed: 8,
                playerId: 2,
                keys: { up: 'ArrowUp', down: 'ArrowDown' }
            },
            {
                // Bottom paddle
                x: canvas.width / 2 - 50,
                y: canvas.height - 30,
                width: 100,
                height: 10,
                speed: 8,
                playerId: 3,
                keys: { up: 'j', down: 'l' }
            },
            {
                // Left paddle
                x: 20,
                y: canvas.height / 2 - 50,
                width: 10,
                height: 100,
                speed: 8,
                playerId: 4,
                keys: { up: 'w', down: 's' }
            },
        ];
        this.score = {
            player1: 0,
            player2: 0,
            player3: 0,
            player4: 0
        };
        this.setupControls();
        this.resizeCanvas();
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

    }

    private handlePaddleCollision(paddle: MultiplayerPaddle): void {

    }

    private resetBall(): void {

    }

    private isGameOver(): boolean {

    }

    private getWinner(): number {

    }

    private draw(): void {

    }

    private gameLoop = (timestamp: number): void => {

    }

    public start(): void {

    }

    public stop(): void {

    }

    private endGame(): void {

    }

    private removeEventListeners(): void {

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