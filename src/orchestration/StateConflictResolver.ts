/**
 * StateConflictResolver - Resolves conflicts when multiple components
 * attempt to update the same state simultaneously
 */

import { SystemState, ComponentStates, PersonaType } from '../models/SystemModels';
import { EmotionalState, EmotionType } from '../models/EmotionalModels';
import { ThemeSpec } from '../models/ThemeModels';

/**
 * State update request from a component
 */
export interface StateUpdateRequest {
    /** Component making the request */
    component: keyof ComponentStates | 'orchestrator';
    
    /** Timestamp of the request */
    timestamp: Date;
    
    /** Priority of the request (higher = more important) */
    priority: number;
    
    /** Partial state update */
    update: Partial<SystemState>;
    
    /** Reason for the update */
    reason: string;
    
    /** Whether this update can be merged with others */
    mergeable: boolean;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
    /** Use the update with highest priority */
    PRIORITY = 'priority',
    
    /** Use the most recent update */
    TIMESTAMP = 'timestamp',
    
    /** Merge all updates intelligently */
    MERGE = 'merge',
    
    /** Use custom resolution function */
    CUSTOM = 'custom'
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
    /** Resolved state update */
    resolvedUpdate: Partial<SystemState>;
    
    /** Strategy used for resolution */
    strategy: ConflictResolutionStrategy;
    
    /** Requests that were merged */
    mergedRequests: StateUpdateRequest[];
    
    /** Requests that were rejected */
    rejectedRequests: StateUpdateRequest[];
    
    /** Resolution reason */
    reason: string;
}

/**
 * Custom conflict resolver function
 */
export type CustomConflictResolver = (
    requests: StateUpdateRequest[],
    currentState: SystemState
) => ConflictResolutionResult;

/**
 * StateConflictResolver configuration
 */
export interface ConflictResolverConfig {
    /** Default resolution strategy */
    defaultStrategy?: ConflictResolutionStrategy;
    
    /** Custom resolver function */
    customResolver?: CustomConflictResolver;
    
    /** Whether to enable conflict logging */
    enableLogging?: boolean;
}

/**
 * StateConflictResolver for handling competing state updates
 */
export class StateConflictResolver {
    private config: Required<Omit<ConflictResolverConfig, 'customResolver'>> & { customResolver?: CustomConflictResolver };
    private pendingRequests: StateUpdateRequest[] = [];
    
    constructor(config: ConflictResolverConfig = {}) {
        this.config = {
            defaultStrategy: config.defaultStrategy ?? ConflictResolutionStrategy.MERGE,
            customResolver: config.customResolver,
            enableLogging: config.enableLogging ?? false
        };
    }
    
    /**
     * Add a state update request
     */
    public addRequest(request: StateUpdateRequest): void {
        this.pendingRequests.push(request);
        
        if (this.config.enableLogging) {
            console.log(`[ConflictResolver] Added request from ${request.component}`, request);
        }
    }
    
    /**
     * Resolve all pending requests
     */
    public resolve(currentState: SystemState): ConflictResolutionResult {
        if (this.pendingRequests.length === 0) {
            return {
                resolvedUpdate: {},
                strategy: this.config.defaultStrategy,
                mergedRequests: [],
                rejectedRequests: [],
                reason: 'No pending requests'
            };
        }
        
        if (this.pendingRequests.length === 1) {
            const request = this.pendingRequests[0];
            this.pendingRequests = [];
            return {
                resolvedUpdate: request.update,
                strategy: this.config.defaultStrategy,
                mergedRequests: [request],
                rejectedRequests: [],
                reason: 'Single request, no conflict'
            };
        }
        
        // Use custom resolver if provided
        if (this.config.customResolver) {
            const result = this.config.customResolver(this.pendingRequests, currentState);
            this.pendingRequests = [];
            return result;
        }
        
        // Use default strategy
        let result: ConflictResolutionResult;
        
        switch (this.config.defaultStrategy) {
            case ConflictResolutionStrategy.PRIORITY:
                result = this.resolveBypriority();
                break;
            case ConflictResolutionStrategy.TIMESTAMP:
                result = this.resolveByTimestamp();
                break;
            case ConflictResolutionStrategy.MERGE:
                result = this.resolveByMerge(currentState);
                break;
            default:
                result = this.resolveByMerge(currentState);
        }
        
        this.pendingRequests = [];
        
        if (this.config.enableLogging) {
            console.log('[ConflictResolver] Resolved conflicts', result);
        }
        
        return result;
    }
    
    /**
     * Resolve by priority (highest priority wins)
     */
    private resolveBypriority(): ConflictResolutionResult {
        const sorted = [...this.pendingRequests].sort((a, b) => b.priority - a.priority);
        const winner = sorted[0];
        const rejected = sorted.slice(1);
        
        return {
            resolvedUpdate: winner.update,
            strategy: ConflictResolutionStrategy.PRIORITY,
            mergedRequests: [winner],
            rejectedRequests: rejected,
            reason: `Highest priority request from ${winner.component}`
        };
    }
    
