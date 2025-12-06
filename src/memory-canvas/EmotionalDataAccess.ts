/**
 * Data access layer for emotional history storage
 * Provides CRUD operations for emotional sessions, vectors, states, and trends
 */

import Database from 'better-sqlite3';
import { EmotionalVector, EmotionalState, EmotionalHistory, EmotionType, EmotionalTrend } from '../models/EmotionalModels';
import { UserAction, SessionInfo } from '../models/SystemModels';

/**
 * Stored emotional session data
 */
export interface StoredEmotionalSession {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    dominantEmotion: EmotionType;
    averageIntensity: number;
    transitionCount: number;
    actionCount: number;
    typingTime: number;
    idleTime: number;
    errorCount: number;
    successCount: number;
    filesEdited: string[];
    metadata?: Record<string, any>;
}

/**
 * Query options for retrieving emotional data
 */
export interface QueryOptions {
    limit?: number;
    offset?: number;
    startTime?: Date;
    endTime?: Date;
    sessionId?: string;
    emotionType?: EmotionType;
}

/**
 * Data access layer for emotional history
 */
export class EmotionalDataAccess {
    constructor(private db: Database) {}
    
    // ==================== Session Operations ====================
    
    /**
     * Create a new emotional session
     */
    createSession(session: StoredEmotionalSession): void {
        const stmt = this.db.prepare(`
            INSERT INTO emotional_sessions (
                session_id, start_time, end_time, dominant_emotion, 
                average_intensity, transition_count, action_count,
                typing_time, idle_time, error_count, success_count,
                files_edited, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            session.sessionId,
            session.startTime.toISOString(),
            session.endTime?.toISOString() ?? null,
            session.dominantEmotion,
            session.averageIntensity,
            session.transitionCount,
            session.actionCount,
            session.typingTime,
            session.idleTime,
            session.errorCount,
            session.successCount,
            JSON.stringify(session.filesEdited),
            session.metadata ? JSON.stringify(session.metadata) : null
        );
    }
    
    /**
     * Update an existing emotional session
     */
    updateSession(sessionId: string, updates: Partial<StoredEmotionalSession>): void {
        const fields: string[] = [];
        const values: any[] = [];
        
        if (updates.endTime !== undefined) {
            fields.push('end_time = ?');
            values.push(updates.endTime?.toISOString() ?? null);
        }
        if (updates.dominantEmotion !== undefined) {
            fields.push('dominant_emotion = ?');
            values.push(updates.dominantEmotion);
        }
        if (updates.averageIntensity !== undefined) {
            fields.push('average_intensity = ?');
            values.push(updates.averageIntensity);
        }
        if (updates.transitionCount !== undefined) {
            fields.push('transition_count = ?');
            values.push(updates.transitionCount);
        }
        if (updates.actionCount !== undefined) {
            fields.push('action_count = ?');
            values.push(updates.actionCount);
        }
        if (updates.typingTime !== undefined) {
            fields.push('typing_time = ?');
            values.push(updates.typingTime);
        }
        if (updates.idleTime !== undefined) {
            fields.push('idle_time = ?');
            values.push(updates.idleTime);
        }
        if (updates.errorCount !== undefined) {
            fields.push('error_count = ?');
            values.push(updates.errorCount);
        }
        if (updates.successCount !== undefined) {
            fields.push('success_count = ?');
            values.push(updates.successCount);
        }
        if (updates.filesEdited !== undefined) {
            fields.push('files_edited = ?');
            values.push(JSON.stringify(updates.filesEdited));
        }
        if (updates.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(updates.metadata));
        }
        
        if (fields.length === 0) {
            return;
        }
        
        fields.push('updated_at = datetime(\'now\')');
        values.push(sessionId);
        
        const stmt = this.db.prepare(`
            UPDATE emotional_sessions 
            SET ${fields.join(', ')} 
            WHERE session_id = ?
        `);
        
        stmt.run(...values);
    }
    
    /**
     * Get a session by ID
     */
    getSession(sessionId: string): StoredEmotionalSession | null {
        const stmt = this.db.prepare(`
            SELECT * FROM emotional_sessions WHERE session_id = ?
        `);
        
        const row = stmt.get(sessionId) as any;
        if (!row) {
            return null;
        }
        
        return this.mapSessionRow(row);
    }
    
    /**
     * Get all sessions with optional filtering
     */
    getSessions(options: QueryOptions = {}): StoredEmotionalSession[] {
        let query = 'SELECT * FROM emotional_sessions WHERE 1=1';
        const params: any[] = [];
        
        if (options.startTime) {
            query += ' AND start_time >= ?';
            params.push(options.startTime.toISOString());
        }
        if (options.endTime) {
            query += ' AND start_time <= ?';
            params.push(options.endTime.toISOString());
        }
        if (options.emotionType) {
            query += ' AND dominant_emotion = ?';
            params.push(options.emotionType);
        }
        
        query += ' ORDER BY start_time DESC';
        
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }
        
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];
        
        return rows.map(row => this.mapSessionRow(row));
    }
    
    /**
     * Delete a session and all related data
     */
    deleteSession(sessionId: string): void {
        const stmt = this.db.prepare('DELETE FROM emotional_sessions WHERE session_id = ?');
        stmt.run(sessionId);
    }
    
    // ==================== Emotional Vector Operations ====================
    
    /**
     * Store an emotional vector
     */
    storeVector(sessionId: string, vector: EmotionalVector): number {
        const stmt = this.db.prepare(`
            INSERT INTO emotional_vectors (
                session_id, timestamp, calm, tense, curious, 
                excited, frustrated, confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            sessionId,
            vector.timestamp.toISOString(),
            vector.calm,
            vector.tense,
            vector.curious,
            vector.excited,
            vector.frustrated,
            vector.confidence
        );
        
        return result.lastInsertRowid as number;
    }
    
    /**
     * Get emotional vectors for a session
     */
    getVectors(sessionId: string, options: QueryOptions = {}): EmotionalVector[] {
        let query = 'SELECT * FROM emotional_vectors WHERE session_id = ?';
        const params: any[] = [sessionId];
        
        if (options.startTime) {
            query += ' AND timestamp >= ?';
            params.push(options.startTime.toISOString());
        }
        if (options.endTime) {
            query += ' AND timestamp <= ?';
            params.push(options.endTime.toISOString());
        }
        
        query += ' ORDER BY timestamp ASC';
        
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];
        
        return rows.map(row => this.mapVectorRow(row));
    }
    
