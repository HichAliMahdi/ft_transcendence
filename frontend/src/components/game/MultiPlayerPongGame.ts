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
        
    }
    
    private resizeCanvas(): void {

    }
}