import { GameEngine } from './GameEngine';

type WS = any;

export class GameRoom {
  public id: string;
  private clients = new Set<WS>();
  private engine: GameEngine;
  private playerMap = new Map<WS, 1 | 2 | null>();

  private sendQueues = new Map<WS, string[]>();
  private draining = new Set<WS>();

  private readonly MAX_BUFFERED = 64 * 1024;
  private readonly MAX_QUEUE = 300;

  constructor(id: string) {
    this.id = id;

    const broadcaster = (msg: any) => {
      const data = JSON.stringify(msg);
      for (const s of this.clients) {
        try {
          this.enqueueSend(s, data);
        } catch (e) {
          try { (s as any).terminate?.(); } catch (_) {}
        }
      }
    };

    this.engine = new GameEngine(broadcaster);
  }

  private enqueueSend(socket: WS, data: string): void {
    if (!this.clients.has(socket)) return;
    const q = this.sendQueues.get(socket) || [];
    if (q.length >= this.MAX_QUEUE) {
      q.shift();
    }
    q.push(data);
    this.sendQueues.set(socket, q);
    if (!this.draining.has(socket)) {
      this.startDrain(socket);
    }
  }

  private startDrain(socket: WS): void {
    this.draining.add(socket);
    setTimeout(() => this.drainOnce(socket), 0);
  }

  private drainOnce(socket: WS): void {
    if (!this.clients.has(socket)) { this.cleanupSocketQueue(socket); return; }
    const wsAny = socket as any;
    try {
      if (wsAny.readyState !== 1) { this.cleanupSocketQueue(socket); return; }

      const buffered = typeof wsAny.bufferedAmount === 'number' ? wsAny.bufferedAmount : 0;
      if (buffered > this.MAX_BUFFERED * 8) {
        try { wsAny.terminate?.(); } catch (_) {}
        this.cleanupSocketQueue(socket);
        return;
      } else if (buffered > this.MAX_BUFFERED) {
        setTimeout(() => this.drainOnce(socket), 50);
        return;
      }

      const q = this.sendQueues.get(socket) || [];
      if (q.length === 0) {
        this.draining.delete(socket);
        return;
      }

      const msg = q.shift()!;
      this.sendQueues.set(socket, q);

      try {
        wsAny.send(msg, (err: any) => {
          if (err) {
            try { wsAny.terminate?.(); } catch (_) {}
            this.cleanupSocketQueue(socket);
            return;
          }
          setTimeout(() => this.drainOnce(socket), 0);
        });
      } catch (e) {
        try { wsAny.terminate?.(); } catch (_) {}
        this.cleanupSocketQueue(socket);
      }
    } catch (e) {
      try { (socket as any).terminate?.(); } catch (_) {}
      this.cleanupSocketQueue(socket);
    }
  }

  private cleanupSocketQueue(socket: WS): void {
    this.sendQueues.delete(socket);
    this.draining.delete(socket);
  }

  public addClient(socket: WS): { player: 1 | 2 | null; isHost: boolean } {
    if (this.clients.has(socket)) return { player: this.playerMap.get(socket) ?? null, isHost: false };

    this.clients.add(socket);
    this.sendQueues.set(socket, []);

    try {
      const wsAny = socket as any;
      wsAny.on('close', () => {
        try { this.removeClient(socket); } catch (e) {}
      });
      wsAny.on('error', () => {
        try { wsAny.terminate?.(); } catch (_) {}
        try { this.removeClient(socket); } catch (e) {}
      });
    } catch (e) {}

    const existingPlayers = Array.from(this.playerMap.values()).filter(v => v === 1 || v === 2) as Array<1 | 2>;
    let assigned: 1 | 2 | null = null;
    if (existingPlayers.length < 2) {
      assigned = existingPlayers.includes(1) ? 2 : 1;
      this.playerMap.set(socket, assigned);
    } else {
      this.playerMap.set(socket, null);
    }

    const isHost = assigned === 1;

    try {
      // include socket-attached user info if present
      const wsAny = socket as any;
      const userInfo = wsAny.user ? { id: wsAny.user.id, username: wsAny.user.username, display_name: wsAny.user.display_name } : null;
      const joinedMsg = JSON.stringify({ type: 'joined', roomId: this.id, isHost, player: assigned ?? null, user: userInfo });
      this.enqueueSend(socket, joinedMsg);
    } catch (e) {}

    // if both players present, broadcast peerJoined and ready immediately
    if (this.getPlayerCount() >= 2) {
      // collect player sockets and attached user info
      const playersInfo: Array<{ player: number; user: { id?: number; username?: string; display_name?: string } | null }> = [];
      for (const [s, p] of this.playerMap.entries()) {
        if (p === 1 || p === 2) {
          const su = (s as any).user || null;
          playersInfo.push({ player: p, user: su ? { id: su.id, username: su.username, display_name: su.display_name } : null });
        }
      }
      this.engine.start(); // <-- Start game engine immediately
      this.broadcastToAll({ type: 'peerJoined', roomId: this.id, players: playersInfo });
      this.broadcastToAll({ type: 'ready', roomId: this.id }); // <-- Notify clients game is ready
    }

    return { player: assigned, isHost };
  }

  public removeClient(socket: WS): void {
    if (!this.clients.has(socket)) return;
    this.clients.delete(socket);
    this.playerMap.delete(socket);
    this.cleanupSocketQueue(socket);

    this.broadcastToAll({ type: 'peerLeft', roomId: this.id });

    if (this.getPlayerCount() < 2) this.engine.stop();
  }

  public handleMessage(socket: WS, msg: any): void {
    if (!msg || typeof msg !== 'object') return;
    const player = this.playerMap.get(socket);
    switch (msg.type) {
      case 'paddleMove':
        if (!player || (player !== 1 && player !== 2)) return;
        if (!msg.direction || typeof msg.keydown !== 'boolean') return;
        this.engine.applyInput(player, msg.direction, msg.keydown);
        break;
      case 'create':
      case 'join':
        break;
      default:
        break;
    }
  }

  public destroy(): void {
    try { this.engine.destroy(); } catch (e) {}
    for (const s of this.clients) {
      try { s.close?.(); } catch (e) {}
      this.cleanupSocketQueue(s);
    }
    this.clients.clear();
    this.playerMap.clear();
    this.sendQueues.clear();
    this.draining.clear();
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
      try { this.enqueueSend(s, data); } catch (e) { try { (s as any).terminate?.(); } catch (_) {} }
    }
  }
}
