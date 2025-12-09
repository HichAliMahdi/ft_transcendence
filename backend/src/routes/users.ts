import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';
import { broadcastPresenceUpdate, sendNotificationUpdate, sendDirectMessage } from './websocket';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';

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
        user_status?: string | null;
      };

      const rawRows = db.prepare(`
        SELECT f.user_id, f.friend_id, f.status,
               u.id      AS other_id,
               u.username,
               u.display_name,
               u.avatar_url,
               u.is_online,
               u.status  AS user_status
        FROM friends f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ?
        UNION
        SELECT f.user_id, f.friend_id, f.status,
               u.id      AS other_id,
               u.username,
               u.display_name,
               u.avatar_url,
               u.is_online,
               u.status  AS user_status
        FROM friends f
        JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = ?
      `).all(targetId, targetId) as any[];

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
            user_status: rr.user_status || 'Offline',
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

  fastify.post('/users/:id/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const targetId = Number((request.params as any).id);
    const senderId = auth.userId;

    if (senderId === targetId) {
      return reply.status(400).send({ message: 'Cannot friend yourself' });
    }

    try {
      type ExistingFriend = { status: string } | undefined;
      const existing = db.prepare(
        'SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
      ).get(senderId, targetId, targetId, senderId) as ExistingFriend;
      
      if (existing) {
        if (existing.status === 'pending') return reply.status(409).send({ message: 'Friend request already pending' });
        if (existing.status === 'accepted') return reply.status(409).send({ message: 'Already friends' });
      }

      db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(senderId, targetId, 'pending');
      try {
        const senderRow = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId) as { username?: string } | undefined;
        const senderUsername = senderRow?.username || null;
        db.prepare('INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)')
          .run(targetId, senderId, 'friend_request', JSON.stringify({ senderId, senderUsername }));
        
        sendNotificationUpdate(targetId);
      } catch (e) { /* non-fatal */ }
      return reply.code(201).send({ message: 'Friend request sent' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to send friend request' });
    }
  });

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

      try {
        const accepterRow = db.prepare('SELECT username FROM users WHERE id = ?').get(targetId) as { username?: string } | undefined;
        const accepterUsername = accepterRow?.username || null;
        db.prepare('INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)')
          .run(requesterId, targetId, 'friend_accept', JSON.stringify({ accepterId: targetId, accepterUsername }));
        
        sendNotificationUpdate(requesterId);
      } catch (e) {
        // non-fatal
      }

      return reply.code(200).send({ message: 'Friend request accepted' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to accept friend request' });
    }
  });

  fastify.delete('/users/:userId/friends/:friendId', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;

    const uid = Number((request.params as any).userId);
    const fid = Number((request.params as any).friendId);

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
 
       try {
        const senderRow = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId) as { username?: string } | undefined;
        const senderUsername = senderRow?.username || null;
        db.prepare('INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)')
          .run(targetId, senderId, 'friend_request', JSON.stringify({ senderId, senderUsername }));
        
        sendNotificationUpdate(targetId);
       } catch (e) { /* ignore */ }

      return reply.code(201).send({ message: 'Friend request sent' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to send friend request' });
    }
  });

  fastify.get('/users/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    const meId = auth.userId;
    const peerId = Number((request.query as any).peer_id);
    if (isNaN(peerId)) return reply.status(400).send({ message: 'peer_id is required' });
    try {
      const rows = db.prepare(`
        SELECT id, sender_id, recipient_id, content, created_at
        FROM messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY created_at ASC
        LIMIT 1000
      `).all(meId, peerId, peerId, meId);
      return reply.code(200).send({ messages: rows });
    } catch (e) {
      request.log.error(e);
      return reply.code(500).send({ message: 'Failed to fetch messages' });
    }
  });

  fastify.post('/users/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    const senderId = auth.userId;
    const recipientId = Number((request.params as any).id);
    const body = (request.body || {}) as any;
    const content = (body.message || '').toString().trim();
    if (!content) return reply.status(400).send({ message: 'Message content is required' });
    try {
      const info = db.prepare('INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)').run(senderId, recipientId, content);
      const created = db.prepare('SELECT id, sender_id, recipient_id, content, created_at FROM messages WHERE id = ?').get(info.lastInsertRowid) as any;
 
      // Send WebSocket notification ONLY to recipient (sender already displayed it in UI)
      try {
        sendDirectMessage(recipientId, { 
          type: 'direct_message', 
          from: senderId, 
          content, 
          created_at: created.created_at, 
          id: created.id 
        });
      } catch (e) { /* ignore delivery errors */ }

      return reply.code(201).send({ message: 'Sent', data: created });
    } catch (e) {
      request.log.error(e);
      return reply.code(500).send({ message: 'Failed to send message' });
    }
  });

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

  fastify.delete('/notifications/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    try {
      const nid = Number((request.params as any).id);
      if (isNaN(nid)) return reply.code(400).send({ message: 'Invalid notification id' });
      const info = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(nid, auth.userId);
      if (info.changes === 0) return reply.code(404).send({ message: 'Notification not found' });
      return reply.code(200).send({ success: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to delete notification' });
    }
  });

  fastify.delete('/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    try {
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(auth.userId);
      return reply.code(200).send({ success: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to clear notifications' });
    }
  });

  fastify.post('/notifications/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    try {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(auth.userId);
      return reply.code(200).send({ success: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to mark notifications as read' });
    }
  });

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

  fastify.post('/users/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    const targetId = Number((request.params as any).id);
    if (auth.userId !== targetId) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    try {
      const body = (request.body || {}) as any;
      const status = (body.status || '').toString();
      const allowed = ['Online', 'Busy', 'Away', 'Offline'];
      if (!allowed.includes(status)) {
        return reply.status(400).send({ message: 'Invalid status' });
      }
      const isOnline = status === 'Offline' ? 0 : 1;
      db.prepare('UPDATE users SET status = ?, is_online = ? WHERE id = ?').run(status, isOnline, targetId);

      broadcastPresenceUpdate(targetId, status, isOnline === 1);

      const updated = db.prepare('SELECT id, username, display_name, avatar_url, is_online, status, last_seen, created_at, updated_at FROM users WHERE id = ?').get(targetId);
      return reply.code(200).send({ user: updated });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to set status' });
    }
  });

  fastify.put('/users/:id/display-name', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    
    const targetId = Number((request.params as any).id);
    if (auth.userId !== targetId) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    try {
      const body = (request.body || {}) as any;
      const newDisplayName = (body.display_name || '').toString().trim();
      
      if (!newDisplayName) {
        return reply.status(400).send({ message: 'Display name cannot be empty' });
      }
      
      if (newDisplayName.length > 50) {
        return reply.status(400).send({ message: 'Display name must be 50 characters or less' });
      }

      // Check if display name is already taken by another user
      const existing = db.prepare('SELECT id FROM users WHERE display_name = ? AND id != ?').get(newDisplayName, targetId) as { id?: number } | undefined;
      if (existing) {
        return reply.status(409).send({ message: 'Display name already taken' });
      }

      db.prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newDisplayName, targetId);

      const updated = db.prepare('SELECT id, username, email, display_name, avatar_url, is_online, status, last_seen, created_at, updated_at FROM users WHERE id = ?').get(targetId);
      
      return reply.code(200).send({ user: updated, message: 'Display name updated successfully' });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to update display name' });
    }
  });

  fastify.post('/users/:id/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    
    const targetId = Number((request.params as any).id);
    if (auth.userId !== targetId) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: 'No file uploaded' });
      }

      // Validate file type - support jpg, jpeg, png, gif, webp
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({ 
          message: 'Invalid file type. Only JPEG, JPG, PNG, GIF, and WebP are allowed' 
        });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
        const currentSize = chunks.reduce((acc, c) => acc + c.length, 0);
        if (currentSize > maxSize) {
          return reply.status(400).send({ message: 'File too large. Maximum size is 5MB' });
        }
      }

      const buffer = Buffer.concat(chunks);

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename with proper extension
      const mimeToExt: {[key: string]: string} = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      const fileExt = mimeToExt[data.mimetype] || 'jpg';
      const filename = `${targetId}_${crypto.randomBytes(8).toString('hex')}.${fileExt}`;
      const filepath = path.join(uploadsDir, filename);

      // Delete old avatar if exists
      const oldUser = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(targetId) as { avatar_url?: string } | undefined;
      if (oldUser?.avatar_url && oldUser.avatar_url !== '/default-avatar.png' && !oldUser.avatar_url.startsWith('http')) {
        const oldFilename = path.basename(oldUser.avatar_url);
        const oldPath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            request.log.warn({ err: e }, 'Failed to delete old avatar');
          }
        }
      }

      // Save new avatar
      fs.writeFileSync(filepath, buffer);

      // Update database with relative path
      const avatarUrl = `/uploads/avatars/${filename}`;
      db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(avatarUrl, targetId);

      const updated = db.prepare('SELECT id, username, email, display_name, avatar_url, is_online, status, last_seen, created_at, updated_at FROM users WHERE id = ?').get(targetId);
      
      return reply.code(200).send({ 
        user: updated, 
        message: 'Avatar updated successfully' 
      });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to update avatar' });
    }
  });

  // Add endpoint to delete avatar
  fastify.delete('/users/:id/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = verifyAuth(request, reply);
    if (!auth) return;
    
    const targetId = Number((request.params as any).id);
    if (auth.userId !== targetId) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    try {
      const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(targetId) as { avatar_url?: string } | undefined;
      
      if (user?.avatar_url && user.avatar_url !== '/default-avatar.png' && !user.avatar_url.startsWith('http')) {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
        const filename = path.basename(user.avatar_url);
        const filepath = path.join(uploadsDir, filename);
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch (e) {
            request.log.warn({ err: e }, 'Failed to delete avatar file');
          }
        }
      }

      db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('/default-avatar.png', targetId);

      const updated = db.prepare('SELECT id, username, email, display_name, avatar_url, is_online, status, last_seen, created_at, updated_at FROM users WHERE id = ?').get(targetId);
      
      return reply.code(200).send({ 
        user: updated, 
        message: 'Avatar deleted successfully' 
      });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ message: 'Failed to delete avatar' });
    }
  });
}
