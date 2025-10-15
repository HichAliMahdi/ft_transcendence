import { db } from '../database/db';

export interface Tournament {
    id: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    winner_id?: number;
    created_at: string;
}

export class TournamentModel {
    static create(name: string) : Tournament {
        const stmt = db.prepare(`
            INSERT INTO tournaments (name, status)
            VALUES (?, 'pending')
        `);
        const result = stmt.run(name);
        return this.findById(result.lastInsertRowid as number);
    }
    static findById(id: number): Tournament {
        const stmt = db.prepare(`SELECT * FROM tournaments WHERE id = ?`);
        return stmt.get(id) as Tournament;
    }
    static findAll() : Tournament[] {
        const stmt = db.prepare(`SELECT * FROM tournaments ORDER BY created_at DESC`);
        return stmt.all() as Tournament[];
    }
    static updateStatus(id: number, status: 'pending' | 'active' | 'completed') : Tournament {
        const stmt = db.prepare(`UPDATE tournaments SET status = ? WHERE id = ?`);
        stmt.run(status, id);
        return this.findById(id);
    }
}

