/**
 * SQLite database schema for Memory Canvas emotional history storage
 */

import Database from 'better-sqlite3';
import * as path from 'path';

/**
 * Database schema version for migration support
 */
export const SCHEMA_VERSION = 1;

/**
 * Database configuration
 */
export interface DatabaseConfig {
    /** Path to the database file */
    dbPath: string;
    
    /** Whether to enable WAL mode for better concurrency */
    enableWAL?: boolean;
    
    /** Whether to enable foreign keys */
    enableForeignKeys?: boolean;
    
    /** Timeout for database operations in milliseconds */
    timeout?: number;
}

/**
 * Initialize the database schema
 */
export function initializeSchema(db: Database): void {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create schema version table
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Create emotional sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS emotional_sessions (
            session_id TEXT PRIMARY KEY,
            start_time TEXT NOT NULL,
            end_time TEXT,
            dominant_emotion TEXT NOT NULL,
            average_intensity REAL NOT NULL,
            transition_count INTEGER NOT NULL DEFAULT 0,
            action_count INTEGER NOT NULL DEFAULT 0,
            typing_time INTEGER NOT NULL DEFAULT 0,
            idle_time INTEGER NOT NULL DEFAULT 0,
            error_count INTEGER NOT NULL DEFAULT 0,
            success_count INTEGER NOT NULL DEFAULT 0,
            files_edited TEXT,
            metadata TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Create emotional vectors table
    db.exec(`
        CREATE TABLE IF NOT EXISTS emotional_vectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            calm REAL NOT NULL CHECK(calm >= 0 AND calm <= 1),
            tense REAL NOT NULL CHECK(tense >= 0 AND tense <= 1),
            curious REAL NOT NULL CHECK(curious >= 0 AND curious <= 1),
            excited REAL NOT NULL CHECK(excited >= 0 AND excited <= 1),
            frustrated REAL NOT NULL CHECK(frustrated >= 0 AND frustrated <= 1),
            confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES emotional_sessions(session_id) ON DELETE CASCADE
        );
    `);
    
    // Create emotional states table
    db.exec(`
        CREATE TABLE IF NOT EXISTS emotional_states (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            primary_emotion TEXT NOT NULL,
            secondary_emotion TEXT,
            intensity REAL NOT NULL CHECK(intensity >= 0 AND intensity <= 1),
            stability REAL NOT NULL CHECK(stability >= 0 AND stability <= 1),
            trend TEXT NOT NULL CHECK(trend IN ('rising', 'falling', 'stable')),
            confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
            duration INTEGER NOT NULL,
            vector_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES emotional_sessions(session_id) ON DELETE CASCADE,
            FOREIGN KEY (vector_id) REFERENCES emotional_vectors(id) ON DELETE CASCADE
        );
    `);
    
    // Create emotional trends table
    db.exec(`
        CREATE TABLE IF NOT EXISTS emotional_trends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            emotion_type TEXT NOT NULL,
            average_intensity REAL NOT NULL,
            stability REAL NOT NULL,
            duration INTEGER NOT NULL,
            occurrence_count INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES emotional_sessions(session_id) ON DELETE CASCADE
        );
    `);
    
    // Create user actions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            action_id TEXT NOT NULL UNIQUE,
            action_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration INTEGER,
            success INTEGER NOT NULL DEFAULT 1,
            error_message TEXT,
            file_type TEXT,
            language TEXT,
            line_number INTEGER,
            typing_speed REAL,
            error_count INTEGER,
            metadata TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES emotional_sessions(session_id) ON DELETE CASCADE
        );
    `);
    
    // Create indexes for better query performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emotional_vectors_session 
        ON emotional_vectors(session_id, timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_emotional_states_session 
        ON emotional_states(session_id, timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_emotional_trends_session 
        ON emotional_trends(session_id, start_time, end_time);
        
        CREATE INDEX IF NOT EXISTS idx_user_actions_session 
        ON user_actions(session_id, timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_user_actions_type 
        ON user_actions(action_type, timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_sessions_time 
        ON emotional_sessions(start_time, end_time);
    `);
    
    // Insert or update schema version
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO schema_version (version, applied_at) 
        VALUES (?, datetime('now'))
    `);
    stmt.run(SCHEMA_VERSION);
}

/**
 * Get current schema version from database
 */
export function getSchemaVersion(db: Database): number {
    try {
        const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
        return row?.version ?? 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Migrate database schema to a new version
 */
export function migrateSchema(db: Database, fromVersion: number, toVersion: number): void {
    if (fromVersion === toVersion) {
        return;
    }
    
    // Future migrations will be added here
    // Example:
    // if (fromVersion < 2 && toVersion >= 2) {
    //     // Apply migration from version 1 to 2
    //     db.exec('ALTER TABLE ...');
    // }
    
    // Update schema version
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO schema_version (version, applied_at) 
        VALUES (?, datetime('now'))
    `);
    stmt.run(toVersion);
}

/**
 * Create database connection with proper configuration
 */
export function createDatabase(config: DatabaseConfig): Database {
    const db = new Database(config.dbPath, {
        timeout: config.timeout ?? 5000,
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });
    
    // Enable WAL mode for better concurrency
    if (config.enableWAL !== false) {
        db.pragma('journal_mode = WAL');
    }
    
    // Enable foreign keys
    if (config.enableForeignKeys !== false) {
        db.pragma('foreign_keys = ON');
    }
    
    // Check and apply schema
    const currentVersion = getSchemaVersion(db);
    if (currentVersion === 0) {
        initializeSchema(db);
    } else if (currentVersion < SCHEMA_VERSION) {
        migrateSchema(db, currentVersion, SCHEMA_VERSION);
    }
    
    return db;
}

/**
 * Close database connection safely
 */
export function closeDatabase(db: Database): void {
    try {
        db.close();
    } catch (error) {
        console.error('Error closing database:', error);
    }
}
