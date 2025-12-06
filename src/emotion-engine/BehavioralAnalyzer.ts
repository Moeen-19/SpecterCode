/**
 * Behavioral Pattern Recognition System for MirrorCanvas Emotion Engine
 * Analyzes typing rhythm, code churn, and other behavioral patterns to infer emotional state
 */

import { EmotionalVector } from '../models/EmotionalModels';

/**
 * Represents a user action in the editor
 */
export interface UserAction {
    type: 'typing' | 'save' | 'compile' | 'error' | 'hover' | 'click' | 'delete' | 'idle';
    timestamp: Date;
    context?: {
        fileType?: string;
        errorCount?: number;
        typingSpeed?: number;
        sessionDuration?: number;
        charactersTyped?: number;
        linesChanged?: number;
    };
}

/**
 * Typing rhythm metrics
 */
export interface TypingRhythm {
    /** Average typing speed in characters per minute */
    averageSpeed: number;
    
    /** Variance in typing speed (higher = more erratic) */
    speedVariance: number;
    
    /** Number of pauses (gaps > 2 seconds) */
    pauseCount: number;
    
    /** Average pause duration in milliseconds */
    averagePauseDuration: number;
    
    /** Burst typing indicator (rapid typing followed by pauses) */
    burstiness: number;
}

/**
 * Code churn metrics
 */
export interface CodeChurnMetrics {
    /** Lines added in the time window */
    linesAdded: number;
    
    /** Lines deleted in the time window */
    linesDeleted: number;
    
    /** Number of saves in the time window */
    saveCount: number;
    
    /** Number of errors encountered */
    errorCount: number;
    
    /** Churn rate (additions + deletions per minute) */
    churnRate: number;
    
    /** Error rate (errors per save) */
    errorRate: number;
}

/**
 * Behavioral analysis result
 */
export interface BehavioralAnalysisResult {
    /** Generated emotional vector from behavioral patterns */
    vector: EmotionalVector;
    
    /** Typing rhythm metrics */
    typingRhythm: TypingRhythm;
    
    /** Code churn metrics */
    codeChurn: CodeChurnMetrics;
    
    /** Confidence of the behavioral analysis */
    confidence: number;
    
    /** Time window analyzed (in milliseconds) */
    timeWindow: number;
}

/**
 * Configuration for behavioral analysis
 */
export interface BehavioralAnalysisConfig {
    /** Time window for analysis in milliseconds */
    timeWindow: number;
    
    /** Minimum actions required for analysis */
    minActionsRequired: number;
    
    /** Threshold for detecting pauses (in milliseconds) */
    pauseThreshold: number;
    
    /** Weight for typing rhythm in emotional calculation */
    typingWeight: number;
    
    /** Weight for code churn in emotional calculation */
    churnWeight: number;
}

/**
 * Default configuration for behavioral analysis
 */
export const DEFAULT_BEHAVIORAL_CONFIG: BehavioralAnalysisConfig = {
    timeWindow: 60000, // 1 minute
    minActionsRequired: 5,
    pauseThreshold: 2000, // 2 seconds
    typingWeight: 0.6,
    churnWeight: 0.4
};

/**
 * BehavioralAnalyzer class for analyzing user behavior patterns
 */
export class BehavioralAnalyzer {
    private config: BehavioralAnalysisConfig;
    private actionHistory: UserAction[];
    private smoothingBuffer: EmotionalVector[];
    private readonly maxHistorySize = 1000;
    private readonly maxSmoothingSize = 10;
    
    constructor(config: Partial<BehavioralAnalysisConfig> = {}) {
        this.config = { ...DEFAULT_BEHAVIORAL_CONFIG, ...config };
        this.actionHistory = [];
        this.smoothingBuffer = [];
    }
    
    /**
     * Records a user action
     */
    recordAction(action: UserAction): void {
        this.actionHistory.push(action);
        
        // Trim history if it exceeds max size
        if (this.actionHistory.length > this.maxHistorySize) {
            this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
        }
    }
    
    /**
     * Analyzes recent behavioral patterns and generates an emotional vector
     */
    analyzeBehavior(): BehavioralAnalysisResult {
        const now = Date.now();
        const windowStart = now - this.config.timeWindow;
        
        // Filter actions within the time window
        const recentActions = this.actionHistory.filter(
            action => action.timestamp.getTime() >= windowStart
        );
        
        // Check if we have enough data
        if (recentActions.length < this.config.minActionsRequired) {
            return this.createInsufficientDataResult();
        }
        
        // Analyze typing rhythm
        const typingRhythm = this.analyzeTypingRhythm(recentActions);
        
        // Analyze code churn
        const codeChurn = this.analyzeCodeChurn(recentActions);
        
        // Generate emotional vector from behavioral patterns
        const vector = this.behaviorToEmotionalVector(typingRhythm, codeChurn);
        
        // Apply smoothing
        const smoothedVector = this.applySmoothing(vector);
        
        // Calculate confidence based on data quality
        const confidence = this.calculateConfidence(recentActions.length);
        
        return {
            vector: { ...smoothedVector, confidence },
            typingRhythm,
            codeChurn,
            confidence,
            timeWindow: this.config.timeWindow
        };
    }
    
