import Database from 'better-sqlite3';
import { config } from '../config';

export const db = new Database(config.database.path);

export function initializeDatabase(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT,
            display_name TEXT NOT NULL DEFAULT '',
            avatar_url TEXT DEFAULT '/default-avatar.png',
            is_online INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Offline',
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, friend_id)
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player1_id INTEGER NOT NULL,
            player2_id INTEGER NOT NULL,
            player1_score INTEGER NOT NULL,
            player2_score INTEGER NOT NULL,
            winner_id INTEGER,
            duration INTEGER,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            max_players INTEGER NOT NULL,
            current_round INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            winner_id INTEGER,
            FOREIGN KEY (winner_id) REFERENCES users (id)
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS tournament_participants (
            tournament_id INTEGER,
            user_id INTEGER,
            alias TEXT NOT NULL,
            PRIMARY KEY (tournament_id, user_id),
            FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER,
            player1_id INTEGER,
            player2_id INTEGER,
            player1_score INTEGER DEFAULT 0,
            player2_score INTEGER DEFAULT 0,
            winner_id INTEGER,
            game_type TEXT DEFAULT 'pong',
            status TEXT DEFAULT 'pending',
            round INTEGER DEFAULT 1,
            match_number INTEGER DEFAULT 1,
            source_match_id_1 INTEGER,
            source_match_id_2 INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
            FOREIGN KEY (player1_id) REFERENCES users (id),
            FOREIGN KEY (player2_id) REFERENCES users (id),
            FOREIGN KEY (winner_id) REFERENCES users (id),
            FOREIGN KEY (source_match_id_1) REFERENCES games (id),
            FOREIGN KEY (source_match_id_2) REFERENCES games (id)
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            actor_id INTEGER,
            type TEXT NOT NULL,
            payload TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // ========================================
    // ADD THIS SECTION TO CREATE user_stats VIEW
    // ========================================
    
    // Drop existing view if it exists
    db.exec(`DROP VIEW IF EXISTS user_stats`);

    // Create user_stats view for statistics
    db.exec(`
        CREATE VIEW user_stats AS
        SELECT 
            u.id AS user_id,
            COUNT(DISTINCT CASE 
                WHEN m.player1_id = u.id OR m.player2_id = u.id 
                THEN m.id 
            END) AS games_played,
            COUNT(DISTINCT CASE 
                WHEN m.winner_id = u.id 
                THEN m.id 
            END) AS matches_won,
            COUNT(DISTINCT CASE 
                WHEN (m.player1_id = u.id OR m.player2_id = u.id) 
                AND m.winner_id IS NOT NULL 
                AND m.winner_id != u.id 
                THEN m.id 
            END) AS matches_lost,
            COUNT(DISTINCT tp.tournament_id) AS tournaments_joined,
            COUNT(DISTINCT CASE 
                WHEN t.winner_id = u.id 
                THEN t.id 
            END) AS tournaments_won
        FROM users u
        LEFT JOIN matches m ON m.player1_id = u.id OR m.player2_id = u.id
        LEFT JOIN tournament_participants tp ON tp.user_id = u.id
        LEFT JOIN tournaments t ON t.id = tp.tournament_id
        GROUP BY u.id
    `);
    
}