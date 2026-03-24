import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';
import { broadcastPresenceUpdate } from './websocket';
import crypto from 'crypto';

function generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(6).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

function hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

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

interface BackupCode {
    id: number;
    user_id: number;
    code_hash: string;
    used: number;
}

export default async function authRoutes(fastify: FastifyInstance) {
    const formatErr = (e: any) => (e instanceof Error ? e.message : String(e));

    fastify.post<{ Body: RegisterBody }>(
        '/auth/register', {config: { rateLimit: { max: 5, timeWindow: '1 hour' } },},
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

                const token = jwt.sign({ userId: result.lastInsertRowid }, config.jwt.secret as string, { expiresIn: '7d', issuer: 'ft_transcendence' });
                reply.setCookie('auth_token', token, {
                    httpOnly: true,      // JS cannot read it
                    secure: true,       // true in production HTTPS
                    sameSite: 'strict',     // CSRF protection
                    path: '/',           // must match frontend requests
                    maxAge: 7 * 24 * 60 * 60 // 7 days
                });

                reply.code(201).send({
                    message: 'User registered successfully',
                    user: { id: result.lastInsertRowid, username, email, display_name, status: 'Online', is_online: 1, avatar_url: '/default-avatar.png', twofa_enabled: 0 }
                });
            } catch (error) {
                fastify.log.error(error);
                reply.code(500).send({ message: formatErr(error) });
            }
        }
    );

    fastify.post<{ Body: LoginBody }>(
        '/auth/login', {config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }},
        async (request, reply) => {
            const { username, password } = request.body;

            if (!username || !password) {
                return reply.status(400).send({ message: 'Username and password are required' });
            }

            try {
                const user = db.prepare('SELECT id, username, email, display_name, password_hash, twofa_enabled, login_attempts, login_locked_until FROM users WHERE username = ?').get(username) as any;
                if (!user) {
                    return reply.status(404).send({ message: 'Invalid username or password' });
                }
                const now = new Date();
                if (user.login_locked_until && new Date(user.login_locked_until) > now) {
                    return reply.status(403).send({message: 'Account temporarily locked. Try again later.'});
                }
                const passwordMatch = await bcrypt.compare(password, user.password_hash);

                const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS) || 5;
                const LOCK_TIME_MINUTES = Number(process.env.LOCK_TIME_MINUTES) || 15;

                if (!passwordMatch) {
                    const attempts = (user.login_attempts || 0) + 1;

                    if (attempts >= MAX_ATTEMPTS) {
                        const lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);

                        db.prepare(`UPDATE users SET login_attempts = ?, login_locked_until = ? WHERE id = ?`).run(attempts, lockUntil.toISOString(), user.id);
                        return reply.status(403).send({message: `Too many attempts. Account Locked for ${LOCK_TIME_MINUTES} minutes.`});
                    } else {
                        db.prepare(`UPDATE users SET login_attempts = ? WHERE id = ?`).run(attempts, user.id);
                        return reply.status(404).send({ message: 'Invalid username or password'});
                    }
                }

                    // reply.setCookie('XSRF-TOKEN', reply.generateCsrf(), {
                    //     httpOnly: false,     // JS can read this
                    //     sameSite: 'strict',  // prevent cross-site usage
                    //     path: '/'             // available for entire SPA
                    // });
                    
                if (user.twofa_enabled) {
                    const tempToken = jwt.sign(
                        { userId: user.id, stage: '2fa' },
                        config.jwt.secret as string,
                        { expiresIn: '5m', issuer: 'ft_transcendence_2fa' }
                    );
                    reply.setCookie('tmp_token', tempToken, {
                        httpOnly: true,      // JS cannot read it
                        secure: true,       // true in production HTTPS
                        sameSite: 'strict',     // CSRF protection
                        path: '/',           // must match frontend requests
                        maxAge:300 // 5 minutes
                    });
                    return reply.send({
                        requires2FA: true,
                        // tempToken
                    });
                }
                const token = jwt.sign(
                    { userId: user.id },
                    config.jwt.secret as string,
                    { expiresIn: '7d', issuer: 'ft_transcendence' }
                );
                // mark user online and status Online
                db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP, login_attempts = 0, login_locked_until = NULL, status = ? WHERE id = ?').run('Online', user.id);
                reply.setCookie('auth_token', token, {
                    httpOnly: true,      // JS cannot read it
                    secure: true,       // true in production HTTPS
                    sameSite: 'strict',     // CSRF protection
                    path: '/',           // must match frontend requests
                    maxAge: 7 * 24 * 60 * 60 // 7 days
                });
                reply.code(200).send({
                    message: 'Login successful',
                    user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, status: 'Online', is_online: 1, twofa_enabled: user.twofa_enabled }
                });
            } catch (error) {
                fastify.log.error(error);
                reply.code(500).send({ message: formatErr(error) });
            }
        }
    );

    fastify.post('/auth/logout', async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (token) {
                try {
                    const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
                    const userId = decoded.userId;

                    db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run('Offline', userId);
                    // Broadcast offline status to all connected clients
                    broadcastPresenceUpdate(userId, 'Offline', false);
                } catch (e) {
                    fastify.log.debug({ err: e }, 'Failed to broadcast logout presence');
                }
            }
            reply.clearCookie('auth_token', { path: '/' });
            reply.code(200).send({ message: 'Logout successful' });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });

    fastify.post('/auth/delete', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) {
                return reply.status(401).send({ message: 'Token missing' });
            }

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const userId = decoded.userId;
            reply.clearCookie('auth_token', { path: '/' });
            db.prepare('DELETE FROM backup_codes WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);

            // Broadcast offline status to all connected clients
            try {
                broadcastPresenceUpdate(userId, 'Offline', false);
            } catch (e) {
                fastify.log.debug({ err: e }, 'Failed to broadcast Offline presence');
            }

            reply.code(200).send({ message: 'Deleted successful' });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });


    fastify.get('/auth/me', async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) {
                return reply.status(401).send({ message: 'Token missing' });
            }

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const userId = decoded.userId;

            const user = db.prepare('SELECT id, username, email, display_name, avatar_url, is_online, status, last_seen, twofa_enabled, created_at, updated_at FROM users WHERE id = ?').get(userId);
            if (!user) {
                return reply.status(401).send({ message: 'User not found' });
            }
            // reply.setCookie('XSRF-TOKEN', reply.generateCsrf(), {
            //     httpOnly: false,     // JS can read this
            //     sameSite: 'strict',  // prevent cross-site usage
            //     path: '/'             // available for entire SPA
            // });
            reply.code(200).send({ user });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });

    fastify.post('/auth/change-password', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) return reply.status(401).send({ message: 'Token missing' });

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const { currentPassword, newPassword } = request.body as any;

            if (!currentPassword || !newPassword) return reply.status(400).send({ message: 'All fields required' });
            if (newPassword.length < 8) return reply.status(400).send({ message: 'Password must be 8+ characters' });

            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;
            if (!user) return reply.status(401).send({ message: 'User not found' });

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
    fastify.post('/auth/2fa/setup', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) return reply.status(401).send({ message: 'Token missing' });

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const userId = decoded.userId;

            // Fetch user from DB
            const user = db.prepare('SELECT twofa_enabled FROM users WHERE id = ?').get(userId) as any;
            if (!user) {
                return reply.status(401).send({ message: 'User not found' });
            }

            if (user.twofa_enabled) {
                return reply.status(400).send({ message: '2FA already enabled' });
            }

            // Generate temporary secret
            const secret = authenticator.generateSecret();

            db.prepare('UPDATE users SET twofa_temp_secret = ? WHERE id = ?').run(secret, userId);

            // Generate QR code for authenticator app
            const otpauth = authenticator.keyuri(decoded.userId.toString(), 'FT_TRANSCENDENCE', secret);
            const qrCode = await QRCode.toDataURL(otpauth);

            reply.send({
                message: 'Scan QR code with authenticator app',
                qrCode
            });

        } catch (error) {
            reply.status(500).send({ message: '2FA setup failed', details: String(error) });
        }
    });
    fastify.post('/auth/2fa/verify', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) return reply.status(401).send({ message: 'Token missing' });

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const userId = decoded.userId;

            const { code } = request.body as any;
            if (!code) return reply.status(400).send({ message: 'Code required' });

            const user = db.prepare('SELECT twofa_temp_secret FROM users WHERE id = ?').get(userId) as any;
            if (!user?.twofa_temp_secret) return reply.status(400).send({ message: '2FA not initialized' });

            const isValid = authenticator.verify({
                token: code,
                secret: user.twofa_temp_secret
            });

            if (!isValid) return reply.status(400).send({ message: 'Invalid code' });

            // Move temp secret to permanent
            db.prepare(`
            UPDATE users 
            SET twofa_secret = ?, 
                twofa_temp_secret = NULL, 
                twofa_enabled = 1
            WHERE id = ?
        `).run(user.twofa_temp_secret, userId);
            const codes = generateBackupCodes();
            const insert = db.prepare(`
                INSERT INTO backup_codes (user_id, code_hash)
                VALUES (?, ?)
            `);
            for (const code of codes) {
                insert.run(userId, hashCode(code));
            }
            reply.send({ message: '2FA enabled successfully', backupCodes: codes });
        } catch (error) {
            reply.status(500).send({ message: 'Verification failed' });
        }
    });
    fastify.post('/auth/2fa/backup/regenerate', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) return reply.status(401).send({ message: 'Token missing' });

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const userId = decoded.userId;

            // delete old codes
            db.prepare('DELETE FROM backup_codes WHERE user_id = ?').run(userId);

            const codes = generateBackupCodes();

            for (const code of codes) {
                db.prepare(`INSERT INTO backup_codes (user_id, code_hash) VALUES (?, ?)`).run(userId, hashCode(code));
            }

            reply.send({ message: '2FA regenerate backup codes successfully', backupCodes: codes });

        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: formatErr(error) });
        }
    });
    fastify.post('/auth/2fa/disable', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const token = request.cookies?.auth_token;
            if (!token) return reply.status(401).send({ message: 'Token missing' });

            const decoded = jwt.verify(token, config.jwt.secret, {issuer: 'ft_transcendence'}) as { userId: number };
            const userId = decoded.userId;

            // Disable 2FA
            db.prepare(`
            UPDATE users 
            SET twofa_enabled = 0, 
                twofa_secret = NULL 
            WHERE id = ?
        `).run(userId);
            const removeCode = db.prepare(`
                DELETE FROM backup_codes WHERE user_id = ?
            `);
            removeCode.run(userId);
            reply.send({ message: '2FA disabled' });
        } catch (error) {
            reply.status(500).send({ message: 'Failed to disable 2FA' });
        }
    });
    fastify.post('/auth/2fa/login', {preHandler: fastify.csrfProtection}, async (request, reply) => {
        try {
            const tempToken = request.cookies?.tmp_token;

            if (!tempToken) {
                return reply.status(401).send({ message: 'Unauthorized' });
            }

            const decoded = jwt.verify(
                tempToken,
                config.jwt.secret as string, {issuer: 'ft_transcendence_2fa'}
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

            if (!valid) {
                const hashed = hashCode(code);
                const backup = db.prepare(`
                    SELECT * FROM backup_codes
                    WHERE user_id = ? AND code_hash = ? AND used = 0
                `).get(userId, hashed) as BackupCode | undefined;
                if (!backup)
                {
                    const now = new Date();
                    const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS) || 5;
                    const LOCK_TIME_MINUTES = Number(process.env.LOCK_TIME_MINUTES) || 15;
                    if (user.login_locked_until && new Date(user.login_locked_until) > now) {
                        return reply.status(401).send({ message: 'Account temporarily locked. Try again later.'});
                    }

                    const attempts = (user.login_attempts || 0) + 1;

                    if (attempts >= MAX_ATTEMPTS) {
                        const lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);

                        db.prepare(`UPDATE users SET login_attempts = ?, login_locked_until = ? WHERE id = ?`).run(attempts, lockUntil.toISOString(), user.id);
                        return reply.status(401).send({ message: `Too many attempts. Account Locked for ${LOCK_TIME_MINUTES} minutes.`});
                    } else {
                        db.prepare(`UPDATE users SET login_attempts = ? WHERE id = ?`).run(attempts, user.id);
                        return reply.status(401).send({ message: 'Invalid 2FA code' });
                    }
                }
                db.prepare(`UPDATE backup_codes SET used = 1 WHERE id = ?`).run(backup.id);
            }

            // mark user online and status Online
            db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP, login_attempts = 0, login_locked_until = NULL, status = ? WHERE id = ?').run('Online', user.id);
            const token = jwt.sign(
                { userId: user.id },
                config.jwt.secret as string,
                { expiresIn: '7d', issuer: 'ft_transcendence' }
            );
            reply.clearCookie('tmp_token', { path: '/' });
            reply.setCookie('auth_token', token, {
                    httpOnly: true,      // JS cannot read it
                    secure: true,       // true in production HTTPS
                    sameSite: 'strict',     // CSRF protection
                    path: '/',           // must match frontend requests
                    maxAge: 7 * 24 * 60 * 60 // 7 days
            });
            reply.code(200).send({
                message: 'Login successful',
                user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, status: 'Online', is_online: 1, twofa_enabled: user.twofa_enabled }
            });

        } catch (error) {
            reply.status(500).send({ message: '2FA login failed' });
        }
    });
}
