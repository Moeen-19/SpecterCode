/**
 * Memory Canvas - Persistent emotional history and long-term visual evolution
 * Main interface for storing and retrieving emotional data
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { createDatabase, closeDatabase, DatabaseConfig } from './DatabaseSchema';
import { EmotionalDataAccess, StoredEmotionalSession, QueryOptions } from './EmotionalDataAccess';
import { EmotionalVector, EmotionalState, EmotionalHistory, EmotionType } from '../models/EmotionalModels';
import { UserAction, SessionInfo } from '../models/SystemModels';
import { TrendAnalyzer, DetectedPattern, SessionSummary, HistoricalInfluence } from './TrendAnalyzer';
import { BackgroundEvolutionGenerator, VisualEvolutionState, VisualTransition } from './BackgroundEvolution';

/**
 * Memory Canvas configuration
 */
export interface MemoryCanvasConfig {
    /** Storage directory for the database */
    storageDir: string;
    
    /** Database filename */
    dbFilename?: string;
    
    /** Maximum number of sessions to keep */
    maxSessions?: number;
    
    /** Auto-cleanup old sessions after days */
    cleanupAfterDays?: number;
}

/**
 * Time period for querying emotional trends
 */
export interface TimePeriod {
    startTime: Date;
    endTime: Date;
}

/**
 * Emotional trends over a time period
 */
export interface EmotionalTrends {
    period: TimePeriod;
    dominantEmotions: Array<{
        emotion: EmotionType;
        percentage: number;
        averageIntensity: number;
    }>;
    emotionalStability: number;
    transitionFrequency: number;
    mostProductiveMood: EmotionType;
    mostFrustratedPeriods: Array<{
        startTime: Date;
        endTime: Date;
        intensity: number;
    }>;
    calmestPeriods: Array<{
        startTime: Date;
        endTime: Date;
        intensity: number;
    }>;
}

/**
 * Visual evolution data based on emotional history
 */
export interface VisualEvolution {
    colorShift: {
        hue: number;
        saturation: number;
        brightness: number;
    };
    textureComplexity: number;
    ambientIntensity: number;
    particleDensity: number;
    animationSpeed: number;
}

/**
 * Memory Canvas - manages persistent emotional history
 */
export class MemoryCanvas {
    private db: Database;
    private dataAccess: EmotionalDataAccess;
    private trendAnalyzer: TrendAnalyzer;
    private backgroundGenerator: BackgroundEvolutionGenerator;
    private config: Required<MemoryCanvasConfig>;
    private currentSessionId: string | null = null;
    
    constructor(config: MemoryCanvasConfig) {
        this.config = {
            storageDir: config.storageDir,
            dbFilename: config.dbFilename ?? 'emotional-history.db',
            maxSessions: config.maxSessions ?? 1000,
            cleanupAfterDays: config.cleanupAfterDays ?? 90
        };
        
        // Ensure storage directory exists
        if (!fs.existsSync(this.config.storageDir)) {
            fs.mkdirSync(this.config.storageDir, { recursive: true });
        }
        
        // Initialize database
        const dbPath = path.join(this.config.storageDir, this.config.dbFilename);
        const dbConfig: DatabaseConfig = {
            dbPath,
            enableWAL: true,
            enableForeignKeys: true
        };
        
        this.db = createDatabase(dbConfig);
        this.dataAccess = new EmotionalDataAccess(this.db);
        this.trendAnalyzer = new TrendAnalyzer();
        this.backgroundGenerator = new BackgroundEvolutionGenerator();
        
        // Perform cleanup if needed
        this.performCleanup();
    }
    
    // ==================== Session Management ====================
    