    // ==================== Emotional State Operations ====================
    
    /**
     * Store an emotional state
     */
    storeState(sessionId: string, state: EmotionalState, vectorId: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO emotional_states (
                session_id, timestamp, primary_emotion, secondary_emotion,
                intensity, stability, trend, confidence, duration, vector_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            sessionId,
            state.vector.timestamp.toISOString(),
            state.primary,
            state.secondary ?? null,
            state.intensity,
            state.stability,
            state.trend,
            state.confidence,
            state.duration,
            vectorId
        );
        
        return result.lastInsertRowid as number;
    }
    
    /**
     * Get emotional states for a session
     */
    getStates(sessionId: string, options: QueryOptions = {}): EmotionalState[] {
        let query = `
            SELECT s.*, v.* 
            FROM emotional_states s
            JOIN emotional_vectors v ON s.vector_id = v.id
            WHERE s.session_id = ?
        `;
        const params: any[] = [sessionId];
        
        if (options.startTime) {
            query += ' AND s.timestamp >= ?';
            params.push(options.startTime.toISOString());
        }
        if (options.endTime) {
            query += ' AND s.timestamp <= ?';
            params.push(options.endTime.toISOString());
        }
        if (options.emotionType) {
            query += ' AND s.primary_emotion = ?';
            params.push(options.emotionType);
        }
        
        query += ' ORDER BY s.timestamp ASC';
        
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];
        
