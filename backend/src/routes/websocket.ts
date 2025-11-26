import { FastifyInstance, FastifyRequest } from 'fastify';
import { GameRoom } from '../game/GameRoom';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';

type WS = any;

export default async function websocketRoutes(fastify: FastifyInstance) {
  const rooms = new Map<string, GameRoom>();

  const wsHandler = (connection: any, request: FastifyRequest) => {
    const socket: WS = connection.socket;
    const params = (request.params as any) || {};
    let roomId: string | null = params.room || null;

    // Attempt to decode JWT from the request headers and attach basic user info to socket
    try {
      const authHeader = (request.headers.authorization || '') as string;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        const userId = Number(decoded.userId);
        if (!Number.isNaN(userId)) {
          const row = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(userId);
          if (row) {
            (socket as any).user = { id: row.id, username: row.username, display_name: row.display_name };
          }
        }
      }
    } catch (err) {
      fastify.log.debug('WS auth decode failed', err as any);
      // continue without user info
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
        // cleanup empty room
        if (room.getClientCount && room.getClientCount() === 0) {
          rooms.delete(roomId!);
          fastify.log.info(`Room ${roomId} deleted (empty)`);
        }
      } catch (err) {
        fastify.log.debug('Error during ws close', err as any);
      }
    });

    socket.on('error', (err: any) => {
      fastify.log.debug('WS error', err as any);
    });
  };

  fastify.get('/ws', { websocket: true }, wsHandler);
  fastify.get('/ws/:room', { websocket: true }, wsHandler);
}