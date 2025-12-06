/**
 * Emotional State Management System for MirrorCanvas Emotion Engine
 * Manages emotional state transitions, history tracking, and trend analysis
 */

import {
    EmotionalVector,
    EmotionalState,
    EmotionalHistory,
    EmotionType,
    EmotionalTrend,
    EmotionalConfig
} from '../models/EmotionalModels';
import {
    validateEmotionalVector,
    vectorToState,
    smoothEmotionalVector,
    calculateEmotionalTrend,
    createEmotionalHistory,
    DEFAULT_EMOTIONAL_CONFIG
} from '../models/EmotionalUtils';

/**
 * Circular buffer for storing recent emotional history
 */
class CircularBuffer<T> {
    private buffer: T[];
    private capacity: number;
    private writeIndex: number;
    private size: number;
    
    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
        this.writeIndex = 0;
        this.size = 0;
    }
    
    /**
     * Adds an item to the buffer
     */
    push(item: T): void {
        this.buffer[this.writeIndex] = item;
        this.writeIndex = (this.writeIndex + 1) % this.capacity;
        this.size = Math.min(this.size + 1, this.capacity);
    }
    
    /**
     * Gets all items in chronological order
     */
    getAll(): T[] {
        if (this.size < this.capacity) {
            return this.buffer.slice(0, this.size);
        }
        
        // Return items in chronological order
        return [
            ...this.buffer.slice(this.writeIndex),
            ...this.buffer.slice(0, this.writeIndex)
        ];
    }
    
    /**
     * Gets the most recent item
     */
    getLast(): T | undefined {
        if (this.size === 0) {
            return undefined;
        }
        
        const lastIndex = (this.writeIndex - 1 + this.capacity) % this.capacity;
        return this.buffer[lastIndex];
    }
    
    /**
     * Gets the current size
     */
    getSize(): number {
        return this.size;
    }
    
    /**
     * Clears the buffer
     */
    clear(): void {
        this.buffer = new Array(this.capacity);
        this.writeIndex = 0;
        this.size = 0;
    }
}

/**
 * State transition event
 */
export interface StateTransitionEvent {
    /** Previous emotional state */
    previousState: EmotionalState;
    
    /** New emotional state */
    newState: EmotionalState;
    
    /** Timestamp of the transition */
    timestamp: Date;
    
    /** Reason for the transition */
    reason: string;
}

/**
 * Emotional state manager configuration
 */
export interface StateManagerConfig extends EmotionalConfig {
    /** Size of the circular buffer for recent history */
    bufferSize: number;
    
    /** Whether to enable automatic state transitions */
    autoTransition: boolean;
    
    /** Minimum time between state transitions (in milliseconds) */
    minTransitionInterval: number;
}

/**
 * Default configuration for state manager
 */
export const DEFAULT_STATE_MANAGER_CONFIG: StateManagerConfig = {
    ...DEFAULT_EMOTIONAL_CONFIG,
    bufferSize: 100,
    autoTransition: true,
    minTransitionInterval: 5000 // 5 seconds
};

/**
 * EmotionalStateManager class for managing emotional states and transitions
 */
export class EmotionalStateManager {
    private config: StateManagerConfig;
    private currentState: EmotionalState | null;
    private vectorBuffer: CircularBuffer<EmotionalVector>;
    private stateBuffer: CircularBuffer<EmotionalState>;
    private transitionHistory: StateTransitionEvent[];
    private lastTransitionTime: number;
    private sessionStartTime: Date;
    
    constructor(config: Partial<StateManagerConfig> = {}) {
        this.config = { ...DEFAULT_STATE_MANAGER_CONFIG, ...config };
        this.currentState = null;
        this.vectorBuffer = new CircularBuffer<EmotionalVector>(this.config.bufferSize);
        this.stateBuffer = new CircularBuffer<EmotionalState>(this.config.bufferSize);
        this.transitionHistory = [];
        this.lastTransitionTime = 0;
        this.sessionStartTime = new Date();
    }
    
