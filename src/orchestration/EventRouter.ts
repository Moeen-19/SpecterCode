/**
 * EventRouter - Routes and filters events for efficient component coordination
 * Implements intelligent event routing based on component interests and priorities
 */

import { SystemEvent, SystemEventType } from '../models/SystemModels';
import { EventBus, EventHandler } from './EventBus';

/**
 * Component identifier
 */
export type ComponentId = 'emotion-engine' | 'vibe-layer' | 'memory-canvas' | 'personas' | 'config-manager' | 'orchestrator';

/**
 * Event routing rule
 */
export interface EventRoutingRule {
    /** Rule ID */
    id: string;
    
    /** Source component (undefined = any source) */
    sourceComponent?: ComponentId;
    
    /** Target component(s) */
    targetComponents: ComponentId[];
    
    /** Event types to route */
    eventTypes: (SystemEventType | '*')[];
    
    /** Priority for routing (higher = earlier) */
    priority: number;
    
    /** Filter function */
    filter?: (event: SystemEvent) => boolean;
    
    /** Transform function to modify event before routing */
    transform?: (event: SystemEvent) => SystemEvent;
    
    /** Whether this rule is enabled */
    enabled: boolean;
}

/**
 * Event routing statistics
 */
export interface RoutingStatistics {
    totalEventsRouted: number;
    eventsByType: Map<SystemEventType, number>;
    eventsByComponent: Map<ComponentId, number>;
    droppedEvents: number;
    averageRoutingTime: number;
}

/**
 * EventRouter configuration
 */
export interface EventRouterConfig {
    /** Event bus to use */
    eventBus: EventBus;
    
    /** Whether to enable routing statistics */
    enableStatistics?: boolean;
    
    /** Whether to enable routing logging */
    enableLogging?: boolean;
    
    /** Maximum events to buffer per component */
    maxBufferSize?: number;
}

/**
 * EventRouter for intelligent event routing and filtering
 */
export class EventRouter {
    private eventBus: EventBus;
    private routingRules: Map<string, EventRoutingRule> = new Map();
    private componentHandlers: Map<ComponentId, Map<SystemEventType | '*', EventHandler[]>> = new Map();
    private eventBuffers: Map<ComponentId, SystemEvent[]> = new Map();
    private statistics: RoutingStatistics;
    private config: Required<EventRouterConfig>;
    private ruleCounter: number = 0;
    
    constructor(config: EventRouterConfig) {
        this.eventBus = config.eventBus;
        this.config = {
            eventBus: config.eventBus,
            enableStatistics: config.enableStatistics ?? true,
            enableLogging: config.enableLogging ?? false,
            maxBufferSize: config.maxBufferSize ?? 100
        };
        
        this.statistics = {
            totalEventsRouted: 0,
            eventsByType: new Map(),
            eventsByComponent: new Map(),
            droppedEvents: 0,
            averageRoutingTime: 0
        };
        
        // Initialize default routing rules
        this.initializeDefaultRules();
    }
    
    /**
     * Initialize default routing rules for common patterns
     */
    private initializeDefaultRules(): void {
        // Route emotion updates to vibe layer and personas
        this.addRoutingRule({
            sourceComponent: 'emotion-engine',
            targetComponents: ['vibe-layer', 'personas', 'memory-canvas'],
            eventTypes: [SystemEventType.EMOTION_UPDATED],
            priority: 10,
            enabled: true
        });
        
        // Route theme changes to vibe layer
        this.addRoutingRule({
            sourceComponent: 'config-manager',
            targetComponents: ['vibe-layer'],
            eventTypes: [SystemEventType.THEME_CHANGED],
            priority: 9,
            enabled: true
        });
        
        // Route persona activations to vibe layer
        this.addRoutingRule({
            sourceComponent: 'personas',
            targetComponents: ['vibe-layer'],
            eventTypes: [SystemEventType.PERSONA_ACTIVATED, SystemEventType.PERSONA_DEACTIVATED],
            priority: 8,
            enabled: true
        });
        
        // Route performance warnings to all components
        this.addRoutingRule({
            targetComponents: ['emotion-engine', 'vibe-layer', 'memory-canvas', 'personas'],
            eventTypes: [SystemEventType.PERFORMANCE_WARNING],
            priority: 10,
            enabled: true
        });
        
        // Route session events to memory canvas
        this.addRoutingRule({
            targetComponents: ['memory-canvas'],
            eventTypes: [SystemEventType.SESSION_STARTED, SystemEventType.SESSION_ENDED],
            priority: 9,
            enabled: true
        });
    }
    
