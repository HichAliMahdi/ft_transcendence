import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';
import { broadcastPresenceUpdate } from './websocket';

interface RegisterBody {
    username: string;
    email: string;
    password: string;
    display_name: string;
}

interface LoginBody {
    username: string;
    password: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
    const formatErr = (e: any) => (e instanceof Error ? e.message : String(e));

    fastify.post<{ Body: RegisterBody }>(
        '/auth/register',
        async (request, reply) => {
            const { username, email, password, display_name } = request.body;

            if (!username || !email || !password || !display_name) {
                return reply.status(400).send({ message: 'All fields are required' });
            }

            if (password.length < 8) {
                return reply.status(400).send({ message: 'Password must be at least 8 characters long' });
            }

            const passwordPolicy = /(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\\\/\[\];'`~_\-+=])/;
            if (!passwordPolicy.test(password)) {
                return reply.status(400).send({ message: 'Password must contain at least one uppercase letter, one number and one special character' });
            }

            try {
                const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ? OR display_name = ?').get(username, email, display_name);
                if (existingUser) {
                    return reply.status(409).send({ message: 'Username, email, or display name already in use' });
                }

                const password_hash = await bcrypt.hash(password, 10);
                // mark new user as online immediately and set status = 'Online'
                const result = db.prepare(
                    'INSERT INTO users (username, email, password_hash, display_name, is_online, status, avatar_url) VALUES (?, ?, ?, ?, 1, ?, ?)'
                ).run(username, email, password_hash, display_name, 'Online', '/default-avatar.png');

                const token = jwt.sign({ userId: result.lastInsertRowid }, config.jwt.secret as string, { expiresIn: '7d' });
                reply.code(201).send({
                    message: 'User registered successfully',
                    token,
                    user: { id: result.lastInsertRowid, username, email, display_name, status: 'Online', is_online: 1, avatar_url: '/default-avatar.png' }
                });
            } catch (error) {
                fastify.log.error(error);
                reply.code(500).send({ message: formatErr(error) });
            }
        }
    );

    fastify.post<{ Body: LoginBody }>(
        '/auth/login',
        async (request, reply) => {
            const { username, password } = request.body;

            if (!username || !password) {
                return reply.status(400).send({ message: 'Username and password are required' });
            }

            try {
                const user = db.prepare('SELECT id, username, email, display_name, password_hash, twofa_enabled FROM users WHERE username = ?').get(username) as any;
                if (!user) {
                    return reply.status(401).send({ message: 'Invalid username or password' });
                }

                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                if (!passwordMatch) {
                    return reply.status(401).send({ message: 'Invalid username or password' });
                }

                if (user.twofa_enabled) {
                    const tempToken = jwt.sign(
                        { userId: user.id, stage: '2fa' },
                        config.jwt.secret as string,
                        { expiresIn: '5m', issuer: 'ft_transcendence_2fa' }
                    );
                    return reply.send({
                        requires2FA: true,
                        tempToken
                    });
                }
                const token = jwt.sign(
                    { userId: user.id },
                    config.jwt.secret as string,
                    { expiresIn: '7d', issuer: 'ft_transcendence' }
                );
                // mark user online and status Online
                db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run('Online', user.id);
                reply.code(200).send({
                    message: 'Login successful',
                    token,
                    user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, status: 'Online', is_online: 1 }
                });
            } catch (error) {
                fastify.log.error(error);
                reply.code(500).send({ message: formatErr(error) });
            }
        }
    );