    /**
     * Updates the emotional state with a new vector
     */
    updateState(vector: EmotionalVector): EmotionalState {
        // Validate the vector
        const validation = validateEmotionalVector(vector);
        
        if (!validation.isValid) {
            throw new Error(`Invalid emotional vector: ${validation.errors.join(', ')}`);
        }
        
        // Use corrected vector if validation made corrections
        const validVector = validation.correctedVector || vector;
        
        // Apply smoothing if we have previous vectors
        const previousVector = this.vectorBuffer.getLast();
        const smoothedVector = previousVector
            ? smoothEmotionalVector(validVector, previousVector, this.config.smoothingFactor)
            : validVector;
        
        // Store the vector in the buffer
        this.vectorBuffer.push(smoothedVector);
        
        // Convert vector to state
        const newState = vectorToState(smoothedVector, this.currentState || undefined, this.config);
        
        // Check if we should transition to the new state
        if (this.shouldTransition(newState)) {
            this.transitionToState(newState, 'Emotional vector update');
        }
        
        return this.currentState!;
    }
    
    /**
     * Determines if a state transition should occur
     */
    private shouldTransition(newState: EmotionalState): boolean {
        // Always transition if no current state
        if (!this.currentState) {
            return true;
        }
        
        // Check if auto-transition is disabled
        if (!this.config.autoTransition) {
            return false;
        }
        
        // Check minimum transition interval
        const now = Date.now();
        if (now - this.lastTransitionTime < this.config.minTransitionInterval) {
            return false;
        }
        
        // Check if the primary emotion has changed
        if (newState.primary !== this.currentState.primary) {
            return true;
        }
        
        // Check if intensity has changed significantly
        const intensityDelta = Math.abs(newState.intensity - this.currentState.intensity);
        if (intensityDelta > 0.3) {
            return true;
        }
        
        // Check confidence threshold
        if (newState.confidence < this.config.confidenceThreshold) {
            return false;
        }
        
        return false;
    }
    
    /**
     * Transitions to a new emotional state
     */
    private transitionToState(newState: EmotionalState, reason: string): void {
        const previousState = this.currentState;
        
        // Record the transition
        if (previousState) {
            const transitionEvent: StateTransitionEvent = {
                previousState,
                newState,
                timestamp: new Date(),
                reason
            };
            
            this.transitionHistory.push(transitionEvent);
            
            // Trim transition history if it gets too large
            if (this.transitionHistory.length > 100) {
                this.transitionHistory = this.transitionHistory.slice(-100);
            }
        }
        
        // Update current state
        this.currentState = newState;
        this.stateBuffer.push(newState);
        this.lastTransitionTime = Date.now();
    }
    
    /**
     * Forces a state transition (bypasses auto-transition checks)
     */
    forceTransition(vector: EmotionalVector, reason: string = 'Manual transition'): EmotionalState {
        const validation = validateEmotionalVector(vector);
        
        if (!validation.isValid) {
            throw new Error(`Invalid emotional vector: ${validation.errors.join(', ')}`);
        }
        
        const validVector = validation.correctedVector || vector;
        this.vectorBuffer.push(validVector);
        
        const newState = vectorToState(validVector, this.currentState || undefined, this.config);
        this.transitionToState(newState, reason);
        
        return this.currentState!;
    }
    
    /**
     * Gets the current emotional state
     */
    getCurrentState(): EmotionalState | null {
        return this.currentState;
    }
    
    /**
     * Gets recent emotional vectors
     */
    getRecentVectors(count?: number): EmotionalVector[] {
        const allVectors = this.vectorBuffer.getAll();
        
        if (count === undefined) {
            return allVectors;
        }
        
        return allVectors.slice(-count);
    }
    
    /**
     * Gets recent emotional states
     */
    getRecentStates(count?: number): EmotionalState[] {
        const allStates = this.stateBuffer.getAll();
        
        if (count === undefined) {
            return allStates;
        }
        
        return allStates.slice(-count);
    }
    
