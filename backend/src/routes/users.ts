import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:id/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = (request.headers.authorization || '') as string;
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      if (!token) {
        return reply.status(401).send({ message: 'Token missing' });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as any;
      } catch (err: any) {
        return reply.status(401).send({ message: err?.message || 'Invalid or expired token' });
      }

      const reqUserId = Number((request.params as any).id);
      if (Number(decoded.userId) !== reqUserId) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      try {
        const stats = db.prepare(`
          SELECT
            COALESCE(games_played, 0)    AS games_played,
            COALESCE(matches_won, 0)     AS matches_won,
            COALESCE(matches_lost, 0)    AS matches_lost,
            COALESCE(tournaments_joined, 0) AS tournaments_joined,
            COALESCE(tournaments_won, 0) AS tournaments_won
          FROM user_stats WHERE user_id = ?
        `).get(reqUserId);

        if (stats) {
          return reply.code(200).send(stats);
        }
      } catch (err) {
        fastify.log.debug('user_stats query failed, falling back to defaults or aggregated queries');
      }

      const fallback = {
        games_played: 0,
        matches_won: 0,
        matches_lost: 0,
        tournaments_joined: 0,
        tournaments_won: 0
      };

      return reply.code(200).send(fallback);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Internal Server Error' });
    }
  });

  // Helper to verify token and return decoded payload or send 401
  function verifyAuth(request: FastifyRequest, reply: FastifyReply): { userId: number } | null {
    const authHeader = (request.headers.authorization || '') as string;
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      reply.status(401).send({ message: 'Token missing' });
      return null;
    }
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      return { userId: Number(decoded.userId) };
    } catch (err: any) {
      reply.status(401).send({ message: err?.message || 'Invalid or expired token' });
      return null;
    }
  }

  // GET friend list for a user. If requester === target, include pending; otherwise only accepted.
  fastify.get('/users/:id/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const targetId = Number((request.params as any).id);
    try {
      type FriendRow = {
        user_id: number;
        friend_id: number;
        status: string;
        other_id: number;
        username: string;
        display_name: string;
        avatar_url?: string | null;
        is_online?: number | null;
      };

      // cast DB output to any[] to avoid '{}' inference, then cast items where needed
      const rawRows = db.prepare(`
        SELECT f.user_id, f.friend_id, f.status,
               u.id      AS other_id,
               u.username,
               u.display_name,
               u.avatar_url,
               u.is_online
        FROM friends f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ?
        UNION
        SELECT f.user_id, f.friend_id, f.status,
               u.id      AS other_id,
               u.username,
               u.display_name,
               u.avatar_url,
               u.is_online
        FROM friends f
        JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = ?
      `).all(targetId, targetId) as any[]; // use any[] here

      const includePending = auth.userId === targetId;
      const filtered = rawRows
        .filter((r: any) => includePending ? true : String(r.status) === 'accepted')
        .map((r: any) => {
          const rr = r as FriendRow;
          const relation = rr.user_id === targetId ? 'outgoing' : (rr.friend_id === targetId ? 'incoming' : 'friend');
          return {
            id: rr.other_id,
            username: rr.username,
            display_name: rr.display_name,
            avatar_url: rr.avatar_url || null,
            is_online: !!rr.is_online,
            status: rr.status,
            relation
          };
        });

      return reply.code(200).send({ friends: filtered });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to fetch friends' });
    }
  });

  // Send a friend request to :id (authenticated user is sender)
  fastify.post('/users/:id/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const targetId = Number((request.params as any).id);
    const senderId = auth.userId;

    if (senderId === targetId) {
      return reply.status(400).send({ message: 'Cannot friend yourself' });
    }

    try {
      // Check if already exists in either direction - explicitly type the result
      type ExistingFriend = { status: string } | undefined;
      const existing = db.prepare(
        'SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
      ).get(senderId, targetId, targetId, senderId) as ExistingFriend;
      
      if (existing) {
        if (existing.status === 'pending') return reply.status(409).send({ message: 'Friend request already pending' });
        if (existing.status === 'accepted') return reply.status(409).send({ message: 'Already friends' });
      }

      db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(senderId, targetId, 'pending');
      // create notification for recipient (include sender username when available)
      try {
        const senderRow = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId) as { username?: string } | undefined;
        const senderUsername = senderRow?.username || null;
        db.prepare('INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)')
          .run(targetId, senderId, 'friend_request', JSON.stringify({ senderId, senderUsername }));
      } catch (e) { /* non-fatal */ }
      return reply.code(201).send({ message: 'Friend request sent' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to send friend request' });
    }
  });

  // Accept a friend request: target user (userId param) accepts a request sent by friendId
  fastify.post('/users/:userId/friends/:friendId/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const targetId = Number((request.params as any).userId);
    const requesterId = Number((request.params as any).friendId);

    if (auth.userId !== targetId) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    try {
      type PendingRequest = { status: string } | undefined;
      const row = db.prepare(
        'SELECT status FROM friends WHERE user_id = ? AND friend_id = ? AND status = ?'
      ).get(requesterId, targetId, 'pending') as PendingRequest;
      
      if (!row) {
        return reply.status(404).send({ message: 'Friend request not found' });
      }

      db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?').run('accepted', requesterId, targetId);
      return reply.code(200).send({ message: 'Friend request accepted' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to accept friend request' });
    }
  });

  // Remove a friendship or cancel a pending request (either direction)
  fastify.delete('/users/:userId/friends/:friendId', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const uid = Number((request.params as any).userId);
    const fid = Number((request.params as any).friendId);

    // Only either participant may remove the friendship
    if (auth.userId !== uid && auth.userId !== fid) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    try {
      const info = db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(uid, fid, fid, uid);
      if (info.changes === 0) {
        return reply.status(404).send({ message: 'Friendship not found' });
      }
      return reply.code(200).send({ message: 'Friendship removed' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to remove friendship' });
    }
  });

  // Get match history for a user (requires auth). Returns last N matches with opponent info and result for requested user.
  fastify.get('/users/:id/matches', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const targetId = Number((request.params as any).id);
    const limit = Number((request.query as any).limit) || 50;

    try {
      const matches = db.prepare(`
        SELECT m.id, m.player1_id, m.player2_id, m.player1_score, m.player2_score, m.winner_id, m.duration, m.played_at,
               p1.username AS player1_username, p1.display_name AS player1_display_name,
               p2.username AS player2_username, p2.display_name AS player2_display_name
        FROM matches m
        LEFT JOIN users p1 ON p1.id = m.player1_id
        LEFT JOIN users p2 ON p2.id = m.player2_id
        WHERE m.player1_id = ? OR m.player2_id = ?
        ORDER BY m.played_at DESC
        LIMIT ?
      `).all(targetId, targetId, limit) as any[];

      const formatted = matches.map(m => {
        const isPlayer1 = m.player1_id === targetId;
        const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
        const opponentUsername = isPlayer1 ? m.player2_username : m.player1_username;
        const opponentDisplay = isPlayer1 ? m.player2_display_name : m.player1_display_name;
        let result: 'win'|'loss'|'draw' = 'draw';
        if (m.winner_id) {
          result = (m.winner_id === targetId) ? 'win' : 'loss';
        }
        return {
          id: m.id,
          played_at: m.played_at,
          duration: m.duration,
          player_score: isPlayer1 ? m.player1_score : m.player2_score,
          opponent_score: isPlayer1 ? m.player2_score : m.player1_score,
          result,
          opponent: {
            id: opponentId,
            username: opponentUsername,
            display_name: opponentDisplay
          }
        };
      });

      return reply.code(200).send({ matches: formatted });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to fetch match history' });
    }
  });

  // Send friend request by username (authenticated)
  fastify.post('/users/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    try {
      const body = (request.body || {}) as any;
      const username = (body.username || '').toString().trim();
      if (!username) {
        return reply.status(400).send({ message: 'Username is required' });
      }

      const target = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id?: number } | undefined;
      if (!target || !target.id) {
        return reply.status(404).send({ message: 'User not found' });
      }
      const targetId = Number(target.id);
      const senderId = auth.userId;

      if (senderId === targetId) {
        return reply.status(400).send({ message: 'Cannot friend yourself' });
      }

      const existing = db.prepare(
        'SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
      ).get(senderId, targetId, targetId, senderId) as { status?: string } | undefined;

      if (existing) {
        if (existing.status === 'pending') return reply.status(409).send({ message: 'Friend request already pending' });
        if (existing.status === 'accepted') return reply.status(409).send({ message: 'Already friends' });
      }

      db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(senderId, targetId, 'pending');
 
       // notify recipient
       try {
        const senderRow = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId) as { username?: string } | undefined;
        const senderUsername = senderRow?.username || null;
        db.prepare('INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)')
          .run(targetId, senderId, 'friend_request', JSON.stringify({ senderId, senderUsername }));
       } catch (e) { /* ignore */ }

      return reply.code(201).send({ message: 'Friend request sent' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to send friend request' });
    }
  });

  // Get notifications for authenticated user
  fastify.get('/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    try {
      const rows = db.prepare(`
        SELECT id, user_id, actor_id, type, payload, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `).all(auth.userId);
      return reply.send({ notifications: rows });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  fastify.post('/notifications/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    try {
      const nid = Number((request.params as any).id);
      if (isNaN(nid)) return reply.code(400).send({ message: 'Invalid notification id' });

      const info = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(nid, auth.userId);
      if (info.changes === 0) {
        return reply.code(404).send({ message: 'Notification not found' });
      }
      return reply.send({ success: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to mark notification read' });
    }
  });
}
