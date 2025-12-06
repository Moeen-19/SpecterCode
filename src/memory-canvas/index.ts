/**
 * Memory Canvas module exports
 * Persistent emotional history and long-term visual evolution
 */

export { MemoryCanvas, MemoryCanvasConfig, TimePeriod, EmotionalTrends, VisualEvolution } from './MemoryCanvas';
export { EmotionalDataAccess, StoredEmotionalSession, QueryOptions } from './EmotionalDataAccess';
export { 
    createDatabase, 
    closeDatabase, 
    initializeSchema, 
    getSchemaVersion, 
    migrateSchema,
    DatabaseConfig,
    SCHEMA_VERSION 
} from './DatabaseSchema';
export {
    TrendAnalyzer,
    EmotionalPattern,
    DetectedPattern,
    SessionSummary,
    HistoricalInfluence
} from './TrendAnalyzer';
export {
    BackgroundEvolutionGenerator,
    VisualEvolutionState,
    VisualTransition,
    ProceduralTexture,
    TextureType,
    BlendMode,
    EasingFunction
} from './BackgroundEvolution';
