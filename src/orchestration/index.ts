/**
 * MCP Orchestration Layer
 * Event-driven architecture for component coordination
 */

export { EventBus, EventHandler, EventSubscription, EventBusConfig } from './EventBus';
export { StateManager, StateChangeListener, StateValidationResult, StateSnapshot, StateManagerConfig } from './StateManager';
export { EventRouter, ComponentId, EventRoutingRule, RoutingStatistics, EventRouterConfig } from './EventRouter';
export { ActionCapture, ActionCaptureConfig, CaptureStatistics, ActionCallback } from './ActionCapture';
export { ActionProcessor, ActionProcessingRule, ActionProcessorConfig, ProcessingStatistics } from './ActionProcessor';
export { StateConflictResolver, StateUpdateRequest, ConflictResolutionStrategy, ConflictResolutionResult, ConflictResolverConfig } from './StateConflictResolver';
export { StatePersistence, PersistenceConfig, PersistedState, PersistedStateMetadata, RecoveryResult } from './StatePersistence';
export { MCPOrchestrator, IMirrorCanvasComponent, MCPOrchestratorConfig } from './MCPOrchestrator';
