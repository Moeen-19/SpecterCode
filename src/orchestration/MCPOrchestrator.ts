/**
 * MCPOrchestrator - Main orchestration layer coordinating all MirrorCanvas components
 * Implements the Model Context Protocol for component coordination
 */

import * as vscode from 'vscode';
import { SystemState, SystemEventType, UserAction, ComponentStates } from '../models/SystemModels';
import { EmotionalState } from '../models/EmotionalModels';
import { ThemeSpec } from '../models/ThemeModels';
import { EventBus } from './EventBus';
import { StateManager } from './StateManager';
import { EventRouter, ComponentId } from './EventRouter';
import { ActionCapture } from './ActionCapture';
import { ActionProcessor } from './ActionProcessor';
import { StateConflictResolver, StateUpdateRequest } from './StateConflictResolver';
import { StatePersistence, RecoveryResult } from './StatePersistence';

/**
 * Component interface that all MirrorCanvas components must implement
 */
export interface IMirrorCanvasComponent {
    /** Initialize the component */
    initialize(): Promise<void>;
    
    /** Start the component */
    start(): void;
    
    /** Stop the component */
    stop(): void;
    
    /** Handle state updates */
    onStateUpdate?(newState: SystemState, oldState: SystemState): void;
    
    /** Clean up resources */
    dispose(): void;
}

/**
 * MCP Orchestrator configuration
 */
export interface MCPOrchestratorConfig {
    /** VS Code extension context */
    context: vscode.ExtensionContext;
    
    /** Storage directory for persistence */
    storageDir: string;
    
    /** Whether to enable auto-save */
    enableAutoSave?: boolean;
    
    /** Whether to enable state recovery on startup */
    enableStateRecovery?: boolean;
    
    /** Whether to enable logging */
    enableLogging?: boolean;
}

/**
 * MCPOrchestrator - Main coordinator for all MirrorCanvas components
 */
export class MCPOrchestrator {
    private context: vscode.ExtensionContext;
    private eventBus: EventBus;
    private stateManager: StateManager;
    private eventRouter: EventRouter;
    private actionCapture: ActionCapture;
    private actionProcessor: ActionProcessor;
    private conflictResolver: StateConflictResolver;
    private statePersistence: StatePersistence;
    
    private components: Map<ComponentId, IMirrorCanvasComponent> = new Map();
    private isInitialized: boolean = false;
    private isRunning: boolean = false;
    private config: Required<MCPOrchestratorConfig>;
    
    constructor(config: MCPOrchestratorConfig) {
        this.context = config.context;
        this.config = {
            context: config.context,
            storageDir: config.storageDir,
            enableAutoSave: config.enableAutoSave ?? true,
            enableStateRecovery: config.enableStateRecovery ?? true,
            enableLogging: config.enableLogging ?? false
        };
        
        // Initialize core systems
        this.eventBus = new EventBus({
            maxHistorySize: 100,
            enableLogging: this.config.enableLogging,
            enableAsync: true
        });
        
        this.stateManager = new StateManager({
            maxSnapshots: 50,
            enableValidation: true,
            eventBus: this.eventBus
        });
        
        this.eventRouter = new EventRouter({
            eventBus: this.eventBus,
            enableStatistics: true,
            enableLogging: this.config.enableLogging
        });
        
        this.actionCapture = new ActionCapture({
            captureTyping: true,
            captureFileOps: true,
            captureDiagnostics: true,
            typingThrottle: 500,
            enableLogging: this.config.enableLogging
        });
        
        this.actionProcessor = new ActionProcessor({
            eventBus: this.eventBus,
            defaultBatchSize: 10,
            defaultBatchTimeout: 1000,
            enableLogging: this.config.enableLogging
        });
        
        this.conflictResolver = new StateConflictResolver({
            defaultStrategy: 'merge' as any,
            enableLogging: this.config.enableLogging
        });
        
        this.statePersistence = new StatePersistence({
            storageDir: this.config.storageDir,
            autoSave: this.config.enableAutoSave,
            autoSaveInterval: 30000,
            enableBackup: true,
            maxBackups: 5
        });
        
        // Setup action capture callback
        this.actionCapture.onAction((action) => {
            this.handleUserAction(action);
        });
        
        // Setup state change listener
        this.stateManager.subscribe((newState, oldState) => {
            this.handleStateChange(newState, oldState);
        });
        
        // Setup event routing for state changes
        this.setupEventRouting();
    }
    