    /**
     * Add a routing rule
     */
    public addRoutingRule(rule: Omit<EventRoutingRule, 'id'>): string {
        const ruleId = `rule_${++this.ruleCounter}`;
        const fullRule: EventRoutingRule = {
            id: ruleId,
            ...rule
        };
        
        this.routingRules.set(ruleId, fullRule);
        
        if (this.config.enableLogging) {
            console.log(`[EventRouter] Added routing rule ${ruleId}`, fullRule);
        }
        
        return ruleId;
    }
    
    /**
     * Remove a routing rule
     */
    public removeRoutingRule(ruleId: string): boolean {
        const removed = this.routingRules.delete(ruleId);
        
        if (removed && this.config.enableLogging) {
            console.log(`[EventRouter] Removed routing rule ${ruleId}`);
        }
        
        return removed;
    }
    
    /**
     * Enable or disable a routing rule
     */
    public setRuleEnabled(ruleId: string, enabled: boolean): boolean {
        const rule = this.routingRules.get(ruleId);
        if (!rule) {
            return false;
        }
        
        rule.enabled = enabled;
        
        if (this.config.enableLogging) {
            console.log(`[EventRouter] ${enabled ? 'Enabled' : 'Disabled'} routing rule ${ruleId}`);
        }
        
        return true;
    }
    
    /**
     * Register a component handler for specific event types
     */
    public registerComponentHandler(
        component: ComponentId,
        eventType: SystemEventType | '*',
        handler: EventHandler
    ): void {
        // Get or create handler map for component
        let handlerMap = this.componentHandlers.get(component);
        if (!handlerMap) {
            handlerMap = new Map();
            this.componentHandlers.set(component, handlerMap);
        }
        
        // Get or create handler list for event type
        let handlers = handlerMap.get(eventType);
        if (!handlers) {
            handlers = [];
            handlerMap.set(eventType, handlers);
        }
        
        handlers.push(handler);
        
        if (this.config.enableLogging) {
            console.log(`[EventRouter] Registered handler for ${component} on ${eventType}`);
        }
    }
    
    /**
     * Unregister all handlers for a component
     */
    public unregisterComponent(component: ComponentId): void {
        this.componentHandlers.delete(component);
        this.eventBuffers.delete(component);
        
        if (this.config.enableLogging) {
            console.log(`[EventRouter] Unregistered component ${component}`);
        }
    }
    
    /**
     * Route an event through the routing rules
     */
    public async routeEvent(event: SystemEvent): Promise<void> {
        const startTime = Date.now();
        
        // Find matching routing rules
        const matchingRules = this.findMatchingRules(event);
        
        // Sort by priority
        matchingRules.sort((a, b) => b.priority - a.priority);
        
        // Route to target components
        const targetComponents = new Set<ComponentId>();
        
        for (const rule of matchingRules) {
            if (!rule.enabled) {
                continue;
            }
            
            // Apply filter if present
            if (rule.filter && !rule.filter(event)) {
                continue;
            }
            
            // Transform event if needed
            let routedEvent = event;
            if (rule.transform) {
                routedEvent = rule.transform(event);
            }
            
            // Add target components
            for (const target of rule.targetComponents) {
                targetComponents.add(target);
            }
            
            // Route to each target
            for (const target of rule.targetComponents) {
                await this.deliverToComponent(target, routedEvent);
            }
        }
        
        // Update statistics
        if (this.config.enableStatistics) {
            this.updateStatistics(event, targetComponents, Date.now() - startTime);
        }
        
        if (this.config.enableLogging) {
            console.log(`[EventRouter] Routed ${event.type} to ${targetComponents.size} components in ${Date.now() - startTime}ms`);
        }
    }
    
