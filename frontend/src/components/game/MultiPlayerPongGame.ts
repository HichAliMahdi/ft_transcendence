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
        if (!context)
            throw new Error('Could not get canvas context');
        this.ctx = context;
    }

    // Initializing ball in the center of the game
    this.ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        dx: 4,
        dy: 4,
        radius: 8
    };
    
}