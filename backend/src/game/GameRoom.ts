import { GameEngine, BroadcastFn } from './GameEngine';

type WS = any;

export class GameRoom {
  public id: string;
  private clients = new Set<WS>();
  private engine: GameEngine;
  private playerMap = new Map<WS, 1 | 2>();

  constructor(id: string) {
    this.id = id;
    const broadcaster: BroadcastFn = (msg: any) => {
      const data = JSON.stringify(msg);
      for (const s of this.clients) {
        try {
          if ((s as any).readyState === 1) (s as any).send(data);
        } catch (e) {}
      }
    };
    this.engine = new GameEngine(broadcaster);
  }

  public addClient(socket: WS): { player: 1 | 2 | null; isHost: boolean } {
    if (this.clients.has(socket)) return { player: this.playerMap.get(socket) ?? null, isHost: false };

    if (this.clients.size >= 2) {
      this.clients.add(socket);
      this.playerMap.set(socket, null as any);
      try { socket.send(JSON.stringify({ type: 'joined', roomId: this.id, isHost: false, spectator: true })); } catch (e) {}
      return { player: null, isHost: false };
    }

    this.clients.add(socket);
    const existingPlayers = Array.from(this.playerMap.values());
    let assigned: 1 | 2 = existingPlayers.includes(1) ? 2 : 1;
    this.playerMap.set(socket, assigned);

    const isHost = assigned === 1;

    try { socket.send(JSON.stringify({ type: 'joined', roomId: this.id, isHost })); } catch (e) {}

    if (this.getPlayerCount() >= 2 && !this.isEngineRunning()) {
      this.engine.start();
      broadcasterNotify(this.clients, { type: 'peerJoined', roomId: this.id });
    }

    return { player: assigned, isHost };
  }

  public removeClient(socket: WS): void {
    if (!this.clients.has(socket)) return;
    const player = this.playerMap.get(socket);
    this.clients.delete(socket);
    this.playerMap.delete(socket);

    broadcasterNotify(this.clients, { type: 'peerLeft', roomId: this.id });

    if (this.getPlayerCount() < 2) this.engine.stop();
  }

  public handleMessage(socket: WS, msg: any): void {
    if (!msg || typeof msg !== 'object') return;
    const player = this.playerMap.get(socket);
    switch (msg.type) {
      case 'paddleMove':
        if (!player) return;
        this.engine.applyInput(player, msg.direction, !!msg.keydown);
        break;
      case 'create':
        break;
      case 'join':
        break;
      default:
        break;
    }
  }

  public destroy(): void {
    try { this.engine.destroy(); } catch (e) {}
    for (const s of this.clients) {
      try { s.close(); } catch (e) {}
    }
    this.clients.clear();
    this.playerMap.clear();
  }

  private getPlayerCount(): number {
    let count = 0;
    for (const v of this.playerMap.values()) if (v === 1 || v === 2) count++;
    return count;
  }

  private isEngineRunning(): boolean {
    return false;
  }
}

function broadcasterNotify(clients: Set<WS>, msg: any) {
  const data = JSON.stringify(msg);
  for (const s of clients) {
    try { if ((s as any).readyState === 1) (s as any).send(data); } catch (e) {}
  }
}