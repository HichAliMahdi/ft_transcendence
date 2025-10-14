import { db } from '../database/db';

export interface User {
    id: number;
    username: string;
    email?: string;
    password_hash?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
}

export class UserModel {
    static create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
        const stmt = db.prepare(
            INSERT INTO users (username, email, password_hash, avatar_url)
            VALUES (?, ?, ?, ?)
        );
        const result = stmt.run (
            user.username,
            user.email,
            user.password_hash,
            user.avatar_url
        );
        return this.findById(result.lastInsertRowid as number);
    }

    static findById(id: number) : User {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id) as User;
    }

    static findByUsername(username: string): User | null {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        return (stmt.get(username) as User) || null;
    }

    static findAll() : User[] {
        const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
        return stmt.all() as User[];
    }
}