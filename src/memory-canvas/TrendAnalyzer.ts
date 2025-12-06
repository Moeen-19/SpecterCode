/**
 * Emotional trend analysis algorithms
 * Provides pattern recognition and analysis for long-term emotional trends
 */

import { EmotionalVector, EmotionalState, EmotionType, EmotionalTrend } from '../models/EmotionalModels';
import { StoredEmotionalSession } from './EmotionalDataAccess';

/**
 * Pattern types that can be detected in emotional data
 */
export enum EmotionalPattern {
    STABLE = 'stable',
    OSCILLATING = 'oscillating',
    ASCENDING = 'ascending',
    DESCENDING = 'descending',
    VOLATILE = 'volatile',
    BURNOUT = 'burnout',
    FLOW_STATE = 'flow_state',
    RECOVERY = 'recovery'
}

/**
 * Detected emotional pattern with metadata
 */
export interface DetectedPattern {
    pattern: EmotionalPattern;
    confidence: number;
    startTime: Date;
    endTime: Date;
    dominantEmotion: EmotionType;
    intensity: number;
    description: string;
}

/**
 * Session summary with dominant mood and metrics
 */
export interface SessionSummary {
    sessionId: string;
    dominantMood: EmotionType;
    secondaryMood?: EmotionType;
    averageIntensity: number;
    emotionalStability: number;
    productivityScore: number;
    stressLevel: number;
    focusLevel: number;
    patterns: DetectedPattern[];
    recommendations: string[];
}

/**
 * Historical influence weights for visual states
 */
export interface HistoricalInfluence {
    /** Weight of recent sessions (0-1 scale) */
    recentWeight: number;
    
    /** Weight of medium-term history (0-1 scale) */
    mediumTermWeight: number;
    
    /** Weight of long-term patterns (0-1 scale) */
    longTermWeight: number;
    
    /** Dominant emotional influence */
    dominantInfluence: EmotionType;
    
    /** Suggested visual adjustments */
    visualAdjustments: {
        colorShift: number;
        intensityModifier: number;
        complexityModifier: number;
        stabilityModifier: number;
    };
}

/**
 * Trend Analyzer - Analyzes emotional patterns and trends over time
 */
export class TrendAnalyzer {
    /**
     * Detect emotional patterns in a series of sessions
     */
    detectPatterns(sessions: StoredEmotionalSession[]): DetectedPattern[] {
        if (sessions.length === 0) {
            return [];
        }
        
        const patterns: DetectedPattern[] = [];
        
        // Detect stable patterns
        const stablePattern = this.detectStablePattern(sessions);
        if (stablePattern) {
            patterns.push(stablePattern);
        }
        
        // Detect oscillating patterns
        const oscillatingPattern = this.detectOscillatingPattern(sessions);
        if (oscillatingPattern) {
            patterns.push(oscillatingPattern);
        }
        
        // Detect ascending/descending patterns
        const trendPattern = this.detectTrendPattern(sessions);
        if (trendPattern) {
            patterns.push(trendPattern);
        }
        
        // Detect volatile patterns
        const volatilePattern = this.detectVolatilePattern(sessions);
        if (volatilePattern) {
            patterns.push(volatilePattern);
        }
        
        // Detect burnout patterns
        const burnoutPattern = this.detectBurnoutPattern(sessions);
        if (burnoutPattern) {
            patterns.push(burnoutPattern);
        }
        
        // Detect flow state patterns
        const flowPattern = this.detectFlowStatePattern(sessions);
        if (flowPattern) {
            patterns.push(flowPattern);
        }
        
        // Detect recovery patterns
        const recoveryPattern = this.detectRecoveryPattern(sessions);
        if (recoveryPattern) {
            patterns.push(recoveryPattern);
        }
        
        return patterns;
    }
    
    /**
     * Calculate dominant mood for a session summary
     */
    calculateDominantMood(sessions: StoredEmotionalSession[]): SessionSummary[] {
        return sessions.map(session => this.createSessionSummary(session));
    }
    
