import { FastifyInstance, FastifyRequest } from 'fastify';
import { GameRoom } from '../game/GameRoom';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';

type WS = any;

interface UserRow {
  id: number;
  username: string;
  display_name: string;
}

// Global registry of connected users for presence broadcasting
const presenceConnections = new Map<number, Set<WS>>();

export function broadcastPresenceUpdate(userId: number, status: string, isOnline: boolean): void {
  const message = JSON.stringify({
    type: 'presence_update',
    userId,
    status,
    isOnline
  });
  
  // Broadcast to all connected clients
  for (const [_, sockets] of presenceConnections) {
    for (const socket of sockets) {
      try {
        if (socket.readyState === 1) { // OPEN state
          socket.send(message);
        }
      } catch (e) {
        // ignore send errors
      }
    }
  }
}

// Add helper to send direct messages to a specific user's connected sockets
export function sendDirectMessage(targetUserId: number, payload: any): void {
  const message = JSON.stringify(payload);
  const sockets = presenceConnections.get(targetUserId);
  if (!sockets) return;
  for (const s of sockets) {
    try {
      if (s.readyState === 1) s.send(message);
    } catch (e) {
      // ignore
    }
  }
}

// NEW: Helper to send notification updates to a specific user
export function sendNotificationUpdate(targetUserId: number): void {
  const message = JSON.stringify({
    type: 'notification_update'
  });
  
  const sockets = presenceConnections.get(targetUserId);
  if (!sockets) return;
  for (const s of sockets) {
    try {
      if (s.readyState === 1) s.send(message);
    } catch (e) {
      // ignore
    }
  }
}

