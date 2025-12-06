/**
 * Emotion Engine module exports
 */

export { EmotionEngine, EmotionEngineConfig } from './EmotionEngine';
export { 
    SentimentAnalyzer, 
    SentimentAnalysisConfig, 
    SentimentAnalysisResult,
    SentimentResult,
    DEFAULT_SENTIMENT_CONFIG
} from './SentimentAnalyzer';
export { 
    BehavioralAnalyzer, 
    BehavioralAnalysisConfig,
    BehavioralAnalysisResult,
    UserAction,
    TypingRhythm,
    CodeChurnMetrics,
    DEFAULT_BEHAVIORAL_CONFIG
} from './BehavioralAnalyzer';
export { 
    EmotionalStateManager, 
    StateManagerConfig,
    StateTransitionEvent,
    DEFAULT_STATE_MANAGER_CONFIG
} from './EmotionalStateManager';