    /**
     * Find routing rules that match an event
     */
    private findMatchingRules(event: SystemEvent): EventRoutingRule[] {
        const matching: EventRoutingRule[] = [];
        
        for (const rule of this.routingRules.values()) {
            // Check source component
            if (rule.sourceComponent && rule.sourceComponent !== event.source) {
                continue;
            }
            
            // Check event type
            const matchesType = rule.eventTypes.includes('*') || 
                               rule.eventTypes.includes(event.type);
            
            if (matchesType) {
                matching.push(rule);
            }
        }
        
        return matching;
    }
    
    /**
     * Deliver event to a specific component
     */
    private async deliverToComponent(component: ComponentId, event: SystemEvent): Promise<void> {
        const handlerMap = this.componentHandlers.get(component);
        
        if (!handlerMap) {
            // No handlers registered, buffer the event
            this.bufferEvent(component, event);
            return;
        }
        
        // Get handlers for this event type
        const specificHandlers = handlerMap.get(event.type) ?? [];
        const wildcardHandlers = handlerMap.get('*') ?? [];
        const allHandlers = [...specificHandlers, ...wildcardHandlers];
        
        if (allHandlers.length === 0) {
            // No handlers, buffer the event
            this.bufferEvent(component, event);
            return;
        }
        
        // Execute handlers
        for (const handler of allHandlers) {
            try {
                await handler(event);
            } catch (error) {
                console.error(`[EventRouter] Error in component handler for ${component}:`, error);
            }
        }
    }
    
    /**
     * Buffer an event for a component
     */
    private bufferEvent(component: ComponentId, event: SystemEvent): void {
        let buffer = this.eventBuffers.get(component);
        if (!buffer) {
            buffer = [];
            this.eventBuffers.set(component, buffer);
        }
        
        buffer.push(event);
        
        // Trim buffer if needed
        if (buffer.length > this.config.maxBufferSize) {
            buffer.shift();
            this.statistics.droppedEvents++;
        }
    }
    
    /**
     * Get buffered events for a component
     */
    public getBufferedEvents(component: ComponentId): SystemEvent[] {
        return this.eventBuffers.get(component) ?? [];
    }
    
    /**
     * Clear buffered events for a component
     */
    public clearBuffer(component: ComponentId): void {
        this.eventBuffers.delete(component);
    }
    
    /**
     * Update routing statistics
     */
    private updateStatistics(
        event: SystemEvent,
        targetComponents: Set<ComponentId>,
        routingTime: number
    ): void {
        this.statistics.totalEventsRouted++;
        
        // Update by type
        const typeCount = this.statistics.eventsByType.get(event.type) ?? 0;
        this.statistics.eventsByType.set(event.type, typeCount + 1);
        
        // Update by component
        for (const component of targetComponents) {
            const componentCount = this.statistics.eventsByComponent.get(component) ?? 0;
            this.statistics.eventsByComponent.set(component, componentCount + 1);
        }
        
        // Update average routing time
        const totalTime = this.statistics.averageRoutingTime * (this.statistics.totalEventsRouted - 1);
        this.statistics.averageRoutingTime = (totalTime + routingTime) / this.statistics.totalEventsRouted;
    }
    
    /**
     * Get routing statistics
     */
    public getStatistics(): RoutingStatistics {
        return {
            ...this.statistics,
            eventsByType: new Map(this.statistics.eventsByType),
            eventsByComponent: new Map(this.statistics.eventsByComponent)
        };
    }
    
    /**
     * Reset statistics
     */
    public resetStatistics(): void {
        this.statistics = {
            totalEventsRouted: 0,
            eventsByType: new Map(),
            eventsByComponent: new Map(),
            droppedEvents: 0,
            averageRoutingTime: 0
        };
    }
    
    /**
     * Get all routing rules
     */
    public getRoutingRules(): EventRoutingRule[] {
        return Array.from(this.routingRules.values());
    }
    
    /**
     * Get routing rule by ID
     */
    public getRoutingRule(ruleId: string): EventRoutingRule | undefined {
        return this.routingRules.get(ruleId);
    }
}
