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