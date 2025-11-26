import { GameEngine } from './GameEngine';

type WS = any;

export class GameRoom {
  public id: string;
  private clients = new Set<WS>();
  private engine: GameEngine;
  private playerMap = new Map<WS, 1 | 2 | null>();

  constructor(id: string) {
    this.id = id;

    const broadcaster = (msg: any) => {
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

    // allow up to 2 players (others become spectators)
    this.clients.add(socket);

    const existingPlayers = Array.from(this.playerMap.values()).filter(v => v === 1 || v === 2) as Array<1 | 2>;
    let assigned: 1 | 2 | null = null;
    if (existingPlayers.length < 2) {
      assigned = existingPlayers.includes(1) ? 2 : 1;
      this.playerMap.set(socket, assigned);
    } else {
      this.playerMap.set(socket, null); // spectator
    }

    const isHost = assigned === 1;

    try { socket.send(JSON.stringify({ type: 'joined', roomId: this.id, isHost, player: assigned ?? null })); } catch (e) {}

    // Start engine when there are two players connected
    if (this.getPlayerCount() >= 2) {
      this.engine.start();
      // notify players that both are present
      this.broadcastToAll({ type: 'peerJoined', roomId: this.id });
    }

    return { player: assigned, isHost };
  }

  public removeClient(socket: WS): void {
    if (!this.clients.has(socket)) return;
    const wasPlayer = this.playerMap.get(socket);
    this.clients.delete(socket);
    this.playerMap.delete(socket);

    // notify remaining
    this.broadcastToAll({ type: 'peerLeft', roomId: this.id });

    // if fewer than 2 players, stop engine
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
      case 'join':
        // handled at connection level by route logic
        break;
      default:
        // ignore or broadcast to spectators
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

  public getClientCount(): number {
    return this.clients.size;
  }

  public getPlayerCount(): number {
    let count = 0;
    for (const v of this.playerMap.values()) if (v === 1 || v === 2) count++;
    return count;
  }

  private broadcastToAll(msg: any): void {
    const data = JSON.stringify(msg);
    for (const s of this.clients) {
      try { if ((s as any).readyState === 1) (s as any).send(data); } catch (e) {}
    }
  }
}