    /**
     * Calculate historical influence weights for current visual state
     */
    calculateHistoricalInfluence(
        recentSessions: StoredEmotionalSession[],
        mediumTermSessions: StoredEmotionalSession[],
        longTermSessions: StoredEmotionalSession[]
    ): HistoricalInfluence {
        // Calculate weights based on recency and consistency
        const recentWeight = this.calculateRecencyWeight(recentSessions);
        const mediumTermWeight = this.calculateRecencyWeight(mediumTermSessions) * 0.6;
        const longTermWeight = this.calculateRecencyWeight(longTermSessions) * 0.3;
        
        // Normalize weights
        const totalWeight = recentWeight + mediumTermWeight + longTermWeight;
        const normalizedRecent = recentWeight / totalWeight;
        const normalizedMedium = mediumTermWeight / totalWeight;
        const normalizedLong = longTermWeight / totalWeight;
        
        // Calculate dominant influence
        const allSessions = [...recentSessions, ...mediumTermSessions, ...longTermSessions];
        const dominantInfluence = this.findDominantEmotion(allSessions);
        
        // Calculate visual adjustments
        const avgIntensity = this.calculateAverageIntensity(allSessions);
        const avgStability = this.calculateAverageStability(allSessions);
        const avgTransitions = this.calculateAverageTransitions(allSessions);
        
        return {
            recentWeight: normalizedRecent,
            mediumTermWeight: normalizedMedium,
            longTermWeight: normalizedLong,
            dominantInfluence,
            visualAdjustments: {
                colorShift: this.emotionToColorShift(dominantInfluence),
                intensityModifier: avgIntensity,
                complexityModifier: Math.min(1, avgTransitions / 10),
                stabilityModifier: avgStability
            }
        };
    }
    
    // ==================== Pattern Detection Methods ====================
    
