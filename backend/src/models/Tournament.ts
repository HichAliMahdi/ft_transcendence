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
        const stmt = db.prepare(
            //TODOhttps://elearning.intra.42.fr/
        );
    }
    static findById(id: number): Tournament {
        //TODO
    }
    static findAll() : Tournament[] {
        //TODO
    }
    static updateStatus(id: number, status: 'pending' | 'active' | 'completed') : Tournament {
        //TODO
    }
}

