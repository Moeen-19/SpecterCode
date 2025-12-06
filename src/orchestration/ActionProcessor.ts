/**
 * ActionProcessor - Routes user actions to appropriate components
 * Implements action batching and throttling for performance optimization
 */

import { UserAction, UserActionType, SystemEventType } from '../models/SystemModels';
import { EventBus } from './EventBus';
import { ComponentId } from './EventRouter';

/**
 * Action processing rule
 */
export interface ActionProcessingRule {
    /** Rule ID */
    id: string;
    
    /** Action types this rule applies to */
    actionTypes: UserActionType[];
    
    /** Target components to route to */
    targetComponents: ComponentId[];
    
    /** Priority for processing */
    priority: number;
    
    /** Whether to batch these actions */
    batch: boolean;
    
    /** Batch size (if batching enabled) */
    batchSize?: number;
    
    /** Batch timeout in ms (if batching enabled) */
    batchTimeout?: number;
    
    /** Whether to throttle these actions */
    throttle: boolean;
    
    /** Throttle interval in ms (if throttling enabled) */
    throttleInterval?: number;
    
    /** Filter function */
    filter?: (action: UserAction) => boolean;
    
    /** Transform function */
    transform?: (action: UserAction) => UserAction;
    
    /** Whether this rule is enabled */
    enabled: boolean;
}

/**
 * Action batch
 */
interface ActionBatch {
    actions: UserAction[];
    timer: NodeJS.Timeout | null;
    lastProcessed: number;
}

/**
 * Action processor configuration
 */
export interface ActionProcessorConfig {
    /** Event bus for publishing processed actions */
    eventBus: EventBus;
    
    /** Default batch size */
    defaultBatchSize?: number;
    
    /** Default batch timeout (ms) */
    defaultBatchTimeout?: number;
    
    /** Default throttle interval (ms) */
    defaultThrottleInterval?: number;
    
    /** Whether to enable processing logging */
    enableLogging?: boolean;
}

/**
 * Processing statistics
 */
export interface ProcessingStatistics {
    totalActionsProcessed: number;
    actionsByType: Map<UserActionType, number>;
    batchedActions: number;
    throttledActions: number;
    droppedActions: number;
    averageProcessingTime: number;
}

/**
 * ActionProcessor for routing and optimizing user actions
 */
export class ActionProcessor {
    private eventBus: EventBus;
    private config: Required<ActionProcessorConfig>;
    private processingRules: Map<string, ActionProcessingRule> = new Map();
    private actionBatches: Map<string, ActionBatch> = new Map();
    private throttleTimers: Map<string, number> = new Map();
    private statistics: ProcessingStatistics;
    private ruleCounter: number = 0;
    
    constructor(config: ActionProcessorConfig) {
        this.eventBus = config.eventBus;
        this.config = {
            eventBus: config.eventBus,
            defaultBatchSize: config.defaultBatchSize ?? 10,
            defaultBatchTimeout: config.defaultBatchTimeout ?? 1000,
            defaultThrottleInterval: config.defaultThrottleInterval ?? 500,
            enableLogging: config.enableLogging ?? false
        };
        
        this.statistics = {
            totalActionsProcessed: 0,
            actionsByType: new Map(),
            batchedActions: 0,
            throttledActions: 0,
            droppedActions: 0,
            averageProcessingTime: 0
        };
        
        // Initialize default processing rules
        this.initializeDefaultRules();
    }
    
