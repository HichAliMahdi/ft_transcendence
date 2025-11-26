import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { config } from '../config';

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
                const result = db.prepare(
                    'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
                ).run(username, email, password_hash, display_name);

                const token = jwt.sign(
                    { userId: result.lastInsertRowid }, 
                    config.jwt.secret,
                    { expiresIn: '7d' }
                );
                reply.code(201).send({
                    message: 'User registered successfully',
                    token,
                    user: { id: result.lastInsertRowid, username, email, display_name }
                });
            } catch (error) {
                fastify.log.error(error);
                reply.code(500).send({ message: 'Internal Server Error' });
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
                const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
                if (!user) {
                    return reply.status(401).send({ message: 'Invalid username or password' });
                }

                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                if (!passwordMatch) {
                    return reply.status(401).send({ message: 'Invalid username or password' });
                }

                db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
                
                const token = jwt.sign(
                    { userId: user.id }, 
                    config.jwt.secret,
                    { expiresIn: '7d' }
                );
                reply.code(200).send({
                    message: 'Login successful',
                    token,
                    user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name }
                });
            } catch (error) {
                fastify.log.error(error);
                reply.code(500).send({ message: 'Internal Server Error' });
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

            db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(userId);

            reply.code(200).send({ message: 'Logout successful' });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: 'Internal Server Error' });
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

            const user = db.prepare('SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at, updated_at FROM users WHERE id = ?').get(userId);
            if (!user) {
                return reply.status(404).send({ message: 'User not found' });
            }

            reply.code(200).send({ user });
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ message: 'Internal Server Error' });
        }
    });
}
