/**
 * Utility functions for emotional data validation, calculations, and state transitions
 */

import {
    EmotionalVector,
    EmotionalState,
    EmotionalHistory,
    EmotionType,
    EmotionalTrend,
    EmotionalValidationResult,
    EmotionalConfig
} from './EmotionalModels';

/**
 * Default configuration for emotional analysis
 */
export const DEFAULT_EMOTIONAL_CONFIG: EmotionalConfig = {
    sensitivity: 0.7,
    smoothingFactor: 0.3,
    confidenceThreshold: 0.6,
    trendWindow: 60000, // 1 minute
    maxHistorySize: 1000
};

/**
 * Validates an emotional vector to ensure all values are within valid ranges
 */
export function validateEmotionalVector(vector: EmotionalVector): EmotionalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if all emotion values are within 0-1 range
    const emotions = ['calm', 'tense', 'curious', 'excited', 'frustrated'] as const;
    const correctedVector: EmotionalVector = { ...vector };
    
    for (const emotion of emotions) {
        const value = vector[emotion];
        
        if (typeof value !== 'number') {
            errors.push(`${emotion} must be a number, got ${typeof value}`);
        } else if (isNaN(value)) {
            errors.push(`${emotion} is NaN`);
        } else if (value < 0) {
            errors.push(`${emotion} must be >= 0, got ${value}`);
            correctedVector[emotion] = 0;
        } else if (value > 1) {
            errors.push(`${emotion} must be <= 1, got ${value}`);
            correctedVector[emotion] = 1;
        }
    }
    
    // Check confidence
    if (typeof vector.confidence !== 'number' || isNaN(vector.confidence)) {
        errors.push('confidence must be a valid number');
    } else if (vector.confidence < 0 || vector.confidence > 1) {
        errors.push(`confidence must be between 0 and 1, got ${vector.confidence}`);
        correctedVector.confidence = Math.max(0, Math.min(1, vector.confidence));
    }
    
    // Check timestamp
    if (!(vector.timestamp instanceof Date)) {
        errors.push('timestamp must be a Date object');
    } else if (isNaN(vector.timestamp.getTime())) {
        errors.push('timestamp is an invalid Date');
    }
    
    // Warn if all emotions are zero
    const allZero = emotions.every(e => vector[e] === 0);
    if (allZero) {
        warnings.push('All emotional values are zero - this may indicate no emotional signal');
    }
    
    // Warn if confidence is very low
    if (vector.confidence < 0.3) {
        warnings.push(`Low confidence value: ${vector.confidence}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        correctedVector: errors.length > 0 ? correctedVector : undefined
    };
}

/**
 * Calculates the dominant emotion from an emotional vector
 */
export function calculateDominantEmotion(vector: EmotionalVector): { emotion: EmotionType; intensity: number } {
    const emotions: Array<{ type: EmotionType; value: number }> = [
        { type: EmotionType.CALM, value: vector.calm },
        { type: EmotionType.TENSE, value: vector.tense },
        { type: EmotionType.CURIOUS, value: vector.curious },
        { type: EmotionType.EXCITED, value: vector.excited },
        { type: EmotionType.FRUSTRATED, value: vector.frustrated }
    ];
    
    const dominant = emotions.reduce((max, current) => 
        current.value > max.value ? current : max
    );
    
    return {
        emotion: dominant.type,
        intensity: dominant.value
    };
}

/**
 * Converts an emotional vector into an emotional state
 */
export function vectorToState(
    vector: EmotionalVector,
    previousState?: EmotionalState,
    config: EmotionalConfig = DEFAULT_EMOTIONAL_CONFIG
): EmotionalState {
    const { emotion: primary, intensity } = calculateDominantEmotion(vector);
    
    // Calculate secondary emotion (second highest)
    const emotions = [
        { type: EmotionType.CALM, value: vector.calm },
        { type: EmotionType.TENSE, value: vector.tense },
        { type: EmotionType.CURIOUS, value: vector.curious },
        { type: EmotionType.EXCITED, value: vector.excited },
        { type: EmotionType.FRUSTRATED, value: vector.frustrated }
    ].sort((a, b) => b.value - a.value);
    
    const secondary = emotions[1].value > 0.3 ? emotions[1].type : undefined;
    
    // Calculate stability based on previous state
    let stability = 1.0;
    if (previousState) {
        const emotionChanged = previousState.primary !== primary;
        const intensityDelta = Math.abs(previousState.intensity - intensity);
        stability = emotionChanged ? 0.5 : Math.max(0, 1 - intensityDelta);
    }
    
    // Calculate trend
    let trend = EmotionalTrend.STABLE;
    if (previousState) {
        const intensityChange = intensity - previousState.intensity;
        if (intensityChange > 0.1) {
            trend = EmotionalTrend.RISING;
        } else if (intensityChange < -0.1) {
            trend = EmotionalTrend.FALLING;
        }
    }
    
    // Calculate duration
    const duration = previousState && previousState.primary === primary
        ? previousState.duration + (vector.timestamp.getTime() - previousState.vector.timestamp.getTime())
        : 0;
    
    return {
        primary,
        secondary,
        intensity,
        stability,
        trend,
        confidence: vector.confidence,
        duration,
        vector
    };
}

/**
 * Smooths emotional transitions using weighted moving average
 */
export function smoothEmotionalVector(
    newVector: EmotionalVector,
    previousVector: EmotionalVector,
    smoothingFactor: number = 0.3
): EmotionalVector {
    const alpha = Math.max(0, Math.min(1, smoothingFactor));
    
    return {
        calm: alpha * newVector.calm + (1 - alpha) * previousVector.calm,
        tense: alpha * newVector.tense + (1 - alpha) * previousVector.tense,
        curious: alpha * newVector.curious + (1 - alpha) * previousVector.curious,
        excited: alpha * newVector.excited + (1 - alpha) * previousVector.excited,
        frustrated: alpha * newVector.frustrated + (1 - alpha) * previousVector.frustrated,
        timestamp: newVector.timestamp,
        confidence: alpha * newVector.confidence + (1 - alpha) * previousVector.confidence
    };
}

/**
 * Calculates emotional trend over a time window
 */
export function calculateEmotionalTrend(
    vectors: EmotionalVector[],
    emotion: EmotionType,
    windowMs: number = 60000
): EmotionalTrend {
    if (vectors.length < 2) {
        return EmotionalTrend.STABLE;
    }
    
    const now = vectors[vectors.length - 1].timestamp.getTime();
    const windowStart = now - windowMs;
    
    // Filter vectors within the time window
    const recentVectors = vectors.filter(v => v.timestamp.getTime() >= windowStart);
    
    if (recentVectors.length < 2) {
        return EmotionalTrend.STABLE;
    }
    
    // Calculate linear regression slope
    const values = recentVectors.map(v => v[emotion]);
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
        const xDiff = i - xMean;
        const yDiff = values[i] - yMean;
        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Determine trend based on slope
    if (slope > 0.01) {
        return EmotionalTrend.RISING;
    } else if (slope < -0.01) {
        return EmotionalTrend.FALLING;
    } else {
        return EmotionalTrend.STABLE;
    }
}

/**
 * Creates an emotional history summary from a collection of vectors
 */
export function createEmotionalHistory(
    vectors: EmotionalVector[],
    startTime: Date,
    endTime: Date,
    id: string = generateHistoryId()
): EmotionalHistory {
    if (vectors.length === 0) {
        return {
            id,
            startTime,
            endTime,
            vectors: [],
            states: [],
            dominantEmotion: EmotionType.CALM,
            averageIntensity: 0,
            transitionCount: 0
        };
    }
    
    // Convert vectors to states
    const states: EmotionalState[] = [];
    let previousState: EmotionalState | undefined;
    
    for (const vector of vectors) {
        const state = vectorToState(vector, previousState);
        states.push(state);
        previousState = state;
    }
    
    // Calculate dominant emotion
    const emotionCounts = new Map<EmotionType, number>();
    for (const state of states) {
        emotionCounts.set(state.primary, (emotionCounts.get(state.primary) || 0) + 1);
    }
    
    let dominantEmotion = EmotionType.CALM;
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantEmotion = emotion;
        }
    }
    
    // Calculate average intensity
    const averageIntensity = states.reduce((sum, state) => sum + state.intensity, 0) / states.length;
    
    // Count transitions
    let transitionCount = 0;
    for (let i = 1; i < states.length; i++) {
        if (states[i].primary !== states[i - 1].primary) {
            transitionCount++;
        }
    }
    
    // Find most stable period
    let mostStablePeriod: EmotionalHistory['mostStablePeriod'];
    let currentPeriodStart = 0;
    let longestPeriodLength = 0;
    
    for (let i = 1; i < states.length; i++) {
        if (states[i].primary !== states[i - 1].primary) {
            const periodLength = i - currentPeriodStart;
            if (periodLength > longestPeriodLength) {
                longestPeriodLength = periodLength;
                const periodStates = states.slice(currentPeriodStart, i);
                const avgStability = periodStates.reduce((sum, s) => sum + s.stability, 0) / periodStates.length;
                
                mostStablePeriod = {
                    emotion: states[currentPeriodStart].primary,
                    startTime: vectors[currentPeriodStart].timestamp,
                    endTime: vectors[i - 1].timestamp,
                    stability: avgStability
                };
            }
            currentPeriodStart = i;
        }
    }
    
    return {
        id,
        startTime,
        endTime,
        vectors,
        states,
        dominantEmotion,
        averageIntensity,
        transitionCount,
        mostStablePeriod
    };
}

/**
 * Generates a unique ID for emotional history
 */
function generateHistoryId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalizes an emotional vector to ensure the sum of emotions doesn't exceed reasonable bounds
 */
export function normalizeEmotionalVector(vector: EmotionalVector): EmotionalVector {
    const emotions = [vector.calm, vector.tense, vector.curious, vector.excited, vector.frustrated];
    const sum = emotions.reduce((a, b) => a + b, 0);
    
    // If sum is reasonable (< 2.0), no normalization needed
    if (sum <= 2.0) {
        return vector;
    }
    
    // Normalize by scaling down proportionally
    const scale = 2.0 / sum;
    
    return {
        calm: vector.calm * scale,
        tense: vector.tense * scale,
        curious: vector.curious * scale,
        excited: vector.excited * scale,
        frustrated: vector.frustrated * scale,
        timestamp: vector.timestamp,
        confidence: vector.confidence
    };
}
