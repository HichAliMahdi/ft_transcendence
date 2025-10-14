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
    }
}