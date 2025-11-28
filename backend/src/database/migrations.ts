import { db } from './db';

interface Migration {
    version: number;
    name: string;
    up: () => void;
}

interface ColumnInfo {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
}

const migrations: Migration[] = [
    {
        version: 1,
        name: 'add_status_column_to_users',
        up: () => {
            // Check if status column exists
            const columns = db.pragma("table_info('users')") as ColumnInfo[];
            const hasStatus = columns.some((col) => col.name === 'status');
            
            if (!hasStatus) {
                db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'Offline'`);
                console.log('✓ Migration 1: Added status column to users table');
            } else {
                console.log('✓ Migration 1: Status column already exists');
            }
        }
    },
    {
        version: 2,
        name: 'ensure_is_online_column',
        up: () => {
            const columns = db.pragma("table_info('users')") as ColumnInfo[];
            const hasIsOnline = columns.some((col) => col.name === 'is_online');
            
            if (!hasIsOnline) {
                db.exec(`ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0`);
                console.log('✓ Migration 2: Added is_online column to users table');
            } else {
                console.log('✓ Migration 2: is_online column already exists');
            }
        }
    }
];

function getCurrentVersion(): number {
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
        return result.version ?? 0;
    } catch (error) {
        console.error('Error getting current version:', error);
        return 0;
    }
}

function setVersion(version: number, name: string): void {
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(version, name);
}

export function runMigrations(): void {
    const currentVersion = getCurrentVersion();
    console.log(`Current database version: ${currentVersion}`);
    
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
    }
    
    console.log(`Running ${pendingMigrations.length} pending migration(s)...`);
    
    for (const migration of pendingMigrations) {
        try {
            migration.up();
            setVersion(migration.version, migration.name);
            console.log(`✓ Applied migration ${migration.version}: ${migration.name}`);
        } catch (error) {
            console.error(`✗ Failed to apply migration ${migration.version}: ${migration.name}`, error);
            throw error;
        }
    }
    
    console.log('All migrations completed successfully');
}
