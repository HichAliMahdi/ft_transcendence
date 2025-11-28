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

export default async function websocketRoutes(fastify: FastifyInstance) {
  const rooms = new Map<string, GameRoom>();

  const wsHandler = (connection: any, request: FastifyRequest) => {
    const socket: WS = connection.socket;
    const params = (request.params as any) || {};
    let roomId: string | null = params.room || null;
    let socketUserId: number | null = null;

    // Attempt to decode JWT from the request headers and attach basic user info to socket
    try {
      const authHeader = (request.headers.authorization || '') as string;
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
        const token = parts[1];
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

    if (!roomId) {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new GameRoom(roomId));
    }
    const room = rooms.get(roomId)!;

    const assignment = room.addClient(socket);
    fastify.log.info(`Socket joined room ${roomId} as player ${assignment.player} host=${assignment.isHost}`);

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
            db.prepare('UPDATE users SET is_online = 0, status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run('Offline', socketUserId);
            broadcastPresenceUpdate(socketUserId, 'Offline', false);
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