    /**
     * Gets the emotional trend for a specific emotion
     */
    getEmotionalTrend(emotion: EmotionType): EmotionalTrend {
        const vectors = this.vectorBuffer.getAll();
        
        if (vectors.length < 2) {
            return EmotionalTrend.STABLE;
        }
        
        return calculateEmotionalTrend(vectors, emotion, this.config.trendWindow);
    }
    
    /**
     * Gets trends for all emotions
     */
    getAllEmotionalTrends(): Record<EmotionType, EmotionalTrend> {
        return {
            [EmotionType.CALM]: this.getEmotionalTrend(EmotionType.CALM),
            [EmotionType.TENSE]: this.getEmotionalTrend(EmotionType.TENSE),
            [EmotionType.CURIOUS]: this.getEmotionalTrend(EmotionType.CURIOUS),
            [EmotionType.EXCITED]: this.getEmotionalTrend(EmotionType.EXCITED),
            [EmotionType.FRUSTRATED]: this.getEmotionalTrend(EmotionType.FRUSTRATED)
        };
    }
    
    /**
     * Gets the transition history
     */
    getTransitionHistory(): StateTransitionEvent[] {
        return [...this.transitionHistory];
    }
    
    /**
     * Creates an emotional history summary for the current session
     */
    createSessionHistory(): EmotionalHistory {
        const vectors = this.vectorBuffer.getAll();
        const now = new Date();
        
        return createEmotionalHistory(
            vectors,
            this.sessionStartTime,
            now,
            `session_${this.sessionStartTime.getTime()}`
        );
    }
    
    /**
     * Creates an emotional history summary for a specific time range
     */
    createHistoryForTimeRange(startTime: Date, endTime: Date): EmotionalHistory {
        const allVectors = this.vectorBuffer.getAll();
        
        // Filter vectors within the time range
        const vectors = allVectors.filter(v => 
            v.timestamp >= startTime && v.timestamp <= endTime
        );
        
        return createEmotionalHistory(
            vectors,
            startTime,
            endTime,
            `history_${startTime.getTime()}_${endTime.getTime()}`
        );
    }
    
    /**
     * Gets statistics about the current emotional state
     */
    getStateStatistics(): {
        totalVectors: number;
        totalStates: number;
        totalTransitions: number;
        sessionDuration: number;
        averageConfidence: number;
        dominantEmotion: EmotionType | null;
    } {
        const vectors = this.vectorBuffer.getAll();
        const states = this.stateBuffer.getAll();
        
        // Calculate average confidence
        const averageConfidence = vectors.length > 0
            ? vectors.reduce((sum, v) => sum + v.confidence, 0) / vectors.length
            : 0;
        
        // Calculate dominant emotion
        let dominantEmotion: EmotionType | null = null;
        if (states.length > 0) {
            const emotionCounts = new Map<EmotionType, number>();
            
            for (const state of states) {
                emotionCounts.set(state.primary, (emotionCounts.get(state.primary) || 0) + 1);
            }
            
            let maxCount = 0;
            for (const [emotion, count] of emotionCounts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantEmotion = emotion;
                }
            }
        }
        
        return {
            totalVectors: vectors.length,
            totalStates: states.length,
            totalTransitions: this.transitionHistory.length,
            sessionDuration: Date.now() - this.sessionStartTime.getTime(),
            averageConfidence,
            dominantEmotion
        };
    }
    
    /**
     * Resets the state manager (clears all history)
     */
    reset(): void {
        this.currentState = null;
        this.vectorBuffer.clear();
        this.stateBuffer.clear();
        this.transitionHistory = [];
        this.lastTransitionTime = 0;
        this.sessionStartTime = new Date();
    }
    
    /**
     * Updates the configuration
     */
    updateConfig(config: Partial<StateManagerConfig>): void {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * Gets the current configuration
     */
    getConfig(): StateManagerConfig {
        return { ...this.config };
    }
}