    private detectStablePattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 3) {
            return null;
        }
        
        // Check if the same emotion dominates with low transition counts
        const emotionCounts = new Map<EmotionType, number>();
        let totalTransitions = 0;
        
        for (const session of sessions) {
            emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
            totalTransitions += session.transitionCount;
        }
        
        const avgTransitions = totalTransitions / sessions.length;
        const maxCount = Math.max(...emotionCounts.values());
        const dominance = maxCount / sessions.length;
        
        // Stable if one emotion dominates >60% and low transitions
        if (dominance > 0.6 && avgTransitions < 5) {
            const dominantEmotion = Array.from(emotionCounts.entries())
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.STABLE,
                confidence: dominance,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion,
                intensity: avgIntensity,
                description: `Stable ${dominantEmotion} state with minimal emotional transitions`
            };
        }
        
        return null;
    }
    
    private detectOscillatingPattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 4) {
            return null;
        }
        
        // Check for alternating emotions
        let oscillations = 0;
        for (let i = 2; i < sessions.length; i++) {
            if (sessions[i].dominantEmotion === sessions[i - 2].dominantEmotion &&
                sessions[i].dominantEmotion !== sessions[i - 1].dominantEmotion) {
                oscillations++;
            }
        }
        
        const oscillationRate = oscillations / (sessions.length - 2);
        
        if (oscillationRate > 0.5) {
            const emotionCounts = new Map<EmotionType, number>();
            for (const session of sessions) {
                emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
            }
            
            const dominantEmotion = Array.from(emotionCounts.entries())
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.OSCILLATING,
                confidence: oscillationRate,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion,
                intensity: avgIntensity,
                description: `Oscillating emotional pattern with frequent mood swings`
            };
        }
        
        return null;
    }
    
    private detectTrendPattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 3) {
            return null;
        }
        
        // Calculate intensity trend
        const intensities = sessions.map(s => s.averageIntensity);
        let ascendingCount = 0;
        let descendingCount = 0;
        
        for (let i = 1; i < intensities.length; i++) {
            if (intensities[i] > intensities[i - 1]) {
                ascendingCount++;
            } else if (intensities[i] < intensities[i - 1]) {
                descendingCount++;
            }
        }
        
        const totalComparisons = intensities.length - 1;
        const ascendingRate = ascendingCount / totalComparisons;
        const descendingRate = descendingCount / totalComparisons;
        
        if (ascendingRate > 0.7) {
            const emotionCounts = new Map<EmotionType, number>();
            for (const session of sessions) {
                emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
            }
            
            const dominantEmotion = Array.from(emotionCounts.entries())
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.ASCENDING,
                confidence: ascendingRate,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion,
                intensity: avgIntensity,
                description: `Ascending emotional intensity trend`
            };
        } else if (descendingRate > 0.7) {
            const emotionCounts = new Map<EmotionType, number>();
            for (const session of sessions) {
                emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
            }
            
            const dominantEmotion = Array.from(emotionCounts.entries())
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.DESCENDING,
                confidence: descendingRate,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion,
                intensity: avgIntensity,
                description: `Descending emotional intensity trend`
            };
        }
        
        return null;
    }
    
    private detectVolatilePattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 3) {
            return null;
        }
        
        // Check for high transition counts and frequent emotion changes
        const avgTransitions = sessions.reduce((sum, s) => sum + s.transitionCount, 0) / sessions.length;
        
        let emotionChanges = 0;
        for (let i = 1; i < sessions.length; i++) {
            if (sessions[i].dominantEmotion !== sessions[i - 1].dominantEmotion) {
                emotionChanges++;
            }
        }
        
        const changeRate = emotionChanges / (sessions.length - 1);
        
        if (avgTransitions > 10 && changeRate > 0.6) {
            const emotionCounts = new Map<EmotionType, number>();
            for (const session of sessions) {
                emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
            }
            
            const dominantEmotion = Array.from(emotionCounts.entries())
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.VOLATILE,
                confidence: Math.min(1, (avgTransitions / 15) * changeRate),
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion,
                intensity: avgIntensity,
                description: `Highly volatile emotional state with frequent rapid changes`
            };
        }
        
        return null;
    }
    
    private detectBurnoutPattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 3) {
            return null;
        }
        
        // Check for progression from excited/curious to frustrated/tense
        const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
        const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
        
        const firstHalfPositive = firstHalf.filter(s => 
            s.dominantEmotion === EmotionType.EXCITED || 
            s.dominantEmotion === EmotionType.CURIOUS
        ).length;
        
        const secondHalfNegative = secondHalf.filter(s => 
            s.dominantEmotion === EmotionType.FRUSTRATED || 
            s.dominantEmotion === EmotionType.TENSE
        ).length;
        
        const positiveRate = firstHalfPositive / firstHalf.length;
        const negativeRate = secondHalfNegative / secondHalf.length;
        
        if (positiveRate > 0.5 && negativeRate > 0.5) {
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.BURNOUT,
                confidence: (positiveRate + negativeRate) / 2,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion: EmotionType.FRUSTRATED,
                intensity: avgIntensity,
                description: `Burnout pattern detected: transition from positive to negative emotions`
            };
        }
        
        return null;
    }
    
    private detectFlowStatePattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 2) {
            return null;
        }
        
        // Check for calm/curious states with high productivity
        const flowSessions = sessions.filter(s => 
            (s.dominantEmotion === EmotionType.CALM || s.dominantEmotion === EmotionType.CURIOUS) &&
            s.successCount > s.errorCount &&
            s.transitionCount < 5
        );
        
        const flowRate = flowSessions.length / sessions.length;
        
        if (flowRate > 0.6) {
            const avgIntensity = flowSessions.reduce((sum, s) => sum + s.averageIntensity, 0) / flowSessions.length;
            
            return {
                pattern: EmotionalPattern.FLOW_STATE,
                confidence: flowRate,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion: EmotionType.CALM,
                intensity: avgIntensity,
                description: `Flow state detected: sustained calm/curious state with high productivity`
            };
        }
        
        return null;
    }
    
    private detectRecoveryPattern(sessions: StoredEmotionalSession[]): DetectedPattern | null {
        if (sessions.length < 3) {
            return null;
        }
        
        // Check for progression from frustrated/tense to calm/curious
        const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
        const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
        
        const firstHalfNegative = firstHalf.filter(s => 
            s.dominantEmotion === EmotionType.FRUSTRATED || 
            s.dominantEmotion === EmotionType.TENSE
        ).length;
        
        const secondHalfPositive = secondHalf.filter(s => 
            s.dominantEmotion === EmotionType.CALM || 
            s.dominantEmotion === EmotionType.CURIOUS
        ).length;
        
        const negativeRate = firstHalfNegative / firstHalf.length;
        const positiveRate = secondHalfPositive / secondHalf.length;
        
        if (negativeRate > 0.5 && positiveRate > 0.5) {
            const avgIntensity = sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
            
            return {
                pattern: EmotionalPattern.RECOVERY,
                confidence: (negativeRate + positiveRate) / 2,
                startTime: sessions[0].startTime,
                endTime: sessions[sessions.length - 1].endTime ?? new Date(),
                dominantEmotion: EmotionType.CALM,
                intensity: avgIntensity,
                description: `Recovery pattern detected: transition from negative to positive emotions`
            };
        }
        
        return null;
    }
    
    // ==================== Session Summary Methods ====================
    
    private createSessionSummary(session: StoredEmotionalSession): SessionSummary {
        // Calculate secondary mood (second most common emotion)
        // This would require access to the full emotional vectors, so we'll leave it undefined for now
        const secondaryMood = undefined;
        
        // Calculate emotional stability (inverse of transition frequency)
        const emotionalStability = Math.max(0, 1 - (session.transitionCount / 20));
        
        // Calculate productivity score
        const totalActions = session.successCount + session.errorCount;
        const productivityScore = totalActions > 0 ? session.successCount / totalActions : 0;
        
        // Calculate stress level (based on frustrated/tense emotions and error rate)
        const errorRate = totalActions > 0 ? session.errorCount / totalActions : 0;
        const stressLevel = session.dominantEmotion === EmotionType.FRUSTRATED || 
                           session.dominantEmotion === EmotionType.TENSE
            ? Math.min(1, session.averageIntensity * 0.7 + errorRate * 0.3)
            : errorRate * 0.5;
        
        // Calculate focus level (based on calm/curious emotions and low transitions)
        const focusLevel = (session.dominantEmotion === EmotionType.CALM || 
                           session.dominantEmotion === EmotionType.CURIOUS)
            ? Math.min(1, session.averageIntensity * 0.6 + emotionalStability * 0.4)
            : emotionalStability * 0.5;
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(session, stressLevel, focusLevel, productivityScore);
        
        return {
            sessionId: session.sessionId,
            dominantMood: session.dominantEmotion,
            secondaryMood,
            averageIntensity: session.averageIntensity,
            emotionalStability,
            productivityScore,
            stressLevel,
            focusLevel,
            patterns: [], // Would be populated by detectPatterns if called with multiple sessions
            recommendations
        };
    }
    
    private generateRecommendations(
        session: StoredEmotionalSession,
        stressLevel: number,
        focusLevel: number,
        productivityScore: number
    ): string[] {
        const recommendations: string[] = [];
        
        // High stress recommendations
        if (stressLevel > 0.7) {
            recommendations.push('Consider taking a short break to reduce stress levels');
            recommendations.push('Try switching to a calmer theme to help relax');
        }
        
        // Low focus recommendations
        if (focusLevel < 0.4) {
            recommendations.push('Minimize distractions to improve focus');
            recommendations.push('Consider using a focus-enhancing theme');
        }
        
        // Low productivity recommendations
        if (productivityScore < 0.5 && session.errorCount > 5) {
            recommendations.push('High error rate detected - consider reviewing recent changes');
            recommendations.push('Take a moment to plan your approach before continuing');
        }
        
        // High transition recommendations
        if (session.transitionCount > 15) {
            recommendations.push('Frequent emotional changes detected - try to maintain steady focus');
        }
        
        // Positive reinforcement
        if (productivityScore > 0.8 && focusLevel > 0.7) {
            recommendations.push('Great session! You\'re in a productive flow state');
        }
        
        // Long session recommendations
        const sessionDuration = session.typingTime + session.idleTime;
        if (sessionDuration > 3600000) { // > 1 hour
            recommendations.push('Long session detected - remember to take regular breaks');
        }
        
        return recommendations;
    }
    
    // ==================== Helper Methods ====================
    
    private calculateRecencyWeight(sessions: StoredEmotionalSession[]): number {
        if (sessions.length === 0) {
            return 0;
        }
        
        // Weight based on number of sessions and their consistency
        const emotionCounts = new Map<EmotionType, number>();
        for (const session of sessions) {
            emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
        }
        
        const maxCount = Math.max(...emotionCounts.values());
        const consistency = maxCount / sessions.length;
        
        return sessions.length * consistency;
    }
    
    private findDominantEmotion(sessions: StoredEmotionalSession[]): EmotionType {
        if (sessions.length === 0) {
            return EmotionType.CALM;
        }
        
        const emotionCounts = new Map<EmotionType, number>();
        for (const session of sessions) {
            emotionCounts.set(session.dominantEmotion, (emotionCounts.get(session.dominantEmotion) ?? 0) + 1);
        }
        
        return Array.from(emotionCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    private calculateAverageIntensity(sessions: StoredEmotionalSession[]): number {
        if (sessions.length === 0) {
            return 0;
        }
        
        return sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
    }
    
    private calculateAverageStability(sessions: StoredEmotionalSession[]): number {
        if (sessions.length === 0) {
            return 0;
        }
        
        // Stability is inverse of transition frequency
        const avgTransitions = sessions.reduce((sum, s) => sum + s.transitionCount, 0) / sessions.length;
        return Math.max(0, 1 - (avgTransitions / 20));
    }
    
    private calculateAverageTransitions(sessions: StoredEmotionalSession[]): number {
        if (sessions.length === 0) {
            return 0;
        }
        
        return sessions.reduce((sum, s) => sum + s.transitionCount, 0) / sessions.length;
    }
    
    private emotionToColorShift(emotion: EmotionType): number {
        // Map emotions to hue values (0-360)
        const hueMap: Record<EmotionType, number> = {
            [EmotionType.CALM]: 200,      // Blue
            [EmotionType.TENSE]: 0,       // Red
            [EmotionType.CURIOUS]: 280,   // Purple
            [EmotionType.EXCITED]: 60,    // Yellow
            [EmotionType.FRUSTRATED]: 15  // Orange-red
        };
        
        return hueMap[emotion];
    }
}