    /**
     * Initialize default processing rules
     */
    private initializeDefaultRules(): void {
        // Typing actions: batch and route to emotion engine
        this.addProcessingRule({
            actionTypes: [UserActionType.TYPING],
            targetComponents: ['emotion-engine'],
            priority: 5,
            batch: true,
            batchSize: 5,
            batchTimeout: 2000,
            throttle: true,
            throttleInterval: 1000,
            enabled: true
        });
        
        // Save actions: route to emotion engine and vibe layer
        this.addProcessingRule({
            actionTypes: [UserActionType.SAVE],
            targetComponents: ['emotion-engine', 'vibe-layer', 'memory-canvas'],
            priority: 8,
            batch: false,
            throttle: false,
            enabled: true
        });
        
        // Error actions: immediate routing to emotion engine and vibe layer
        this.addProcessingRule({
            actionTypes: [UserActionType.ERROR],
            targetComponents: ['emotion-engine', 'vibe-layer'],
            priority: 10,
            batch: false,
            throttle: false,
            enabled: true
        });
        
        // File operations: route to memory canvas
        this.addProcessingRule({
            actionTypes: [UserActionType.OPEN_FILE, UserActionType.CLOSE_FILE],
            targetComponents: ['memory-canvas'],
            priority: 3,
            batch: true,
            batchSize: 3,
            batchTimeout: 5000,
            throttle: false,
            enabled: true
        });
        
        // Idle actions: route to personas
        this.addProcessingRule({
            actionTypes: [UserActionType.IDLE],
            targetComponents: ['personas'],
            priority: 2,
            batch: false,
            throttle: true,
            throttleInterval: 30000,
            enabled: true
        });
    }
    
    /**
     * Add a processing rule
     */
    public addProcessingRule(rule: Omit<ActionProcessingRule, 'id'>): string {
        const ruleId = `proc_rule_${++this.ruleCounter}`;
        const fullRule: ActionProcessingRule = {
            id: ruleId,
            ...rule
        };
        
        this.processingRules.set(ruleId, fullRule);
        
        if (this.config.enableLogging) {
            console.log(`[ActionProcessor] Added processing rule ${ruleId}`, fullRule);
        }
        
        return ruleId;
    }
    
    /**
     * Remove a processing rule
     */
    public removeProcessingRule(ruleId: string): boolean {
        const removed = this.processingRules.delete(ruleId);
        
        if (removed && this.config.enableLogging) {
            console.log(`[ActionProcessor] Removed processing rule ${ruleId}`);
        }
        
        return removed;
    }
    
    /**
     * Process a user action
     */
    public async processAction(action: UserAction): Promise<void> {
        const startTime = Date.now();
        
        // Find matching rules
        const matchingRules = this.findMatchingRules(action);
        
        // Sort by priority
        matchingRules.sort((a, b) => b.priority - a.priority);
        
        // Process with each matching rule
        for (const rule of matchingRules) {
            if (!rule.enabled) {
                continue;
            }
            
            // Apply filter
            if (rule.filter && !rule.filter(action)) {
                continue;
            }
            
            // Transform action if needed
            let processedAction = action;
            if (rule.transform) {
                processedAction = rule.transform(action);
            }
            
            // Handle batching
            if (rule.batch) {
                this.batchAction(rule, processedAction);
            }
            // Handle throttling
            else if (rule.throttle) {
                const shouldProcess = this.checkThrottle(rule, processedAction);
                if (shouldProcess) {
                    await this.routeAction(rule, processedAction);
                } else {
                    this.statistics.throttledActions++;
                }
            }
            // Immediate processing
            else {
                await this.routeAction(rule, processedAction);
            }
        }
        
        // Update statistics
        this.updateStatistics(action, Date.now() - startTime);
        
        if (this.config.enableLogging) {
            console.log(`[ActionProcessor] Processed ${action.type} in ${Date.now() - startTime}ms`);
        }
    }
    
    /**
     * Find rules matching an action
     */
    private findMatchingRules(action: UserAction): ActionProcessingRule[] {
        const matching: ActionProcessingRule[] = [];
        
        for (const rule of this.processingRules.values()) {
            if (rule.actionTypes.includes(action.type)) {
                matching.push(rule);
            }
        }
        
        return matching;
    }
    
