// Move the multiplayer game logic here

export type BroadcastFn = (msg: any) => void;

interface Ball { x: number; y: number; dx: number; dy: number; radius: number; }
interface Scores { player1: number; player2: number; }

export class GameEngine {
  private width: number;
  private height: number;
  private ball: Ball;
  private paddles: { p1: number; p2: number };
  private inputs: { p1: { up: boolean; down: boolean }; p2: { up: boolean; down: boolean } };
  private scores: Scores;
  private tickInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private broadcasterFn: BroadcastFn;
  private running = false;
  private readonly PADDLE_HEIGHT = 100;
  private readonly PADDLE_SPEED = 6;
  private readonly BALL_SPEED_INIT = 5;
  private readonly WIN_SCORE = 5;

  constructor(broadcast: BroadcastFn, width = 800, height = 600, tickMs = 50) {
    this.width = width;
    this.height = height;
    this.broadcasterFn = broadcast;
    this.tickInterval = tickMs;

    this.ball = {
      x: width / 2,
      y: height / 2,
      dx: (Math.random() > 0.5 ? 1 : -1) * this.BALL_SPEED_INIT,
      dy: (Math.random() - 0.5) * 4,
      radius: 8
    };

    this.paddles = {
      p1: (height / 2) - (this.PADDLE_HEIGHT / 2),
      p2: (height / 2) - (this.PADDLE_HEIGHT / 2)
    };

    this.inputs = { p1: { up: false, down: false }, p2: { up: false, down: false } };
    this.scores = { player1: 0, player2: 0 };
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.step(), this.tickInterval);
    this.broadcastState();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  public destroy(): void {
    this.stop();
  }

  public applyInput(player: 1 | 2, direction: 'up' | 'down', keydown: boolean): void {
    const target = player === 1 ? this.inputs.p1 : this.inputs.p2;
    if (direction === 'up') target.up = keydown;
    else target.down = keydown;
  }

  private step(): void {
    if (this.inputs.p1.up) this.paddles.p1 = Math.max(0, this.paddles.p1 - this.PADDLE_SPEED);
    if (this.inputs.p1.down) this.paddles.p1 = Math.min(this.height - this.PADDLE_HEIGHT, this.paddles.p1 + this.PADDLE_SPEED);
    if (this.inputs.p2.up) this.paddles.p2 = Math.max(0, this.paddles.p2 - this.PADDLE_SPEED);
    if (this.inputs.p2.down) this.paddles.p2 = Math.min(this.height - this.PADDLE_HEIGHT, this.paddles.p2 + this.PADDLE_SPEED);

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.dy *= -1;
    } else if (this.ball.y + this.ball.radius >= this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.dy *= -1;
    }

    if (this.ball.x - this.ball.radius <= 30) {
      const p1Top = this.paddles.p1;
      const p1Bottom = p1Top + this.PADDLE_HEIGHT;
      if (this.ball.y >= p1Top && this.ball.y <= p1Bottom) {
        this.ball.x = 30 + this.ball.radius;
        this.ball.dx = Math.abs(this.ball.dx) * 1.03;
        const hit = (this.ball.y - (p1Top + this.PADDLE_HEIGHT / 2)) / (this.PADDLE_HEIGHT / 2);
        this.ball.dy = hit * 5;
      }
    }

    if (this.ball.x + this.ball.radius >= this.width - 30) {
      const p2Top = this.paddles.p2;
      const p2Bottom = p2Top + this.PADDLE_HEIGHT;
      if (this.ball.y >= p2Top && this.ball.y <= p2Bottom) {
        this.ball.x = this.width - 30 - this.ball.radius;
        this.ball.dx = -Math.abs(this.ball.dx) * 1.03;
        const hit = (this.ball.y - (p2Top + this.PADDLE_HEIGHT / 2)) / (this.PADDLE_HEIGHT / 2);
        this.ball.dy = hit * 5;
      }
    }

    if (this.ball.x < 0) {
      this.scores.player2++;
      this.resetBall(-1);
    } else if (this.ball.x > this.width) {
      this.scores.player1++;
      this.resetBall(1);
    }

    this.broadcastState();

    if (this.scores.player1 >= this.WIN_SCORE || this.scores.player2 >= this.WIN_SCORE) {
      this.broadcast({ type: 'gameOver', winner: this.scores.player1 >= this.WIN_SCORE ? 1 : 2, state: this.serializeState() });
      this.stop();
    }
  }

  private resetBall(direction?: 1 | -1): void {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    const dir = direction ?? (Math.random() > 0.5 ? 1 : -1);
    this.ball.dx = dir * this.BALL_SPEED_INIT;
    this.ball.dy = (Math.random() - 0.5) * 4;
  }

  private serializeState() {
    return {
      ball: { x: Math.round(this.ball.x), y: Math.round(this.ball.y), dx: this.ball.dx, dy: this.ball.dy },
      paddles: { player1: Math.round(this.paddles.p1), player2: Math.round(this.paddles.p2) },
      score: { player1: this.scores.player1, player2: this.scores.player2 },
      width: this.width,
      height: this.height
    };
  }

  private broadcastState(): void {
    try { this.broadcasterFn({ type: 'gameState', state: this.serializeState() }); } catch (e) { /* ignore */ }
  }

  private broadcast(msg: any): void {
    try { this.broadcasterFn && this.broadcasterFn(msg); } catch (e) { /* ignore */ }
  }
}