    /**
     * Analyzes typing rhythm from user actions
     */
    private analyzeTypingRhythm(actions: UserAction[]): TypingRhythm {
        const typingActions = actions.filter(a => a.type === 'typing');
        
        if (typingActions.length === 0) {
            return {
                averageSpeed: 0,
                speedVariance: 0,
                pauseCount: 0,
                averagePauseDuration: 0,
                burstiness: 0
            };
        }
        
        // Calculate typing speeds
        const speeds: number[] = [];
        const gaps: number[] = [];
        let pauseCount = 0;
        let totalPauseDuration = 0;
        
        for (let i = 1; i < typingActions.length; i++) {
            const timeDiff = typingActions[i].timestamp.getTime() - 
                           typingActions[i - 1].timestamp.getTime();
            
            gaps.push(timeDiff);
            
            // Detect pauses
            if (timeDiff > this.config.pauseThreshold) {
                pauseCount++;
                totalPauseDuration += timeDiff;
            }
            
            // Calculate speed (characters per minute)
            const chars = typingActions[i].context?.charactersTyped || 1;
            const speed = (chars / timeDiff) * 60000; // Convert to CPM
            speeds.push(speed);
        }
        
        // Calculate average speed
        const averageSpeed = speeds.length > 0
            ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
            : 0;
        
        // Calculate speed variance
        const speedVariance = speeds.length > 0
            ? Math.sqrt(speeds.reduce((sum, s) => sum + Math.pow(s - averageSpeed, 2), 0) / speeds.length)
            : 0;
        
        // Calculate average pause duration
        const averagePauseDuration = pauseCount > 0
            ? totalPauseDuration / pauseCount
            : 0;
        
        // Calculate burstiness (ratio of variance to mean)
        const burstiness = averageSpeed > 0
            ? speedVariance / averageSpeed
            : 0;
        
        return {
            averageSpeed,
            speedVariance,
            pauseCount,
            averagePauseDuration,
            burstiness
        };
    }
    
    /**
     * Analyzes code churn from user actions
     */
    private analyzeCodeChurn(actions: UserAction[]): CodeChurnMetrics {
        let linesAdded = 0;
        let linesDeleted = 0;
        let saveCount = 0;
        let errorCount = 0;
        
        for (const action of actions) {
            if (action.type === 'save') {
                saveCount++;
                linesAdded += action.context?.linesChanged || 0;
            } else if (action.type === 'delete') {
                linesDeleted += action.context?.linesChanged || 0;
            } else if (action.type === 'error') {
                errorCount += action.context?.errorCount || 1;
            }
        }
        
        // Calculate churn rate (changes per minute)
        const timeWindowMinutes = this.config.timeWindow / 60000;
        const churnRate = (linesAdded + linesDeleted) / timeWindowMinutes;
        
        // Calculate error rate
        const errorRate = saveCount > 0 ? errorCount / saveCount : 0;
        
        return {
            linesAdded,
            linesDeleted,
            saveCount,
            errorCount,
            churnRate,
            errorRate
        };
    }
    