    fastify.post('/auth/logout', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ message: 'Authorization header missing' });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return reply.status(401).send({ message: 'Token missing' });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
            const userId = decoded.userId;

            db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run('Offline', userId);

            // Broadcast offline status to all connected clients
            try {
                broadcastPresenceUpdate(userId, 'Offline', false);
            } catch (e) {
                fastify.log.debug({ err: e }, 'Failed to broadcast logout presence');
            }

            reply.code(200).send({ message: 'Logout successful' });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });

    fastify.get('/auth/me', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ message: 'Authorization header missing' });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return reply.status(401).send({ message: 'Token missing' });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
            const userId = decoded.userId;

            const user = db.prepare('SELECT id, username, email, display_name, avatar_url, is_online, status, last_seen, created_at, updated_at FROM users WHERE id = ?').get(userId);
            if (!user) {
                return reply.status(404).send({ message: 'User not found' });
            }

            reply.code(200).send({ user });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });

    fastify.post('/auth/change-password', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) return reply.status(401).send({ message: 'Unauthorized' });
            const token = authHeader.split(' ')[1];
            if (!token) return reply.status(401).send({ message: 'Token missing' });

            const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
            const { currentPassword, newPassword } = request.body as any;

            if (!currentPassword || !newPassword) return reply.status(400).send({ message: 'All fields required' });
            if (newPassword.length < 8) return reply.status(400).send({ message: 'Password must be 8+ characters' });

            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;
            if (!user) return reply.status(404).send({ message: 'User not found' });

            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) return reply.status(401).send({ message: 'Current password incorrect' });

            const hash = await bcrypt.hash(newPassword, 10);
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, decoded.userId);
            reply.send({ message: 'Password changed successfully' });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });
    fastify.post('/auth/2fa/setup', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) return reply.status(401).send({ message: 'Unauthorized' });

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

            const user = db.prepare('SELECT twofa_enabled FROM users WHERE id = ?')
                .get(decoded.userId) as any;

            if (user.twofa_enabled)
                return reply.status(400).send({ message: '2FA already enabled' });

            const secret = authenticator.generateSecret();

            db.prepare('UPDATE users SET twofa_temp_secret = ? WHERE id = ?')
                .run(secret, decoded.userId);

            const otpauth = authenticator.keyuri(
                decoded.userId.toString(),
                'FT_TRANSCENDENCE',
                secret
            );

            const qrCode = await QRCode.toDataURL(otpauth);

            reply.send({
                message: 'Scan QR code with authenticator app',
                qrCode
            });

        } catch (error) {
            reply.status(500).send({ message: '2FA setup failed' });
        }
    });
    fastify.post('/auth/2fa/verify', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) return reply.status(401).send({ message: 'Unauthorized' });

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

            const { code } = request.body as any;
            if (!code) return reply.status(400).send({ message: 'Code required' });

            const user = db.prepare('SELECT twofa_temp_secret FROM users WHERE id = ?')
                .get(decoded.userId) as any;

            if (!user?.twofa_temp_secret)
                return reply.status(400).send({ message: '2FA not initialized' });

            const isValid = authenticator.verify({
                token: code,
                secret: user.twofa_temp_secret
            });

            if (!isValid)
                return reply.status(400).send({ message: 'Invalid code' });

            // Move temp secret to permanent
            db.prepare(`
            UPDATE users 
            SET twofa_secret = ?, 
                twofa_temp_secret = NULL, 
                twofa_enabled = 1
            WHERE id = ?
        `).run(user.twofa_temp_secret, decoded.userId);

            reply.send({ message: '2FA enabled successfully' });

        } catch (error) {
            reply.status(500).send({ message: 'Verification failed' });
        }
    });
    fastify.post('/auth/2fa/disable', async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader) return reply.status(401).send({ message: 'Unauthorized' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

        db.prepare(`
        UPDATE users 
        SET twofa_enabled = 0, 
            twofa_secret = NULL 
        WHERE id = ?
    `).run(decoded.userId);

        reply.send({ message: '2FA disabled' });
    });
    fastify.post('/auth/2fa/login', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) return reply.status(401).send({ message: 'Unauthorized' });
            const tempToken = authHeader.split(' ')[1];

            if (!tempToken) {
                return reply.status(401).send({ message: 'Unauthorized' });
            }

            const decoded = jwt.verify(
                tempToken,
                config.jwt.secret as string
            ) as unknown as { userId: number; stage?: string };

            if (decoded.stage !== '2fa')
                return reply.status(400).send({ message: 'Invalid 2FA stage token' });
            const { code } = request.body as any;
            const userId = decoded.userId;
            if (!code) return reply.status(400).send({ message: 'Missing 2FA code' });
            if (!userId || !code)
                return reply.status(400).send({ message: 'Missing data' });

            const user = db.prepare('SELECT * FROM users WHERE id = ?')
                .get(userId) as any;

            if (!user || !user.twofa_enabled)
                return reply.status(400).send({ message: 'Invalid request' });

            const valid = authenticator.verify({
                token: code,
                secret: user.twofa_secret
            });

            if (!valid)
                return reply.status(401).send({ message: 'Invalid 2FA code' });

                        // mark user online and status Online
            db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run('Online', user.id);
            const token = jwt.sign(
                { userId: user.id },
                config.jwt.secret as string,
                { expiresIn: '7d', issuer: 'ft_transcendence' }
            );
            reply.code(200).send({
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, status: 'Online', is_online: 1 }
            });

        } catch (error) {
            reply.status(500).send({ message: '2FA login failed' });
        }
    });
}
