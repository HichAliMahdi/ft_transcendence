import { FastifyInstance, FastifyRequest } from 'fastify';
import { GameRoom } from '../game/GameRoom';

type WS = any;

export default async function websocketRoutes(fastify: FastifyInstance) {
  const rooms = new Map<string, GameRoom>();

  const wsHandler = (connection: any, request: FastifyRequest) => {
    const socket: WS = connection.socket;
    const params = (request.params as any) || {};
    let roomId: string | null = params.room || null;

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