    /**
     * Initialize the orchestrator
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Initializing...');
        }
        
        // Attempt state recovery
        if (this.config.enableStateRecovery) {
            await this.recoverState();
        }
        
        // Start action capture
        this.actionCapture.start(this.context);
        
        // Start auto-save
        if (this.config.enableAutoSave) {
            this.statePersistence.startAutoSave(() => this.stateManager.getState() as SystemState);
        }
        
        // Initialize all registered components
        for (const [id, component] of this.components.entries()) {
            try {
                await component.initialize();
                this.stateManager.updateComponentState(id as keyof ComponentStates, {
                    initialized: true,
                    status: 'Initialized'
                });
            } catch (error) {
                console.error(`[MCPOrchestrator] Failed to initialize component ${id}:`, error);
                this.stateManager.updateComponentState(id as keyof ComponentStates, {
                    initialized: false,
                    status: 'Initialization failed',
                    errors: [(error as Error).message]
                });
            }
        }
        
        this.isInitialized = true;
        
        // Publish initialization event
        await this.eventBus.publish({
            type: SystemEventType.STATE_CHANGED,
            timestamp: new Date(),
            source: 'orchestrator',
            payload: { initialized: true },
            priority: 10
        });
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Initialized successfully');
        }
    }
    
    /**
     * Start the orchestrator and all components
     */
    public start(): void {
        if (!this.isInitialized) {
            throw new Error('Orchestrator must be initialized before starting');
        }
        
        if (this.isRunning) {
            return;
        }
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Starting...');
        }
        
        // Start all components
        for (const [id, component] of this.components.entries()) {
            try {
                component.start();
                this.stateManager.updateComponentState(id as keyof ComponentStates, {
                    active: true,
                    status: 'Running'
                });
            } catch (error) {
                console.error(`[MCPOrchestrator] Failed to start component ${id}:`, error);
                this.stateManager.updateComponentState(id as keyof ComponentStates, {
                    active: false,
                    status: 'Start failed',
                    errors: [(error as Error).message]
                });
            }
        }
        
        // Update system state
        this.stateManager.updateState({
            isActive: true
        }, 'Orchestrator started');
        