    /**
     * Converts behavioral patterns to emotional vector
     */
    private behaviorToEmotionalVector(
        typingRhythm: TypingRhythm,
        codeChurn: CodeChurnMetrics
    ): EmotionalVector {
        // Initialize emotional values
        let calm = 0;
        let tense = 0;
        let curious = 0;
        let excited = 0;
        let frustrated = 0;
        
        // Analyze typing rhythm patterns
        // High speed + low variance = excited/focused
        // Low speed + high variance = frustrated/struggling
        // Moderate speed + low variance = calm
        // High burstiness = tense/anxious
        
        const normalizedSpeed = Math.min(typingRhythm.averageSpeed / 300, 1); // Normalize to 300 CPM
        const normalizedVariance = Math.min(typingRhythm.speedVariance / 100, 1);
        const normalizedBurstiness = Math.min(typingRhythm.burstiness, 1);
        
        if (normalizedSpeed > 0.7 && normalizedVariance < 0.3) {
            excited += 0.6;
            calm += 0.2;
        } else if (normalizedSpeed < 0.3 && normalizedVariance > 0.5) {
            frustrated += 0.5;
            tense += 0.3;
        } else if (normalizedSpeed > 0.4 && normalizedSpeed < 0.7 && normalizedVariance < 0.4) {
            calm += 0.7;
            curious += 0.2;
        }
        
        if (normalizedBurstiness > 0.6) {
            tense += 0.4;
        }
        
        // Analyze code churn patterns
        // High churn + low errors = productive/excited
        // High churn + high errors = frustrated
        // Low churn = calm or stuck
        // Moderate churn = curious/exploring
        
        const normalizedChurn = Math.min(codeChurn.churnRate / 50, 1); // Normalize to 50 lines/min
        const normalizedErrors = Math.min(codeChurn.errorRate, 1);
        
        if (normalizedChurn > 0.6 && normalizedErrors < 0.3) {
            excited += 0.5;
            curious += 0.3;
        } else if (normalizedChurn > 0.5 && normalizedErrors > 0.5) {
            frustrated += 0.7;
            tense += 0.3;
        } else if (normalizedChurn < 0.2) {
            calm += 0.4;
        } else if (normalizedChurn > 0.2 && normalizedChurn < 0.5) {
            curious += 0.5;
            calm += 0.2;
        }
        
        // Apply weights
        const typingWeight = this.config.typingWeight;
        const churnWeight = this.config.churnWeight;
        
        // Normalize values to 0-1 range
        const normalize = (value: number) => Math.max(0, Math.min(1, value));
        
        return {
            calm: normalize(calm * typingWeight + calm * churnWeight),
            tense: normalize(tense * typingWeight + tense * churnWeight),
            curious: normalize(curious * typingWeight + curious * churnWeight),
            excited: normalize(excited * typingWeight + excited * churnWeight),
            frustrated: normalize(frustrated * typingWeight + frustrated * churnWeight),
            timestamp: new Date(),
            confidence: 0.7 // Base confidence for behavioral analysis
        };
    }
    
    /**
     * Applies weighted moving average smoothing to emotional vector
     */
    private applySmoothing(vector: EmotionalVector): EmotionalVector {
        this.smoothingBuffer.push(vector);
        
        // Trim buffer if it exceeds max size
        if (this.smoothingBuffer.length > this.maxSmoothingSize) {
            this.smoothingBuffer = this.smoothingBuffer.slice(-this.maxSmoothingSize);
        }
        
        // If we don't have enough history, return the vector as-is
        if (this.smoothingBuffer.length === 1) {
            return vector;
        }
        
        // Apply exponential weighted moving average
        const weights = this.smoothingBuffer.map((_, i) => Math.pow(0.8, this.smoothingBuffer.length - 1 - i));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        const smoothed: EmotionalVector = {
            calm: 0,
            tense: 0,
            curious: 0,
            excited: 0,
            frustrated: 0,
            timestamp: vector.timestamp,
            confidence: vector.confidence
        };
        
        for (let i = 0; i < this.smoothingBuffer.length; i++) {
            const weight = weights[i] / totalWeight;
            const v = this.smoothingBuffer[i];
            
            smoothed.calm += v.calm * weight;
            smoothed.tense += v.tense * weight;
            smoothed.curious += v.curious * weight;
            smoothed.excited += v.excited * weight;
            smoothed.frustrated += v.frustrated * weight;
        }
        
        return smoothed;
    }
    
    /**
     * Calculates confidence based on data quality
     */
    private calculateConfidence(actionCount: number): number {
        // Confidence increases with more data points
        const dataQuality = Math.min(actionCount / 20, 1); // Max confidence at 20+ actions
        return 0.5 + (dataQuality * 0.4); // Range: 0.5 to 0.9
    }
    
    /**
     * Creates a result for insufficient data
     */
    private createInsufficientDataResult(): BehavioralAnalysisResult {
        return {
            vector: {
                calm: 0.5,
                tense: 0,
                curious: 0,
                excited: 0,
                frustrated: 0,
                timestamp: new Date(),
                confidence: 0.2
            },
            typingRhythm: {
                averageSpeed: 0,
                speedVariance: 0,
                pauseCount: 0,
                averagePauseDuration: 0,
                burstiness: 0
            },
            codeChurn: {
                linesAdded: 0,
                linesDeleted: 0,
                saveCount: 0,
                errorCount: 0,
                churnRate: 0,
                errorRate: 0
            },
            confidence: 0.2,
            timeWindow: this.config.timeWindow
        };
    }
    
    /**
     * Clears the action history
     */
    clearHistory(): void {
        this.actionHistory = [];
        this.smoothingBuffer = [];
    }
    
    /**
     * Gets the current action history size
     */
    getHistorySize(): number {
        return this.actionHistory.length;
    }
    
    /**
     * Updates the configuration
     */
    updateConfig(config: Partial<BehavioralAnalysisConfig>): void {
        this.config = { ...this.config, ...config };
    }
}