    /**
     * Start a new emotional session
     */
    startSession(sessionInfo: SessionInfo): void {
        this.currentSessionId = sessionInfo.sessionId;
        
        const session: StoredEmotionalSession = {
            sessionId: sessionInfo.sessionId,
            startTime: sessionInfo.startTime,
            dominantEmotion: EmotionType.CALM, // Default, will be updated
            averageIntensity: 0,
            transitionCount: 0,
            actionCount: 0,
            typingTime: 0,
            idleTime: 0,
            errorCount: 0,
            successCount: 0,
            filesEdited: []
        };
        
        this.dataAccess.createSession(session);
    }
    
    /**
     * End the current session
     */
    endSession(sessionInfo: SessionInfo): void {
        if (!this.currentSessionId) {
            return;
        }
        
        // Calculate dominant emotion from stored vectors
        const vectors = this.dataAccess.getVectors(this.currentSessionId);
        const dominantEmotion = this.calculateDominantEmotion(vectors);
        const averageIntensity = this.calculateAverageIntensity(vectors);
        
        this.dataAccess.updateSession(this.currentSessionId, {
            endTime: new Date(),
            dominantEmotion,
            averageIntensity,
            actionCount: sessionInfo.actionCount,
            typingTime: sessionInfo.typingTime,
            idleTime: sessionInfo.idleTime,
            errorCount: sessionInfo.errorCount,
            successCount: sessionInfo.successCount,
            filesEdited: sessionInfo.filesEdited
        });
        
        this.currentSessionId = null;
    }
    
    /**
     * Store an emotional session
     */
    storeSession(session: StoredEmotionalSession): void {
        this.dataAccess.createSession(session);
    }
    
    /**
     * Get a session by ID
     */
    getSession(sessionId: string): StoredEmotionalSession | null {
        return this.dataAccess.getSession(sessionId);
    }
    
    /**
     * Get recent sessions
     */
    getRecentSessions(limit: number = 10): StoredEmotionalSession[] {
        return this.dataAccess.getSessions({ limit });
    }
    
    // ==================== Emotional Data Storage ====================
    
    /**
     * Store an emotional vector
     */
    storeVector(vector: EmotionalVector): void {
        if (!this.currentSessionId) {
            throw new Error('No active session. Call startSession() first.');
        }
        
        this.dataAccess.storeVector(this.currentSessionId, vector);
    }
    
    /**
     * Store an emotional state
     */
    storeState(state: EmotionalState): void {
        if (!this.currentSessionId) {
            throw new Error('No active session. Call startSession() first.');
        }
        
        // Store the vector first
        const vectorId = this.dataAccess.storeVector(this.currentSessionId, state.vector);
        
        // Store the state
        this.dataAccess.storeState(this.currentSessionId, state, vectorId);
        
        // Update transition count
        const states = this.dataAccess.getStates(this.currentSessionId);
        const transitionCount = this.calculateTransitionCount(states);
        this.dataAccess.updateSession(this.currentSessionId, { transitionCount });
    }
    
    /**
     * Store a user action
     */
    storeAction(action: UserAction): void {
        if (!this.currentSessionId) {
            throw new Error('No active session. Call startSession() first.');
        }
        
        this.dataAccess.storeAction(this.currentSessionId, action);
    }
    
    // ==================== Emotional History Retrieval ====================
    
    /**
     * Get complete emotional history for a session
     */
    getEmotionalHistory(sessionId: string): EmotionalHistory | null {
        return this.dataAccess.getEmotionalHistory(sessionId);
    }
    
    // ==================== Trend Analysis ====================
    
    /**
     * Detect emotional patterns in recent sessions
     */
    detectEmotionalPatterns(sessionCount: number = 10): DetectedPattern[] {
        const sessions = this.getRecentSessions(sessionCount);
        return this.trendAnalyzer.detectPatterns(sessions);
    }
    
    /**
     * Get session summaries with dominant moods and recommendations
     */
    getSessionSummaries(sessionCount: number = 10): SessionSummary[] {
        const sessions = this.getRecentSessions(sessionCount);
        return this.trendAnalyzer.calculateDominantMood(sessions);
    }
    
