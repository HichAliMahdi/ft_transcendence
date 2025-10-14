import { db } from '../database/db';

export interface Tournament {
    id: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    winner_id?: number;
    created_at: string;
}