/**
 * EventBus - Pub/Sub system for component communication
 * Implements event-driven architecture for MirrorCanvas components
 */

import { SystemEvent, SystemEventType } from '../models/SystemModels';

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (event: SystemEvent) => void | Promise<void>;

/**
 * Event subscription
 */
export interface EventSubscription {
    /** Unique subscription ID */
    id: string;
    
    /** Event type this subscription listens to */
    eventType: SystemEventType | '*';
    
    /** Handler function */
    handler: EventHandler;
    
    /** Priority for handler execution (higher = earlier) */
    priority: number;
    
    /** Whether this is a one-time subscription */
    once: boolean;
    
    /** Optional filter function */
    filter?: (event: SystemEvent) => boolean;
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
    /** Maximum number of events to keep in history */
    maxHistorySize?: number;
    
    /** Whether to enable event logging */
    enableLogging?: boolean;
    
    /** Whether to enable async event handling */
    enableAsync?: boolean;
}

/**
 * EventBus for pub/sub communication between components
 */
export class EventBus {
    private subscriptions: Map<SystemEventType | '*', EventSubscription[]> = new Map();
    private eventHistory: SystemEvent[] = [];
    private subscriptionCounter: number = 0;
    private config: Required<EventBusConfig>;
    private isProcessing: boolean = false;
    private eventQueue: SystemEvent[] = [];
    
    constructor(config: EventBusConfig = {}) {
        this.config = {
            maxHistorySize: config.maxHistorySize ?? 100,
            enableLogging: config.enableLogging ?? false,
            enableAsync: config.enableAsync ?? true
        };
    }
    
    /**
     * Subscribe to an event type
     */
    public subscribe<T = any>(
        eventType: SystemEventType | '*',
        handler: EventHandler<T>,
        options: {
            priority?: number;
            once?: boolean;
            filter?: (event: SystemEvent) => boolean;
        } = {}
    ): string {
        const subscription: EventSubscription = {
            id: `sub_${++this.subscriptionCounter}`,
            eventType,
            handler: handler as EventHandler,
            priority: options.priority ?? 0,
            once: options.once ?? false,
            filter: options.filter
        };
        
        // Get or create subscription list for this event type
        const subscriptions = this.subscriptions.get(eventType) ?? [];
        subscriptions.push(subscription);
        
        // Sort by priority (higher priority first)
        subscriptions.sort((a, b) => b.priority - a.priority);
        
        this.subscriptions.set(eventType, subscriptions);
        
        if (this.config.enableLogging) {
            console.log(`[EventBus] Subscribed to ${eventType} with ID ${subscription.id}`);
        }
        
        return subscription.id;
    }
    
    /**
     * Subscribe to an event type once (auto-unsubscribe after first event)
     */
    public once<T = any>(
        eventType: SystemEventType | '*',
        handler: EventHandler<T>,
        options: {
            priority?: number;
            filter?: (event: SystemEvent) => boolean;
        } = {}
    ): string {
        return this.subscribe(eventType, handler, { ...options, once: true });
    }
    
    /**
     * Unsubscribe from events
     */
    public unsubscribe(subscriptionId: string): boolean {
        for (const [eventType, subscriptions] of this.subscriptions.entries()) {
            const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                
                if (subscriptions.length === 0) {
                    this.subscriptions.delete(eventType);
                }
                
                if (this.config.enableLogging) {
                    console.log(`[EventBus] Unsubscribed ${subscriptionId} from ${eventType}`);
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Unsubscribe all handlers for an event type
     */
    public unsubscribeAll(eventType: SystemEventType | '*'): void {
        this.subscriptions.delete(eventType);
        
        if (this.config.enableLogging) {
            console.log(`[EventBus] Unsubscribed all handlers from ${eventType}`);
        }
    }
    
    /**
     * Publish an event
     */
    public async publish<T = any>(event: SystemEvent): Promise<void> {
        // Add to history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.config.maxHistorySize) {
            this.eventHistory.shift();
        }
        
        if (this.config.enableLogging) {
            console.log(`[EventBus] Publishing event: ${event.type}`, event);
        }
        
        // Get handlers for this specific event type
        const specificHandlers = this.subscriptions.get(event.type) ?? [];
        
        // Get wildcard handlers
        const wildcardHandlers = this.subscriptions.get('*') ?? [];
        
        // Combine and sort by priority
        const allHandlers = [...specificHandlers, ...wildcardHandlers]
            .sort((a, b) => b.priority - a.priority);
        
        // Execute handlers
        const handlersToRemove: string[] = [];
        
        for (const subscription of allHandlers) {
            // Apply filter if present
            if (subscription.filter && !subscription.filter(event)) {
                continue;
            }
            
            try {
                if (this.config.enableAsync) {
                    await subscription.handler(event);
                } else {
                    subscription.handler(event);
                }
                
                // Mark for removal if once
                if (subscription.once) {
                    handlersToRemove.push(subscription.id);
                }
            } catch (error) {
                console.error(`[EventBus] Error in event handler for ${event.type}:`, error);
            }
        }
        
        // Remove one-time handlers
        for (const id of handlersToRemove) {
            this.unsubscribe(id);
        }
    }
    
    /**
     * Publish an event synchronously (fire and forget)
     */
    public publishSync<T = any>(event: SystemEvent): void {
        // Add to queue for async processing
        this.eventQueue.push(event);
        
        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    /**
     * Process queued events
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            if (event) {
                await this.publish(event);
            }
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Get event history
     */
    public getHistory(filter?: {
        eventType?: SystemEventType;
        source?: string;
        since?: Date;
        limit?: number;
    }): SystemEvent[] {
        let history = [...this.eventHistory];
        
        if (filter) {
            if (filter.eventType) {
                history = history.filter(e => e.type === filter.eventType);
            }
            
            if (filter.source) {
                history = history.filter(e => e.source === filter.source);
            }
            
            if (filter.since) {
                history = history.filter(e => e.timestamp >= filter.since!);
            }
            
            if (filter.limit) {
                history = history.slice(-filter.limit);
            }
        }
        
        return history;
    }
    
    /**
     * Clear event history
     */
    public clearHistory(): void {
        this.eventHistory = [];
    }
    
    /**
     * Get subscription count for an event type
     */
    public getSubscriptionCount(eventType: SystemEventType | '*'): number {
        return this.subscriptions.get(eventType)?.length ?? 0;
    }
    
    /**
     * Get all active subscriptions
     */
    public getAllSubscriptions(): EventSubscription[] {
        const allSubs: EventSubscription[] = [];
        for (const subs of this.subscriptions.values()) {
            allSubs.push(...subs);
        }
        return allSubs;
    }
    
    /**
     * Clear all subscriptions
     */
    public clearAllSubscriptions(): void {
        this.subscriptions.clear();
        
        if (this.config.enableLogging) {
            console.log('[EventBus] Cleared all subscriptions');
        }
    }
    
    /**
     * Enable or disable logging
     */
    public setLogging(enabled: boolean): void {
        this.config.enableLogging = enabled;
    }
}