    /**
     * Calculate historical influence for visual state adjustments
     */
    getHistoricalInfluence(): HistoricalInfluence {
        // Get sessions from different time periods
        const now = new Date();
        
        // Recent: last 5 sessions
        const recentSessions = this.getRecentSessions(5);
        
        // Medium-term: sessions from 6-15
        const mediumTermSessions = this.dataAccess.getSessions({
            limit: 10,
            offset: 5
        });
        
        // Long-term: sessions from 16-30
        const longTermSessions = this.dataAccess.getSessions({
            limit: 15,
            offset: 15
        });
        
        return this.trendAnalyzer.calculateHistoricalInfluence(
            recentSessions,
            mediumTermSessions,
            longTermSessions
        );
    }
    
    // ==================== Background Evolution ====================
    
    /**
     * Generate a new background evolution state based on recent emotional history
     */
    generateBackgroundState(sessionCount: number = 10): VisualEvolutionState {
        const sessions = this.getRecentSessions(sessionCount);
        const patterns = this.trendAnalyzer.detectPatterns(sessions);
        
        return this.backgroundGenerator.generateEvolutionState(sessions, patterns);
    }
    
    /**
     * Create a smooth transition between the current and new background state
     */
    createBackgroundTransition(
        newSessionCount: number = 10,
        transitionConfig?: Partial<VisualTransition>
    ): { fromState: VisualEvolutionState; toState: VisualEvolutionState; transition: VisualTransition } | null {
        const currentState = this.backgroundGenerator.getCurrentState();
        if (!currentState) {
            // No current state, generate initial state
            const newState = this.generateBackgroundState(newSessionCount);
            return null;
        }
        
        const newState = this.generateBackgroundState(newSessionCount);
        const transition = this.backgroundGenerator.createTransition(
            currentState,
            newState,
            transitionConfig
        );
        
        return {
            fromState: currentState,
            toState: newState,
            transition
        };
    }
    
    /**
     * Get the current background evolution state
     */
    getCurrentBackgroundState(): VisualEvolutionState | null {
        return this.backgroundGenerator.getCurrentState();
    }
    
    /**
     * Get the history of background evolution states
     */
    getBackgroundStateHistory(): VisualEvolutionState[] {
        return this.backgroundGenerator.getStateHistory();
    }
    
    /**
     * Interpolate between two background states for smooth transitions
     */
    interpolateBackgroundStates(
        fromState: VisualEvolutionState,
        toState: VisualEvolutionState,
        progress: number
    ): VisualEvolutionState {
        return this.backgroundGenerator.interpolateStates(fromState, toState, progress);
    }
    
    /**
     * Get emotional trends over a time period
     */
    getEmotionalTrends(period: TimePeriod): EmotionalTrends {
        const sessions = this.dataAccess.getSessions({
            startTime: period.startTime,
            endTime: period.endTime
        });
        
        if (sessions.length === 0) {
            return this.getEmptyTrends(period);
        }
        
        // Calculate dominant emotions
        const emotionCounts = new Map<EmotionType, { count: number; totalIntensity: number }>();
        let totalTransitions = 0;
        let totalStability = 0;
        
        for (const session of sessions) {
            const existing = emotionCounts.get(session.dominantEmotion) ?? { count: 0, totalIntensity: 0 };
            existing.count++;
            existing.totalIntensity += session.averageIntensity;
            emotionCounts.set(session.dominantEmotion, existing);
            
            totalTransitions += session.transitionCount;
            
            // Calculate stability from states
            const states = this.dataAccess.getStates(session.sessionId);
            totalStability += states.reduce((sum, s) => sum + s.stability, 0) / Math.max(states.length, 1);
        }
        
        const totalSessions = sessions.length;
        const dominantEmotions = Array.from(emotionCounts.entries())
            .map(([emotion, data]) => ({
                emotion,
                percentage: (data.count / totalSessions) * 100,
                averageIntensity: data.totalIntensity / data.count
            }))
            .sort((a, b) => b.percentage - a.percentage);
        
        // Find most productive mood (highest success rate)
        const mostProductiveMood = this.findMostProductiveMood(sessions);
        
        // Find frustrated and calm periods
        const frustratedPeriods = this.findEmotionalPeriods(sessions, EmotionType.FRUSTRATED);
        const calmestPeriods = this.findEmotionalPeriods(sessions, EmotionType.CALM);
        
        return {
            period,
            dominantEmotions,
            emotionalStability: totalStability / totalSessions,
            transitionFrequency: totalTransitions / totalSessions,
            mostProductiveMood,
            mostFrustratedPeriods: frustratedPeriods,
            calmestPeriods: calmestPeriods
        };
    }
    