        return rows.map(row => this.mapStateRow(row));
    }
    
    // ==================== User Action Operations ====================
    
    /**
     * Store a user action
     */
    storeAction(sessionId: string, action: UserAction): void {
        const stmt = this.db.prepare(`
            INSERT INTO user_actions (
                session_id, action_id, action_type, timestamp, duration,
                success, error_message, file_type, language, line_number,
                typing_speed, error_count, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            sessionId,
            action.id,
            action.type,
            action.timestamp.toISOString(),
            action.duration ?? null,
            action.success ? 1 : 0,
            action.errorMessage ?? null,
            action.context.fileType ?? null,
            action.context.language ?? null,
            action.context.lineNumber ?? null,
            action.context.typingSpeed ?? null,
            action.context.errorCount ?? null,
            action.context.metadata ? JSON.stringify(action.context.metadata) : null
        );
    }
    
    /**
     * Get user actions for a session
     */
    getActions(sessionId: string, options: QueryOptions = {}): UserAction[] {
        let query = 'SELECT * FROM user_actions WHERE session_id = ?';
        const params: any[] = [sessionId];
        
        if (options.startTime) {
            query += ' AND timestamp >= ?';
            params.push(options.startTime.toISOString());
        }
        if (options.endTime) {
            query += ' AND timestamp <= ?';
            params.push(options.endTime.toISOString());
        }
        
        query += ' ORDER BY timestamp ASC';
        
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];
        
        return rows.map(row => this.mapActionRow(row));
    }
    
    // ==================== Emotional History Operations ====================
    
    /**
     * Get complete emotional history for a session
     */
    getEmotionalHistory(sessionId: string): EmotionalHistory | null {
        const session = this.getSession(sessionId);
        if (!session) {
            return null;
        }
        
        const vectors = this.getVectors(sessionId);
        const states = this.getStates(sessionId);
        
        return {
            id: session.sessionId,
            startTime: session.startTime,
            endTime: session.endTime ?? new Date(),
            vectors,
            states,
            dominantEmotion: session.dominantEmotion,
            averageIntensity: session.averageIntensity,
            transitionCount: session.transitionCount,
            mostStablePeriod: this.findMostStablePeriod(states)
        };
    }
    
    // ==================== Helper Methods ====================
    
    private mapSessionRow(row: any): StoredEmotionalSession {
        return {
            sessionId: row.session_id,
            startTime: new Date(row.start_time),
            endTime: row.end_time ? new Date(row.end_time) : undefined,
            dominantEmotion: row.dominant_emotion as EmotionType,
            averageIntensity: row.average_intensity,
            transitionCount: row.transition_count,
            actionCount: row.action_count,
            typingTime: row.typing_time,
            idleTime: row.idle_time,
            errorCount: row.error_count,
            successCount: row.success_count,
            filesEdited: row.files_edited ? JSON.parse(row.files_edited) : [],
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
    }
    
    private mapVectorRow(row: any): EmotionalVector {
        return {
            calm: row.calm,
            tense: row.tense,
            curious: row.curious,
            excited: row.excited,
            frustrated: row.frustrated,
            timestamp: new Date(row.timestamp),
            confidence: row.confidence
        };
    }
    
    private mapStateRow(row: any): EmotionalState {
        const vector: EmotionalVector = {
            calm: row.calm,
            tense: row.tense,
            curious: row.curious,
            excited: row.excited,
            frustrated: row.frustrated,
            timestamp: new Date(row.timestamp),
            confidence: row.confidence
        };
        
        return {
            primary: row.primary_emotion as EmotionType,
            secondary: row.secondary_emotion as EmotionType | undefined,
            intensity: row.intensity,
            stability: row.stability,
            trend: row.trend as EmotionalTrend,
            confidence: row.confidence,
            duration: row.duration,
            vector
        };
    }
    
    private mapActionRow(row: any): UserAction {
        return {
            id: row.action_id,
            type: row.action_type,
            timestamp: new Date(row.timestamp),
            duration: row.duration ?? undefined,
            success: row.success === 1,
            errorMessage: row.error_message ?? undefined,
            context: {
                fileType: row.file_type ?? undefined,
                language: row.language ?? undefined,
                lineNumber: row.line_number ?? undefined,
                typingSpeed: row.typing_speed ?? undefined,
                errorCount: row.error_count ?? undefined,
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined
            }
        };
    }
    
    private findMostStablePeriod(states: EmotionalState[]): EmotionalHistory['mostStablePeriod'] {
        if (states.length === 0) {
            return undefined;
        }
        
        let maxStability = 0;
        let stableState: EmotionalState | null = null;
        let startIdx = 0;
        let endIdx = 0;
        
        for (let i = 0; i < states.length; i++) {
            if (states[i].stability > maxStability) {
                maxStability = states[i].stability;
                stableState = states[i];
                startIdx = i;
                endIdx = i;
                
                // Extend the period while stability remains high
                while (endIdx < states.length - 1 && 
                       states[endIdx + 1].primary === stableState.primary &&
                       states[endIdx + 1].stability >= maxStability * 0.9) {
                    endIdx++;
                }
            }
        }
        
        if (!stableState) {
            return undefined;
        }
        
        return {
            emotion: stableState.primary,
            startTime: states[startIdx].vector.timestamp,
            endTime: states[endIdx].vector.timestamp,
            stability: maxStability
        };
    }
}
