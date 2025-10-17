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
}