    // ==================== Visual Evolution ====================
    
    /**
     * Generate background evolution based on emotional history
     */
    generateBackgroundEvolution(): VisualEvolution {
        const recentSessions = this.getRecentSessions(10);
        
        if (recentSessions.length === 0) {
            return this.getDefaultVisualEvolution();
        }
        
        // Calculate average emotional state
        const avgIntensity = recentSessions.reduce((sum, s) => sum + s.averageIntensity, 0) / recentSessions.length;
        const avgTransitions = recentSessions.reduce((sum, s) => sum + s.transitionCount, 0) / recentSessions.length;
        
        // Determine dominant emotion
        const emotionCounts = new Map<EmotionType, number>();
        for (const session of recentSessions) {
            emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
        }
        
        const dominantEmotion = Array.from(emotionCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
        
        // Map emotions to visual properties
        const colorShift = this.emotionToColorShift(dominantEmotion, avgIntensity);
        const textureComplexity = Math.min(1, avgTransitions / 10); // More transitions = more complex
        const ambientIntensity = avgIntensity;
        const particleDensity = avgIntensity * 0.8;
        const animationSpeed = avgIntensity * 1.2;
        
        return {
            colorShift,
            textureComplexity,
            ambientIntensity,
            particleDensity,
            animationSpeed
        };
    }
    
    /**
     * Apply historical influence to current theme
     */
    applyHistoricalInfluence(currentTheme: any): any {
        const evolution = this.generateBackgroundEvolution();
        
        // Clone theme to avoid mutation
        const influencedTheme = JSON.parse(JSON.stringify(currentTheme));
        
        // Apply color shift
        if (influencedTheme.visual?.palette) {
            // Adjust colors based on emotional history
            // This is a simplified version - real implementation would use color manipulation
            influencedTheme.visual.palette.emotionalShift = evolution.colorShift;
        }
        
        // Apply effect intensity
        if (influencedTheme.visual?.effects) {
            influencedTheme.visual.effects.particleDensity *= evolution.particleDensity;
            influencedTheme.visual.effects.animationSpeed *= evolution.animationSpeed;
            influencedTheme.visual.effects.ambientIntensity = evolution.ambientIntensity;
        }
        
        return influencedTheme;
    }
    
    // ==================== Cleanup and Maintenance ====================
    
    /**
     * Perform cleanup of old sessions
     */
    private performCleanup(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupAfterDays);
        
        const oldSessions = this.dataAccess.getSessions({
            endTime: cutoffDate
        });
        
        // Keep only the most recent sessions up to maxSessions
        const allSessions = this.dataAccess.getSessions({});
        if (allSessions.length > this.config.maxSessions) {
            const sessionsToDelete = allSessions.slice(this.config.maxSessions);
            for (const session of sessionsToDelete) {
                this.dataAccess.deleteSession(session.sessionId);
            }
        }
    }
    
    /**
     * Close the database connection
     */
    close(): void {
        closeDatabase(this.db);
    }
    
    // ==================== Helper Methods ====================
    
