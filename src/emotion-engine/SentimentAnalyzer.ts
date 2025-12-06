/**
 * Sentiment Analysis Module for MirrorCanvas Emotion Engine
 * Integrates with HuggingFace sentiment models to analyze text and generate emotional vectors
 */

import { HfInference } from '@huggingface/inference';
import { EmotionalVector, EmotionType } from '../models/EmotionalModels';

/**
 * Configuration for sentiment analysis
 */
export interface SentimentAnalysisConfig {
    /** HuggingFace API token (optional for public models) */
    apiToken?: string;
    
    /** Model to use for sentiment analysis */
    model: string;
    
    /** Timeout for API requests in milliseconds */
    timeout: number;
    
    /** Whether to use cached results */
    useCache: boolean;
    
    /** Minimum confidence threshold for results */
    minConfidence: number;
}

/**
 * Raw sentiment result from HuggingFace API
 */
export interface SentimentResult {
    label: string;
    score: number;
}

/**
 * Result of sentiment analysis with emotional vector
 */
export interface SentimentAnalysisResult {
    /** Generated emotional vector */
    vector: EmotionalVector;
    
    /** Raw sentiment scores from the model */
    rawScores: SentimentResult[];
    
    /** Overall confidence of the analysis */
    confidence: number;
    
    /** Whether the analysis succeeded */
    success: boolean;
    
    /** Error message if analysis failed */
    error?: string;
}

/**
 * Default configuration for sentiment analysis
 */
export const DEFAULT_SENTIMENT_CONFIG: SentimentAnalysisConfig = {
    model: 'distilbert-base-uncased-finetuned-sst-2-english',
    timeout: 5000,
    useCache: true,
    minConfidence: 0.5
};

/**
 * SentimentAnalyzer class for analyzing text and generating emotional vectors
 */
export class SentimentAnalyzer {
    private hf: HfInference;
    private config: SentimentAnalysisConfig;
    private cache: Map<string, SentimentAnalysisResult>;
    
    constructor(config: Partial<SentimentAnalysisConfig> = {}) {
        this.config = { ...DEFAULT_SENTIMENT_CONFIG, ...config };
        this.hf = new HfInference(this.config.apiToken);
        this.cache = new Map();
    }
    
    /**
     * Analyzes text input and generates an emotional vector
     */
    async analyzeText(text: string): Promise<SentimentAnalysisResult> {
        // Handle empty or whitespace-only text
        if (!text || text.trim().length === 0) {
            return this.createNeutralResult('Empty or whitespace-only text');
        }
        
        // Check cache if enabled
        if (this.config.useCache && this.cache.has(text)) {
            const cached = this.cache.get(text)!;
            return cached;
        }
        
        try {
            // Call HuggingFace sentiment analysis
            const result = await Promise.race([
                this.performSentimentAnalysis(text),
                this.createTimeoutPromise()
            ]);
            
            // Convert sentiment to emotional vector
            const analysisResult = this.sentimentToEmotionalVector(result as SentimentResult[]);
            
            // Cache the result
            if (this.config.useCache) {
                this.cache.set(text, analysisResult);
            }
            
            return analysisResult;
            
        } catch (error) {
            return this.handleAnalysisError(error);
        }
    }
    
    /**
     * Performs the actual sentiment analysis using HuggingFace
     */
    private async performSentimentAnalysis(text: string): Promise<SentimentResult[]> {
        const response = await this.hf.textClassification({
            model: this.config.model,
            inputs: text
        });
        
        // Handle both single result and array of results
        const results = Array.isArray(response) ? response : [response];
        
        return results.map(r => ({
            label: r.label.toLowerCase(),
            score: r.score
        }));
    }
    
    /**
     * Creates a timeout promise for API requests
     */
    private createTimeoutPromise(): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Sentiment analysis timeout after ${this.config.timeout}ms`));
            }, this.config.timeout);
        });
    }
    
    /**
     * Converts sentiment analysis results to emotional vector
     */
    private sentimentToEmotionalVector(sentiments: SentimentResult[]): SentimentAnalysisResult {
        // Initialize emotional values
        let calm = 0;
        let tense = 0;
        let curious = 0;
        let excited = 0;
        let frustrated = 0;
        let totalConfidence = 0;
        
        // Map sentiment labels to emotional dimensions
        for (const sentiment of sentiments) {
            const label = sentiment.label.toLowerCase();
            const score = sentiment.score;
            
            totalConfidence += score;
            
            // Map common sentiment labels to emotions
            if (label.includes('positive') || label.includes('joy') || label.includes('happy')) {
                calm += score * 0.6;
                excited += score * 0.4;
            } else if (label.includes('negative') || label.includes('sad') || label.includes('anger')) {
                frustrated += score * 0.5;
                tense += score * 0.5;
            } else if (label.includes('neutral')) {
                calm += score * 0.7;
                curious += score * 0.3;
            } else if (label.includes('fear') || label.includes('anxiety')) {
                tense += score * 0.8;
                frustrated += score * 0.2;
            } else if (label.includes('surprise') || label.includes('interest')) {
                curious += score * 0.6;
                excited += score * 0.4;
            } else {
                // Default mapping for unknown labels
                calm += score * 0.5;
            }
        }
        
        // Normalize confidence
        const confidence = sentiments.length > 0 
            ? totalConfidence / sentiments.length 
            : 0;
        
        // Ensure values are in 0-1 range
        const normalize = (value: number) => Math.max(0, Math.min(1, value));
        
        const vector: EmotionalVector = {
            calm: normalize(calm),
            tense: normalize(tense),
            curious: normalize(curious),
            excited: normalize(excited),
            frustrated: normalize(frustrated),
            timestamp: new Date(),
            confidence: normalize(confidence)
        };
        
        return {
            vector,
            rawScores: sentiments,
            confidence: normalize(confidence),
            success: true
        };
    }
    
    /**
     * Creates a neutral emotional result for edge cases
     */
    private createNeutralResult(reason: string): SentimentAnalysisResult {
        return {
            vector: {
                calm: 0.5,
                tense: 0,
                curious: 0,
                excited: 0,
                frustrated: 0,
                timestamp: new Date(),
                confidence: 0.3
            },
            rawScores: [],
            confidence: 0.3,
            success: true,
            error: reason
        };
    }
    
    /**
     * Handles errors during sentiment analysis
     */
    private handleAnalysisError(error: unknown): SentimentAnalysisResult {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
            vector: {
                calm: 0.5,
                tense: 0,
                curious: 0,
                excited: 0,
                frustrated: 0,
                timestamp: new Date(),
                confidence: 0
            },
            rawScores: [],
            confidence: 0,
            success: false,
            error: errorMessage
        };
    }
    
    /**
     * Clears the analysis cache
     */
    clearCache(): void {
        this.cache.clear();
    }
    
    /**
     * Gets the current cache size
     */
    getCacheSize(): number {
        return this.cache.size;
    }
    
    /**
     * Updates the configuration
     */
    updateConfig(config: Partial<SentimentAnalysisConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Recreate HuggingFace client if API token changed
        if (config.apiToken !== undefined) {
            this.hf = new HfInference(this.config.apiToken);
        }
    }
}
