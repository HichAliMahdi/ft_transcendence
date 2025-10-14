import Database from 'better-sqlite3';
import { config } from '../config';

export const db = new Database(config.database.path);

export function initializeDatabase(): void {
    db.exec(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULLm
            email TEXT UNIQUE,
            password_has TEXT,
            avatar_url TEXT DEFAULT '/default-avatar.png',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    );

    db.exec(
        
    )