    private calculateDominantEmotion(vectors: EmotionalVector[]): EmotionType {
        if (vectors.length === 0) {
            return EmotionType.CALM;
        }
        
        const totals = {
            calm: 0,
            tense: 0,
            curious: 0,
            excited: 0,
            frustrated: 0
        };
        
        for (const vector of vectors) {
            totals.calm += vector.calm;
            totals.tense += vector.tense;
            totals.curious += vector.curious;
            totals.excited += vector.excited;
            totals.frustrated += vector.frustrated;
        }
        
        const entries = Object.entries(totals) as [EmotionType, number][];
        return entries.sort((a, b) => b[1] - a[1])[0][0];
    }
    
    private calculateAverageIntensity(vectors: EmotionalVector[]): number {
        if (vectors.length === 0) {
            return 0;
        }
        
        const totalIntensity = vectors.reduce((sum, v) => {
            const max = Math.max(v.calm, v.tense, v.curious, v.excited, v.frustrated);
            return sum + max;
        }, 0);
        
        return totalIntensity / vectors.length;
    }
    
    private calculateTransitionCount(states: EmotionalState[]): number {
        if (states.length <= 1) {
            return 0;
        }
        
        let transitions = 0;
        for (let i = 1; i < states.length; i++) {
            if (states[i].primary !== states[i - 1].primary) {
                transitions++;
            }
        }
        
        return transitions;
    }
    
    private findMostProductiveMood(sessions: StoredEmotionalSession[]): EmotionType {
        const productivityByEmotion = new Map<EmotionType, { success: number; total: number }>();
        
        for (const session of sessions) {
            const existing = productivityByEmotion.get(session.dominantEmotion) ?? { success: 0, total: 0 };
            existing.success += session.successCount;
            existing.total += session.successCount + session.errorCount;
            productivityByEmotion.set(session.dominantEmotion, existing);
        }
        
        let bestEmotion = EmotionType.CALM;
        let bestRate = 0;
        
        for (const [emotion, data] of productivityByEmotion.entries()) {
            const rate = data.total > 0 ? data.success / data.total : 0;
            if (rate > bestRate) {
                bestRate = rate;
                bestEmotion = emotion;
            }
        }
        
        return bestEmotion;
    }
    
    private findEmotionalPeriods(
        sessions: StoredEmotionalSession[],
        emotion: EmotionType
    ): Array<{ startTime: Date; endTime: Date; intensity: number }> {
        return sessions
            .filter(s => s.dominantEmotion === emotion)
            .map(s => ({
                startTime: s.startTime,
                endTime: s.endTime ?? new Date(),
                intensity: s.averageIntensity
            }))
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 5);
    }
    
    private emotionToColorShift(emotion: EmotionType, intensity: number): VisualEvolution['colorShift'] {
        const baseShifts: Record<EmotionType, { hue: number; saturation: number; brightness: number }> = {
            [EmotionType.CALM]: { hue: 200, saturation: 0.3, brightness: 0.7 },
            [EmotionType.TENSE]: { hue: 0, saturation: 0.5, brightness: 0.5 },
            [EmotionType.CURIOUS]: { hue: 280, saturation: 0.6, brightness: 0.8 },
            [EmotionType.EXCITED]: { hue: 60, saturation: 0.8, brightness: 0.9 },
            [EmotionType.FRUSTRATED]: { hue: 15, saturation: 0.7, brightness: 0.4 }
        };
        
        const base = baseShifts[emotion];
        return {
            hue: base.hue,
            saturation: base.saturation * intensity,
            brightness: base.brightness * (0.5 + intensity * 0.5)
        };
    }
    
    private getEmptyTrends(period: TimePeriod): EmotionalTrends {
        return {
            period,
            dominantEmotions: [],
            emotionalStability: 0,
            transitionFrequency: 0,
            mostProductiveMood: EmotionType.CALM,
            mostFrustratedPeriods: [],
            calmestPeriods: []
        };
    }
    
    private getDefaultVisualEvolution(): VisualEvolution {
        return {
            colorShift: { hue: 200, saturation: 0.3, brightness: 0.7 },
            textureComplexity: 0.3,
            ambientIntensity: 0.5,
            particleDensity: 0.5,
            animationSpeed: 1.0
        };
    }
}