    /**
     * Batch an action
     */
    private batchAction(rule: ActionProcessingRule, action: UserAction): void {
        const batchKey = rule.id;
        let batch = this.actionBatches.get(batchKey);
        
        if (!batch) {
            batch = {
                actions: [],
                timer: null,
                lastProcessed: Date.now()
            };
            this.actionBatches.set(batchKey, batch);
        }
        
        batch.actions.push(action);
        
        const batchSize = rule.batchSize ?? this.config.defaultBatchSize;
        const batchTimeout = rule.batchTimeout ?? this.config.defaultBatchTimeout;
        
        // Process if batch is full
        if (batch.actions.length >= batchSize) {
            this.processBatch(rule, batchKey);
        }
        // Set timeout if not already set
        else if (!batch.timer) {
            batch.timer = setTimeout(() => {
                this.processBatch(rule, batchKey);
            }, batchTimeout);
        }
    }
    
    /**
     * Process a batch of actions
     */
    private async processBatch(rule: ActionProcessingRule, batchKey: string): Promise<void> {
        const batch = this.actionBatches.get(batchKey);
        if (!batch || batch.actions.length === 0) {
            return;
        }
        
        // Clear timer
        if (batch.timer) {
            clearTimeout(batch.timer);
            batch.timer = null;
        }
        
        // Process all actions in batch
        const actions = [...batch.actions];
        batch.actions = [];
        batch.lastProcessed = Date.now();
        
        this.statistics.batchedActions += actions.length;
        
        if (this.config.enableLogging) {
            console.log(`[ActionProcessor] Processing batch of ${actions.length} actions for rule ${rule.id}`);
        }
        
        // Route batch
        for (const action of actions) {
            await this.routeAction(rule, action);
        }
    }
    
    /**
     * Check if action should be throttled
     */
    private checkThrottle(rule: ActionProcessingRule, action: UserAction): boolean {
        const throttleKey = `${rule.id}_${action.type}`;
        const lastTime = this.throttleTimers.get(throttleKey) ?? 0;
        const now = Date.now();
        const interval = rule.throttleInterval ?? this.config.defaultThrottleInterval;
        
        if (now - lastTime < interval) {
            return false;
        }
        
        this.throttleTimers.set(throttleKey, now);
        return true;
    }
    
    /**
     * Route action to target components
     */
    private async routeAction(rule: ActionProcessingRule, action: UserAction): Promise<void> {
        // Publish event for each target component
        for (const component of rule.targetComponents) {
            await this.eventBus.publish({
                type: SystemEventType.STATE_CHANGED,
                timestamp: new Date(),
                source: 'action-processor',
                payload: {
                    action,
                    targetComponent: component
                },
                priority: rule.priority
            });
        }
    }
    
    /**
     * Update processing statistics
     */
    private updateStatistics(action: UserAction, processingTime: number): void {
        this.statistics.totalActionsProcessed++;
        
        const typeCount = this.statistics.actionsByType.get(action.type) ?? 0;
        this.statistics.actionsByType.set(action.type, typeCount + 1);
        
        const totalTime = this.statistics.averageProcessingTime * (this.statistics.totalActionsProcessed - 1);
        this.statistics.averageProcessingTime = (totalTime + processingTime) / this.statistics.totalActionsProcessed;
    }
    
    /**
     * Flush all pending batches
     */
    public async flushBatches(): Promise<void> {
        for (const [batchKey, batch] of this.actionBatches.entries()) {
            const rule = this.processingRules.get(batchKey);
            if (rule) {
                await this.processBatch(rule, batchKey);
            }
        }
    }
    
    /**
     * Get processing statistics
     */
    public getStatistics(): ProcessingStatistics {
        return {
            ...this.statistics,
            actionsByType: new Map(this.statistics.actionsByType)
        };
    }
    
    /**
     * Reset statistics
     */
    public resetStatistics(): void {
        this.statistics = {
            totalActionsProcessed: 0,
            actionsByType: new Map(),
            batchedActions: 0,
            throttledActions: 0,
            droppedActions: 0,
            averageProcessingTime: 0
        };
    }
    
    /**
     * Get all processing rules
     */
    public getProcessingRules(): ActionProcessingRule[] {
        return Array.from(this.processingRules.values());
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        // Clear all batch timers
        for (const batch of this.actionBatches.values()) {
            if (batch.timer) {
                clearTimeout(batch.timer);
            }
        }
        
        this.actionBatches.clear();
        this.throttleTimers.clear();
    }
}
