/**
 * Main Emotion Engine for MirrorCanvas
 * Integrates sentiment analysis, behavioral analysis, and state management
 */

import { EmotionalVector, EmotionalState, EmotionalHistory, EmotionType } from '../models/EmotionalModels';
import { SentimentAnalyzer, SentimentAnalysisConfig } from './SentimentAnalyzer';
import { BehavioralAnalyzer, BehavioralAnalysisConfig, UserAction } from './BehavioralAnalyzer';
import { EmotionalStateManager, StateManagerConfig } from './EmotionalStateManager';

/**
 * Configuration for the Emotion Engine
 */
export interface EmotionEngineConfig {
    /** Configuration for sentiment analysis */
    sentiment?: Partial<SentimentAnalysisConfig>;
    
    /** Configuration for behavioral analysis */
    behavioral?: Partial<BehavioralAnalysisConfig>;
    
    /** Configuration for state management */
    stateManager?: Partial<StateManagerConfig>;
    
    /** Weight for sentiment analysis in combined emotional vector (0-1) */
    sentimentWeight?: number;
    
    /** Weight for behavioral analysis in combined emotional vector (0-1) */
    behavioralWeight?: number;
}

/**
 * Main Emotion Engine class
 */
export class EmotionEngine {
    private sentimentAnalyzer: SentimentAnalyzer;
    private behavioralAnalyzer: BehavioralAnalyzer;
    private stateManager: EmotionalStateManager;
    private sentimentWeight: number;
    private behavioralWeight: number;
    
    constructor(config: EmotionEngineConfig = {}) {
        this.sentimentAnalyzer = new SentimentAnalyzer(config.sentiment);
        this.behavioralAnalyzer = new BehavioralAnalyzer(config.behavioral);
        this.stateManager = new EmotionalStateManager(config.stateManager);
        
        this.sentimentWeight = config.sentimentWeight ?? 0.5;
        this.behavioralWeight = config.behavioralWeight ?? 0.5;
        
        // Normalize weights
        const totalWeight = this.sentimentWeight + this.behavioralWeight;
        if (totalWeight > 0) {
            this.sentimentWeight /= totalWeight;
            this.behavioralWeight /= totalWeight;
        }
    }
    
    /**
     * Analyzes text input and updates emotional state
     */
    async analyzeText(text: string): Promise<EmotionalState> {
        const result = await this.sentimentAnalyzer.analyzeText(text);
        
        if (!result.success) {
            throw new Error(`Sentiment analysis failed: ${result.error}`);
        }
        
        // Update state with sentiment vector
        return this.stateManager.updateState(result.vector);
    }
    
    /**
     * Records a user action for behavioral analysis
     */
    recordAction(action: UserAction): void {
        this.behavioralAnalyzer.recordAction(action);
    }
    
    /**
     * Analyzes behavioral patterns and updates emotional state
     */
    analyzeBehavior(): EmotionalState {
        const result = this.behavioralAnalyzer.analyzeBehavior();
        return this.stateManager.updateState(result.vector);
    }
    
    /**
     * Combines sentiment and behavioral analysis for comprehensive emotional state
     */
    async analyzeComprehensive(text?: string): Promise<EmotionalState> {
        let sentimentVector: EmotionalVector | null = null;
        let behavioralVector: EmotionalVector | null = null;
        
        // Perform sentiment analysis if text is provided
        if (text && text.trim().length > 0) {
            const sentimentResult = await this.sentimentAnalyzer.analyzeText(text);
            if (sentimentResult.success) {
                sentimentVector = sentimentResult.vector;
            }
        }
        
        // Perform behavioral analysis
        const behavioralResult = this.behavioralAnalyzer.analyzeBehavior();
        behavioralVector = behavioralResult.vector;
        
        // Combine vectors
        const combinedVector = this.combineVectors(sentimentVector, behavioralVector);
        
        // Update state with combined vector
        return this.stateManager.updateState(combinedVector);
    }
    
    /**
     * Combines sentiment and behavioral vectors into a single emotional vector
     */
    private combineVectors(
        sentimentVector: EmotionalVector | null,
        behavioralVector: EmotionalVector | null
    ): EmotionalVector {
        // If only one vector is available, use it
        if (!sentimentVector && behavioralVector) {
            return behavioralVector;
        }
        if (sentimentVector && !behavioralVector) {
            return sentimentVector;
        }
        if (!sentimentVector && !behavioralVector) {
            // Return neutral vector
            return {
                calm: 0.5,
                tense: 0,
                curious: 0,
                excited: 0,
                frustrated: 0,
                timestamp: new Date(),
                confidence: 0.3
            };
        }
        
        // Combine both vectors with weights
        const s = sentimentVector!;
        const b = behavioralVector!;
        
        return {
            calm: s.calm * this.sentimentWeight + b.calm * this.behavioralWeight,
            tense: s.tense * this.sentimentWeight + b.tense * this.behavioralWeight,
            curious: s.curious * this.sentimentWeight + b.curious * this.behavioralWeight,
            excited: s.excited * this.sentimentWeight + b.excited * this.behavioralWeight,
            frustrated: s.frustrated * this.sentimentWeight + b.frustrated * this.behavioralWeight,
            timestamp: new Date(),
            confidence: (s.confidence * this.sentimentWeight + b.confidence * this.behavioralWeight)
        };
    }
    
    /**
     * Gets the current emotional state
     */
    getCurrentState(): EmotionalState | null {
        return this.stateManager.getCurrentState();
    }
    
    /**
     * Gets recent emotional history
     */
    getEmotionalHistory(count?: number): EmotionalVector[] {
        return this.stateManager.getRecentVectors(count);
    }
    
    /**
     * Creates a session history summary
     */
    createSessionHistory(): EmotionalHistory {
        return this.stateManager.createSessionHistory();
    }
    
    /**
     * Gets emotional trends for all emotions
     */
    getEmotionalTrends(): Record<EmotionType, string> {
        return this.stateManager.getAllEmotionalTrends();
    }
    
    /**
     * Gets state statistics
     */
    getStatistics() {
        return this.stateManager.getStateStatistics();
    }
    
    /**
     * Resets the emotion engine
     */
    reset(): void {
        this.sentimentAnalyzer.clearCache();
        this.behavioralAnalyzer.clearHistory();
        this.stateManager.reset();
    }
    
    /**
     * Updates the engine configuration
     */
    updateConfig(config: EmotionEngineConfig): void {
        if (config.sentiment) {
            this.sentimentAnalyzer.updateConfig(config.sentiment);
        }
        if (config.behavioral) {
            this.behavioralAnalyzer.updateConfig(config.behavioral);
        }
        if (config.stateManager) {
            this.stateManager.updateConfig(config.stateManager);
        }
        if (config.sentimentWeight !== undefined || config.behavioralWeight !== undefined) {
            this.sentimentWeight = config.sentimentWeight ?? this.sentimentWeight;
            this.behavioralWeight = config.behavioralWeight ?? this.behavioralWeight;
            
            // Normalize weights
            const totalWeight = this.sentimentWeight + this.behavioralWeight;
            if (totalWeight > 0) {
                this.sentimentWeight /= totalWeight;
                this.behavioralWeight /= totalWeight;
            }
        }
    }
}