export default async function websocketRoutes(fastify: FastifyInstance) {
  const rooms = new Map<string, GameRoom>();

  // Simple matchmaking queue (FIFO)
  const matchmakingQueue: Set<WS> = new Set();

  function removeFromQueue(ws: WS) {
    if (matchmakingQueue.has(ws)) {
      matchmakingQueue.delete(ws);
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'leftQueue' }));
      } catch (e) {}
    }
  }

  function tryMatchQueue() {
    // pair sockets when available
    while (matchmakingQueue.size >= 2) {
      const iter = matchmakingQueue.values();
      const a = iter.next().value as WS;
      const b = iter.next().value as WS;
      // sanity checks
      if (!a || !b) break;
      // remove from queue
      matchmakingQueue.delete(a);
      matchmakingQueue.delete(b);

      // create room and add both sockets
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const room = new GameRoom(roomId);
      rooms.set(roomId, room);

      const assignA = room.addClient(a);
      const assignB = room.addClient(b);

      // Setup proper message handlers for both sockets
      const setupSocketForRoom = (socket: WS, socketRoom: GameRoom, socketRoomId: string) => {
        // Remove old queue message handler
        socket.removeAllListeners('message');
        
        // Add new room message handler
        socket.on('message', (raw: any) => {
          let payload: any = null;
          try {
            const text = typeof raw === 'string' ? raw : raw.toString();
            payload = JSON.parse(text);
          } catch (err) {
            fastify.log.debug('Invalid WS message JSON (matched)', err as any);
            return;
          }
          try {
            socketRoom.handleMessage(socket, payload);
          } catch (e) {
            fastify.log.debug('Room handle message error (matched)', e as any);
          }
        });

        // Setup close handler for room cleanup
        socket.removeAllListeners('close');
        socket.on('close', () => {
          try {
            socketRoom.removeClient(socket);
            if (socketRoom.getClientCount && socketRoom.getClientCount() === 0) {
              rooms.delete(socketRoomId);
              fastify.log.info(`Room ${socketRoomId} deleted (empty)`);
            }
          } catch (err) {
            fastify.log.debug('Error during ws close (matched)', err as any);
          }

          // Handle presence cleanup
          const userId = (socket as any).user?.id;
          if (userId) {
            const userSockets = presenceConnections.get(userId);
            if (userSockets) {
              userSockets.delete(socket);
              if (userSockets.size === 0) {
                presenceConnections.delete(userId);
                try {
                  db.prepare('UPDATE users SET is_online = 0, status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run('Offline', userId);
                  broadcastPresenceUpdate(userId, 'Offline', false);
                } catch (e) {
                  fastify.log.debug({ err: e }, 'Failed to update user offline status');
                }
              }
            }
          }
        });
      };

      setupSocketForRoom(a, room, roomId);
      setupSocketForRoom(b, room, roomId);

      // send 'created' to host (A if assigned isHost true)
      try {
        const hostSocket = assignA.isHost ? a : (assignB.isHost ? b : a);
        if (hostSocket && (hostSocket as any).readyState === 1) {
          hostSocket.send(JSON.stringify({ type: 'created', roomId }));
        }
      } catch (e) {}
      // GameRoom will broadcast peerJoined and ready as usual
    }
  }

  const wsHandler = (connection: any, request: FastifyRequest) => {
    const socket: WS = connection.socket;
    const params = (request.params as any) || {};
    const query = (request.query as any) || {};
    let roomId: string | null = params.room || null;
    let socketUserId: number | null = null;

    // Attempt to decode JWT from query parameter or authorization header
    try {
      let token: string | null = null;
      
      // First try query parameter (for browser WebSocket connections)
      if (query.token) {
        token = query.token;
      } else {
        // Fallback to authorization header
        const authHeader = (request.headers.authorization || '') as string;
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
          token = parts[1];
        }
      }
      
      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as any;
          const userId = Number(decoded.userId);
          if (!Number.isNaN(userId)) {
            const row = db.prepare('SELECT id, username, display_name, status, is_online FROM users WHERE id = ?').get(userId) as (UserRow & { status?: string; is_online?: number }) | undefined;
            if (row) {
              (socket as any).user = { id: row.id, username: row.username, display_name: row.display_name };
              socketUserId = row.id;
              
              // Register socket for presence updates
              if (!presenceConnections.has(userId)) {
                presenceConnections.set(userId, new Set());
              }
              presenceConnections.get(userId)!.add(socket);
              
              // Broadcast user came online (if not already)
              if (!row.is_online) {
                db.prepare('UPDATE users SET is_online = 1, status = ? WHERE id = ?').run(row.status || 'Online', userId);
                broadcastPresenceUpdate(userId, row.status || 'Online', true);
              }
            }
          }
        } catch (err2) {
          fastify.log.debug('WS token verify failed', err2 as any);
        }
      }
    } catch (err) {
      fastify.log.debug('WS auth decode failed', err as any);
    }

    // If client explicitly requested matchmaking queue via query param, enqueue and return
    if (query && (query.queue === '1' || query.queue === 'true' || query.queue === 1 || query.queue === true)) {
      // register presence as above (already done)
      try {
        matchmakingQueue.add(socket);
        // send waiting notification
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'waitingForOpponent', room: null }));
        }
      } catch (e) {}

      // wire basic message and close handlers to allow leave and cleanup
      socket.on('message', (raw: any) => {
        let payload: any = null;
        try {
          const text = typeof raw === 'string' ? raw : raw.toString();
          payload = JSON.parse(text);
        } catch (err) {
          fastify.log.debug('Invalid WS message JSON (queue)', err as any);
          return;
        }
        try {
          if (payload?.type === 'leaveQueue') {
            removeFromQueue(socket);
          }
          // ignore other messages while in queue
        } catch (e) {
          fastify.log.debug('Queue message handling error', e as any);
        }
      });

      socket.on('close', () => {
        try {
          removeFromQueue(socket);
        } catch (e) {
          fastify.log.debug('Error removing socket from queue on close', e as any);
        }

        // presence cleanup follows below (reuse existing cleanup logic)
        // Note: we'll fall through to the presence cleanup handled after add/remove logic
      });

      // Try to match immediately after enqueue
      tryMatchQueue();
      return;
    }

    // Non-queue flow: create/join a room immediately (existing behavior)
    if (!roomId) {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new GameRoom(roomId));
    }
    const room = rooms.get(roomId)!;

    const assignment = room.addClient(socket);
    fastify.log.info(`Socket joined room ${roomId} as player ${assignment.player} host=${assignment.isHost} user=${socketUserId || 'anonymous'}`);

    // If this connection created a fresh room and it's the host, send a created message
    try {
      if (assignment.isHost && room.getPlayerCount && room.getPlayerCount() === 1) {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'created', roomId }));
        }
      }
    } catch (e) {}

    socket.on('message', (raw: any) => {
      let payload: any = null;
      try {
        const text = typeof raw === 'string' ? raw : raw.toString();
        payload = JSON.parse(text);
      } catch (err) {
        fastify.log.debug('Invalid WS message JSON', err as any);
        return;
      }
      try {
        room.handleMessage(socket, payload);
      } catch (e) {
        fastify.log.debug('Room handle message error', e as any);
      }
    });

    socket.on('close', () => {
      try {
        room.removeClient(socket);
        if (room.getClientCount && room.getClientCount() === 0) {
          rooms.delete(roomId!);
          fastify.log.info(`Room ${roomId} deleted (empty)`);
        }
      } catch (err) {
        fastify.log.debug('Error during ws close', err as any);
      }

      // Handle presence cleanup
      if (socketUserId) {
        const userSockets = presenceConnections.get(socketUserId);
        if (userSockets) {
          userSockets.delete(socket);
          // If this was the last socket for this user, mark them offline
          if (userSockets.size === 0) {
            presenceConnections.delete(socketUserId);
            try {
              db.prepare('UPDATE users SET is_online = 0, status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run('Offline', socketUserId);
              broadcastPresenceUpdate(socketUserId, 'Offline', false);
            } catch (e) {
              fastify.log.debug({ err: e }, 'Failed to update user offline status');
            }
          }
        }
      }
    });

    socket.on('error', (err: any) => {
      fastify.log.debug('WS error', err as any);
    });
  };

  fastify.get('/ws', { websocket: true }, wsHandler);
  fastify.get('/ws/:room', { websocket: true }, wsHandler);
}