    /**
     * Resolve by timestamp (most recent wins)
     */
    private resolveByTimestamp(): ConflictResolutionResult {
        const sorted = [...this.pendingRequests].sort((a, b) => 
            b.timestamp.getTime() - a.timestamp.getTime()
        );
        const winner = sorted[0];
        const rejected = sorted.slice(1);
        
        return {
            resolvedUpdate: winner.update,
            strategy: ConflictResolutionStrategy.TIMESTAMP,
            mergedRequests: [winner],
            rejectedRequests: rejected,
            reason: `Most recent request from ${winner.component}`
        };
    }
    
    /**
     * Resolve by intelligent merging
     */
    private resolveByMerge(currentState: SystemState): ConflictResolutionResult {
        const merged: Partial<SystemState> = {};
        const mergedRequests: StateUpdateRequest[] = [];
        const rejectedRequests: StateUpdateRequest[] = [];
        
        // Group requests by what they're trying to update
        const emotionUpdates: StateUpdateRequest[] = [];
        const themeUpdates: StateUpdateRequest[] = [];
        const personaUpdates: StateUpdateRequest[] = [];
        const performanceUpdates: StateUpdateRequest[] = [];
        const otherUpdates: StateUpdateRequest[] = [];
        
        for (const request of this.pendingRequests) {
            if (request.update.currentEmotion) {
                emotionUpdates.push(request);
            }
            if (request.update.activeTheme) {
                themeUpdates.push(request);
            }
            if (request.update.activePersonas) {
                personaUpdates.push(request);
            }
            if (request.update.performance) {
                performanceUpdates.push(request);
            }
            if (Object.keys(request.update).some(k => 
                !['currentEmotion', 'activeTheme', 'activePersonas', 'performance'].includes(k)
            )) {
                otherUpdates.push(request);
            }
        }
        
        // Merge emotional states (use highest priority)
        if (emotionUpdates.length > 0) {
            const sorted = emotionUpdates.sort((a, b) => b.priority - a.priority);
            merged.currentEmotion = sorted[0].update.currentEmotion;
            mergedRequests.push(sorted[0]);
            rejectedRequests.push(...sorted.slice(1));
        }
        
        // Merge theme updates (use highest priority)
        if (themeUpdates.length > 0) {
            const sorted = themeUpdates.sort((a, b) => b.priority - a.priority);
            merged.activeTheme = sorted[0].update.activeTheme;
            mergedRequests.push(sorted[0]);
            rejectedRequests.push(...sorted.slice(1));
        }
        
        // Merge persona updates (combine all unique personas)
        if (personaUpdates.length > 0) {
            const allPersonas = new Set<PersonaType>();
            for (const request of personaUpdates) {
                if (request.update.activePersonas) {
                    request.update.activePersonas.forEach(p => allPersonas.add(p));
                }
            }
            merged.activePersonas = Array.from(allPersonas);
            mergedRequests.push(...personaUpdates);
        }
        
        // Merge performance updates (use most recent values)
        if (performanceUpdates.length > 0) {
            const sorted = performanceUpdates.sort((a, b) => 
                b.timestamp.getTime() - a.timestamp.getTime()
            );
            merged.performance = {
                ...currentState.performance,
                ...sorted[0].update.performance
            };
            mergedRequests.push(sorted[0]);
        }
        
        // Merge other updates (use highest priority for each field)
        if (otherUpdates.length > 0) {
            const sorted = otherUpdates.sort((a, b) => b.priority - a.priority);
            for (const request of sorted) {
                Object.assign(merged, request.update);
            }
            mergedRequests.push(...otherUpdates);
        }
        
        return {
            resolvedUpdate: merged,
            strategy: ConflictResolutionStrategy.MERGE,
            mergedRequests: Array.from(new Set(mergedRequests)),
            rejectedRequests: Array.from(new Set(rejectedRequests)),
            reason: `Merged ${this.pendingRequests.length} requests intelligently`
        };
    }
    
    /**
     * Check if there are pending requests
     */
    public hasPendingRequests(): boolean {
        return this.pendingRequests.length > 0;
    }
    
    /**
     * Get pending request count
     */
    public getPendingCount(): number {
        return this.pendingRequests.length;
    }
    
    /**
     * Clear all pending requests
     */
    public clearPending(): void {
        this.pendingRequests = [];
    }
    
    /**
     * Set resolution strategy
     */
    public setStrategy(strategy: ConflictResolutionStrategy): void {
        this.config.defaultStrategy = strategy;
    }
    
    /**
     * Set custom resolver
     */
    public setCustomResolver(resolver: CustomConflictResolver): void {
        this.config.customResolver = resolver;
    }
}