        this.isRunning = true;
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Started successfully');
        }
    }
    
    /**
     * Stop the orchestrator and all components
     */
    public stop(): void {
        if (!this.isRunning) {
            return;
        }
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Stopping...');
        }
        
        // Stop all components
        for (const [id, component] of this.components.entries()) {
            try {
                component.stop();
                this.stateManager.updateComponentState(id as keyof ComponentStates, {
                    active: false,
                    status: 'Stopped'
                });
            } catch (error) {
                console.error(`[MCPOrchestrator] Failed to stop component ${id}:`, error);
            }
        }
        
        // Flush pending action batches
        this.actionProcessor.flushBatches();
        
        // Save final state
        const state = this.stateManager.getState() as SystemState;
        this.statePersistence.saveState(state);
        
        // Update system state
        this.stateManager.updateState({
            isActive: false
        }, 'Orchestrator stopped');
        
        this.isRunning = false;
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Stopped successfully');
        }
    }
    
    /**
     * Register a component with the orchestrator
     */
    public registerComponent(id: ComponentId, component: IMirrorCanvasComponent): void {
        this.components.set(id, component);
        
        if (this.config.enableLogging) {
            console.log(`[MCPOrchestrator] Registered component: ${id}`);
        }
    }
    
    /**
     * Unregister a component
     */
    public unregisterComponent(id: ComponentId): void {
        const component = this.components.get(id);
        if (component) {
            component.dispose();
            this.components.delete(id);
            
            if (this.config.enableLogging) {
                console.log(`[MCPOrchestrator] Unregistered component: ${id}`);
            }
        }
    }
    
    /**
     * Handle user actions
     */
    private async handleUserAction(action: UserAction): Promise<void> {
        // Process action through action processor
        await this.actionProcessor.processAction(action);
        
        // Update session info
        const currentState = this.stateManager.getState();
        this.stateManager.updateSessionInfo({
            actionCount: currentState.session.actionCount + 1,
            lastActivityTime: new Date()
        });
    }
    
    /**
     * Handle state changes
     */
    private handleStateChange(newState: SystemState, oldState: SystemState): void {
        // Notify all components of state change
        for (const [id, component] of this.components.entries()) {
            if (component.onStateUpdate) {
                try {
                    component.onStateUpdate(newState, oldState);
                } catch (error) {
                    console.error(`[MCPOrchestrator] Error in component ${id} state update:`, error);
                }
            }
        }
    }
    
    /**
     * Setup event routing between components
     */
    private setupEventRouting(): void {
        // Subscribe to all events and route them
        this.eventBus.subscribe('*', async (event) => {
            await this.eventRouter.routeEvent(event);
        }, { priority: 0 });
    }
    
    /**
     * Recover state from persistence
     */
    private async recoverState(): Promise<void> {
        const result: RecoveryResult = await this.statePersistence.loadState();
        
        if (result.success && result.state) {
            // Update state manager with recovered state
            this.stateManager.updateState(result.state, 'State recovered from persistence');
            
            if (this.config.enableLogging) {
                console.log('[MCPOrchestrator] State recovered successfully');
                if (result.migrated) {
                    console.log('[MCPOrchestrator] State was migrated from older version');
                }
            }
        } else {
            if (this.config.enableLogging) {
                console.log('[MCPOrchestrator] No state to recover or recovery failed:', result.error);
            }
        }
    }
    
    /**
     * Request a state update (with conflict resolution)
     */
    public requestStateUpdate(request: StateUpdateRequest): void {
        this.conflictResolver.addRequest(request);
        
        // Resolve immediately if there are multiple pending requests
        if (this.conflictResolver.getPendingCount() > 1) {
            const currentState = this.stateManager.getState() as SystemState;
            const resolution = this.conflictResolver.resolve(currentState);
            
            if (Object.keys(resolution.resolvedUpdate).length > 0) {
                this.stateManager.updateState(
                    resolution.resolvedUpdate,
                    resolution.reason
                );
            }
        } else {
            // Single request, apply immediately
            this.stateManager.updateState(
                request.update,
                request.reason
            );
            this.conflictResolver.clearPending();
        }
    }
    
    /**
     * Get current system state
     */
    public getState(): Readonly<SystemState> {
        return this.stateManager.getState();
    }
    
    /**
     * Get event bus
     */
    public getEventBus(): EventBus {
        return this.eventBus;
    }
    
    /**
     * Get state manager
     */
    public getStateManager(): StateManager {
        return this.stateManager;
    }
    
    /**
     * Get statistics
     */
    public getStatistics() {
        return {
            eventBus: {
                subscriptions: this.eventBus.getAllSubscriptions().length,
                history: this.eventBus.getHistory().length
            },
            stateManager: {
                snapshots: this.stateManager.getHistory().length
            },
            eventRouter: this.eventRouter.getStatistics(),
            actionCapture: this.actionCapture.getStatistics(),
            actionProcessor: this.actionProcessor.getStatistics()
        };
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Disposing...');
        }
        
        // Stop if running
        if (this.isRunning) {
            this.stop();
        }
        
        // Stop action capture
        this.actionCapture.stop();
        
        // Stop auto-save
        this.statePersistence.stopAutoSave();
        
        // Dispose all components
        for (const [id, component] of this.components.entries()) {
            try {
                component.dispose();
            } catch (error) {
                console.error(`[MCPOrchestrator] Error disposing component ${id}:`, error);
            }
        }
        
        // Dispose processors
        this.actionProcessor.dispose();
        this.statePersistence.dispose();
        
        // Clear event bus
        this.eventBus.clearAllSubscriptions();
        
        if (this.config.enableLogging) {
            console.log('[MCPOrchestrator] Disposed successfully');
        }
    }
}
