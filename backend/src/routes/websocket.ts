import { FastifyInstance, FastifyRequest } from 'fastify';

type WS = any;

interface Room {
  id: string;
  clients: Set<WS>;
  host?: WS;
  createdAt: number;
}

function generateRoomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < len; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default async function websocketRoutes(fastify: FastifyInstance) {
  const rooms = new Map<string, Room>();

  const broadcast = (roomId: string, msg: any, exclude?: WS) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(msg);
    for (const c of room.clients) {
      try {
        if (c !== exclude && (c as any).readyState === 1) (c as any).send(data);
      } catch (e) {
        fastify.log.debug('Broadcast send failed', e as any);
      }
    }
  };

  // Handler shared for both /ws and /ws/:room
  const wsHandler = (connection: any, request: FastifyRequest) => {
    const socket: WS = connection.socket;
    const params = (request.params as any) || {};
    let roomId: string | null = params.room || null;

    let isHost = false;
    if (!roomId) {
      roomId = generateRoomCode();
      isHost = true;
      rooms.set(roomId, { id: roomId, clients: new Set(), host: socket, createdAt: Date.now() });
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { id: roomId, clients: new Set(), createdAt: Date.now() });
    }

    const room = rooms.get(roomId)!;
    room.clients.add(socket);
    if (isHost) room.host = socket;

    fastify.log.info(`WS connected to room ${roomId} (clients=${room.clients.size})`);

    if (room.clients.size > 1) {
      broadcast(roomId, { type: 'peerJoined', roomId }, socket);
    }

    try {
      (socket as any).send(JSON.stringify({ type: 'joined', roomId, isHost }));
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

      const type = payload?.type;
      switch (type) {
        case 'paddleMove':
          broadcast(roomId!, { type: 'paddleMove', from: payload.from || null, direction: payload.direction, keydown: payload.keydown }, socket);
          break;

        case 'state':
          broadcast(roomId!, { type: 'gameState', state: payload.state }, socket);
          break;

        case 'start':
        case 'ready':
        case 'leave':
          broadcast(roomId!, { type, payload }, socket);
          break;

        case 'create':
          const newCode = generateRoomCode();
          rooms.set(newCode, { id: newCode, clients: new Set([socket]), host: socket, createdAt: Date.now() });
          room.clients.delete(socket);
          (socket as any).send(JSON.stringify({ type: 'created', roomId: newCode }));
          break;

        case 'join':
          if (!payload.roomId) {
            (socket as any).send(JSON.stringify({ type: 'error', message: 'roomId required to join' }));
            break;
          }
          const target = rooms.get(String(payload.roomId));
          if (!target) {
            (socket as any).send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            break;
          }
          room.clients.delete(socket);
          target.clients.add(socket);
          (socket as any).send(JSON.stringify({ type: 'joined', roomId: target.id, isHost: false }));
          broadcast(target.id, { type: 'peerJoined', roomId: target.id }, socket);
          break;

        default:
          broadcast(roomId!, payload, socket);
          break;
      }
    });

    socket.on('close', () => {
      try {
        const r = rooms.get(roomId!);
        if (r) {
          r.clients.delete(socket);
          if (r.host === socket) r.host = undefined;
          fastify.log.info(`WS disconnected from room ${roomId} (clients=${r.clients.size})`);
          if (r.clients.size === 0) {
            rooms.delete(roomId!);
            fastify.log.info(`Room ${roomId} removed (empty)`);
          } else {
            broadcast(roomId!, { type: 'peerLeft', roomId });
          }
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