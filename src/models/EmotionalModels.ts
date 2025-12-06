/**
 * Core emotional data models and interfaces for MirrorCanvas
 */

/**
 * Represents the five primary emotional dimensions tracked by MirrorCanvas
 */
export interface EmotionalVector {
    /** Calm state: peaceful, relaxed, focused (0-1 scale) */
    calm: number;
    
    /** Tense state: stressed, anxious, under pressure (0-1 scale) */
    tense: number;
    
    /** Curious state: exploring, learning, investigating (0-1 scale) */
    curious: number;
    
    /** Excited state: energetic, enthusiastic, motivated (0-1 scale) */
    excited: number;
    
    /** Frustrated state: blocked, annoyed, struggling (0-1 scale) */
    frustrated: number;
    
    /** Timestamp when this emotional vector was recorded */
    timestamp: Date;
    
    /** Confidence level of the emotional analysis (0-1 scale) */
    confidence: number;
}

/**
 * Represents the current emotional state derived from emotional vectors
 */
export interface EmotionalState {
    /** Primary dominant emotion type */
    primary: EmotionType;
    
    /** Secondary emotion if present */
    secondary?: EmotionType;
    
    /** Overall intensity of the emotional state (0-1 scale) */
    intensity: number;
    
    /** How stable/consistent the emotion has been (0-1 scale) */
    stability: number;
    
    /** Current trend direction of the emotional state */
    trend: EmotionalTrend;
    
    /** Confidence level of the state analysis (0-1 scale) */
    confidence: number;
    
    /** Duration this state has been active (in milliseconds) */
    duration: number;
    
    /** Raw emotional vector that generated this state */
    vector: EmotionalVector;
}

/**
 * Enumeration of the five core emotion types
 */
export enum EmotionType {
    CALM = 'calm',
    TENSE = 'tense',
    CURIOUS = 'curious',
    EXCITED = 'excited',
    FRUSTRATED = 'frustrated'
}

/**
 * Trend direction for emotional states
 */
export enum EmotionalTrend {
    RISING = 'rising',
    FALLING = 'falling',
    STABLE = 'stable'
}

/**
 * Historical collection of emotional data over time
 */
export interface EmotionalHistory {
    /** Unique identifier for this history collection */
    id: string;
    
    /** Start time of the history period */
    startTime: Date;
    
    /** End time of the history period */
    endTime: Date;
    
    /** Array of emotional vectors in chronological order */
    vectors: EmotionalVector[];
    
    /** Array of emotional states in chronological order */
    states: EmotionalState[];
    
    /** Dominant emotion over this period */
    dominantEmotion: EmotionType;
    
    /** Average intensity over this period */
    averageIntensity: number;
    
    /** Number of emotional transitions in this period */
    transitionCount: number;
    
    /** Most stable emotional period within this history */
    mostStablePeriod?: {
        emotion: EmotionType;
        startTime: Date;
        endTime: Date;
        stability: number;
    };
}

/**
 * Configuration for emotional analysis parameters
 */
export interface EmotionalConfig {
    /** Sensitivity of emotion detection (0.1 = low, 1.0 = high) */
    sensitivity: number;
    
    /** Smoothing factor for emotional transitions (0.1 = smooth, 1.0 = reactive) */
    smoothingFactor: number;
    
    /** Minimum confidence threshold for state changes */
    confidenceThreshold: number;
    
    /** Time window for calculating emotional trends (in milliseconds) */
    trendWindow: number;
    
    /** Maximum history size to keep in memory */
    maxHistorySize: number;
}

/**
 * Result of emotional analysis validation
 */
export interface EmotionalValidationResult {
    /** Whether the emotional data is valid */
    isValid: boolean;
    
    /** Array of validation errors if any */
    errors: string[];
    
    /** Array of validation warnings if any */
    warnings: string[];
    
    /** Corrected emotional vector if corrections were applied */
    correctedVector?: EmotionalVector;
}