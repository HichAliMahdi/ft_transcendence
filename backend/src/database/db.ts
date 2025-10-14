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
        CREATE TABLE IF NOT EXISTS tournament (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT null,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            winner_id INTEGER,
            FOREIGN KEY (winner_id) REFERENCES users (id)
        )
    );

    db.exec (
        CREATE TABLE IF NOT EXISTS tournament_participants (
            tournament_id INTEGER,
            user_id INTEGER,
            alias TEXT NOT null,
            PRIMARY KEY (tournament_id, user_id),
            FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    );