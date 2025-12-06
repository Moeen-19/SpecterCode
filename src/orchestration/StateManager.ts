/**
 * StateManager - Centralized state management with immutable updates
 * Manages the global system state for MirrorCanvas
 */

import { SystemState, ComponentStates, ComponentState, PerformanceMetrics, SessionInfo, PersonaType } from '../models/SystemModels';
import { EmotionalState, EmotionType, EmotionalTrend } from '../models/EmotionalModels';
import { ThemeSpec, ThemePreset } from '../models/ThemeModels';
import { EventBus } from './EventBus';
import { SystemEventType } from '../models/SystemModels';

/**
 * State change listener function
 */
export type StateChangeListener = (newState: SystemState, oldState: SystemState) => void;

/**
 * State validation result
 */
export interface StateValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * State snapshot for history/undo
 */
export interface StateSnapshot {
    timestamp: Date;
    state: SystemState;
    reason: string;
}

/**
 * StateManager configuration
 */
export interface StateManagerConfig {
    /** Initial system state */
    initialState?: Partial<SystemState>;
    
    /** Maximum number of state snapshots to keep */
    maxSnapshots?: number;
    
    /** Whether to enable state validation */
    enableValidation?: boolean;
    
    /** Event bus for state change notifications */
    eventBus?: EventBus;
}

/**
 * Centralized state manager with immutable updates
 */
export class StateManager {
    private currentState: SystemState;
    private stateHistory: StateSnapshot[] = [];
    private listeners: Map<string, StateChangeListener> = new Map();
    private listenerCounter: number = 0;
    private config: Required<Omit<StateManagerConfig, 'initialState' | 'eventBus'>> & { eventBus?: EventBus };
    
    constructor(config: StateManagerConfig = {}) {
        this.config = {
            maxSnapshots: config.maxSnapshots ?? 50,
            enableValidation: config.enableValidation ?? true,
            eventBus: config.eventBus
        };
        
        // Initialize with default state
        this.currentState = this.createDefaultState(config.initialState);
        
        // Create initial snapshot
        this.createSnapshot('Initial state');
    }
    
    /**
     * Create default system state
     */
    private createDefaultState(partial?: Partial<SystemState>): SystemState {
        const defaultState: SystemState = {
            currentEmotion: {
                primary: EmotionType.CALM,
                secondary: undefined,
                intensity: 0.5,
                stability: 0.8,
                trend: EmotionalTrend.STABLE,
                confidence: 0.7,
                duration: 0,
                vector: {
                    calm: 0.5,
                    tense: 0,
                    curious: 0,
                    excited: 0,
                    frustrated: 0,
                    timestamp: new Date(),
                    confidence: 0.7
                }
            },
            activeTheme: this.createDefaultTheme(),
            activePersonas: [],
            userPreferences: {
                enabled: true,
                theme: ThemePreset.HALLOWEEN,
                emotionSensitivity: 0.7,
                animationIntensity: 0.8,
                audioEnabled: true,
                audioVolume: 0.3,
                particlesEnabled: true,
                personasEnabled: true,
                performanceMode: 'balanced' as any,
                collectHistory: true,
                customThemes: {},
                shortcuts: {},
                privacy: {
                    allowEmotionalTracking: true,
                    allowAnalytics: false,
                    allowCrashReports: true,
                    anonymizeData: true
                }
            },
            performance: {
                fps: 60,
                memoryUsage: 0,
                cpuUsage: 0,
                activeAnimations: 0,
                activeParticles: 0,
                audioLatency: 0,
                lastCheck: new Date(),
                warnings: []
            },
            isActive: false,
            session: {
                sessionId: this.generateSessionId(),
                startTime: new Date(),
                lastActivityTime: new Date(),
                actionCount: 0,
                typingTime: 0,
                idleTime: 0,
                filesEdited: [],
                errorCount: 0,
                successCount: 0
            },
            components: {
                emotionEngine: this.createDefaultComponentState('emotion-engine'),
                vibeLayer: this.createDefaultComponentState('vibe-layer'),
                memoryCanvas: this.createDefaultComponentState('memory-canvas'),
                personas: this.createDefaultComponentState('personas'),
                configManager: this.createDefaultComponentState('config-manager')
            }
        };
        
        return { ...defaultState, ...partial };
    }
    
    /**
     * Create default component state
     */
    private createDefaultComponentState(name: string): ComponentState {
        return {
            initialized: false,
            active: false,
            lastUpdate: new Date(),
            status: 'Not initialized',
            errors: []
        };
    }
    
    /**
     * Create a minimal default theme
     */
    private createDefaultTheme(): ThemeSpec {
        return {
            metadata: {
                id: 'default',
                name: 'Default',
                version: '1.0.0',
                author: 'MirrorCanvas',
                description: 'Default theme',
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            visual: {
                palette: {
                    primary: '#ff6b35',
                    secondary: '#004e89',
                    accent: '#f7931e',
                    background: ['#1a1a2e', '#16213e'],
                    foreground: '#ffffff',
                    emotional: {
                        calm: '#4a90e2',
                        tense: '#e74c3c',
                        curious: '#9b59b6',
                        excited: '#f39c12',
                        frustrated: '#e67e22'
                    }
                },
                effects: {
                    glowIntensity: 0.5,
                    blurAmount: 0,
                    overlayOpacity: 0.1,
                    saturation: 0,
                    brightness: 0,
                    contrast: 0,
                    vignette: false,
                    vignetteIntensity: 0.3,
                    chromaticAberration: false
                },
                background: {
                    type: 'gradient',
                    gradientDirection: 'vertical',
                    proceduralTexture: false
                },
                lighting: {
                    ambientIntensity: 0.5,
                    dynamicLighting: true,
                    glowColor: '#ff6b35',
                    glowRadius: 10,
                    spectralEffects: false
                }
            },
            audio: {
                ambient: {
                    audioPath: '',
                    loop: true,
                    fadeInDuration: 1000,
                    fadeOutDuration: 1000,
                    volume: 0.3
                },
                actionSounds: {},
                emotionalSounds: {},
                volume: 0.3,
                spatialAudio: false
            },
            animations: {
                speed: 1.0,
                transitionDuration: 1000,
                easing: 'ease-in-out',
                typingAnimations: true,
                saveAnimations: true,
                errorAnimations: true,
                idleAnimations: true
            },
            particles: {
                enabled: true,
                density: 50,
                sizeRange: [2, 8],
                speedRange: [10, 50],
                opacityRange: [0.3, 0.8],
                colors: ['#ff6b35', '#004e89'],
                shape: 'circle',
                behavior: 'float',
                cursorInteraction: false
            }
        };
    }
    
    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get the current state (immutable copy)
     */
    public getState(): Readonly<SystemState> {
        return Object.freeze(JSON.parse(JSON.stringify(this.currentState)));
    }
    
    /**
     * Update the state with a partial update
     */
    public updateState(update: Partial<SystemState>, reason: string = 'State update'): SystemState {
        const oldState = this.currentState;
        
        // Create new state with immutable update
        const newState: SystemState = {
            ...oldState,
            ...update
        };
        
        // Validate if enabled
        if (this.config.enableValidation) {
            const validation = this.validateState(newState);
            if (!validation.valid) {
                console.error('[StateManager] State validation failed:', validation.errors);
                throw new Error(`Invalid state update: ${validation.errors.join(', ')}`);
            }
            
            if (validation.warnings.length > 0) {
                console.warn('[StateManager] State validation warnings:', validation.warnings);
            }
        }
        
        // Update current state
        this.currentState = newState;
        
        // Create snapshot
        this.createSnapshot(reason);
        
        // Notify listeners
        this.notifyListeners(newState, oldState);
        
        // Publish state change event
        if (this.config.eventBus) {
            this.config.eventBus.publishSync({
                type: SystemEventType.STATE_CHANGED,
                timestamp: new Date(),
                source: 'state-manager',
                payload: { newState, oldState, reason },
                priority: 10
            });
        }
        
        return this.getState() as SystemState;
    }
    
    /**
     * Update a specific component state
     */
    public updateComponentState(
        component: keyof ComponentStates,
        update: Partial<ComponentState>
    ): SystemState {
        const currentComponentState = this.currentState.components[component];
        const newComponentState: ComponentState = {
            ...currentComponentState,
            ...update,
            lastUpdate: new Date()
        };
        
        return this.updateState({
            components: {
                ...this.currentState.components,
                [component]: newComponentState
            }
        }, `Update ${component} component state`);
    }
    
    /**
     * Update emotional state
     */
    public updateEmotionalState(emotionalState: EmotionalState): SystemState {
        const update = this.updateState({
            currentEmotion: emotionalState
        }, 'Emotional state update');
        
        // Publish emotion update event
        if (this.config.eventBus) {
            this.config.eventBus.publishSync({
                type: SystemEventType.EMOTION_UPDATED,
                timestamp: new Date(),
                source: 'state-manager',
                payload: { emotionalState },
                priority: 9
            });
        }
        
        return update;
    }
    
    /**
     * Update active theme
     */
    public updateTheme(theme: ThemeSpec): SystemState {
        const update = this.updateState({
            activeTheme: theme
        }, 'Theme update');
        
        // Publish theme change event
        if (this.config.eventBus) {
            this.config.eventBus.publishSync({
                type: SystemEventType.THEME_CHANGED,
                timestamp: new Date(),
                source: 'state-manager',
                payload: { theme },
                priority: 8
            });
        }
        
        return update;
    }
    
    /**
     * Update active personas
     */
    public updateActivePersonas(personas: PersonaType[]): SystemState {
        return this.updateState({
            activePersonas: personas
        }, 'Active personas update');
    }
    
    /**
     * Update performance metrics
     */
    public updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): SystemState {
        return this.updateState({
            performance: {
                ...this.currentState.performance,
                ...metrics,
                lastCheck: new Date()
            }
        }, 'Performance metrics update');
    }
    
    /**
     * Update session info
     */
    public updateSessionInfo(sessionInfo: Partial<SessionInfo>): SystemState {
        return this.updateState({
            session: {
                ...this.currentState.session,
                ...sessionInfo,
                lastActivityTime: new Date()
            }
        }, 'Session info update');
    }
    
    /**
     * Validate state consistency
     */
    public validateState(state: SystemState): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate emotional state
        if (!state.currentEmotion) {
            errors.push('Missing emotional state');
        } else {
            if (state.currentEmotion.intensity < 0 || state.currentEmotion.intensity > 1) {
                errors.push('Emotional intensity out of range [0, 1]');
            }
            if (state.currentEmotion.stability < 0 || state.currentEmotion.stability > 1) {
                errors.push('Emotional stability out of range [0, 1]');
            }
        }
        
        // Validate theme
        if (!state.activeTheme) {
            errors.push('Missing active theme');
        }
        
        // Validate user preferences
        if (!state.userPreferences) {
            errors.push('Missing user preferences');
        } else {
            if (state.userPreferences.emotionSensitivity < 0.1 || state.userPreferences.emotionSensitivity > 1) {
                warnings.push('Emotion sensitivity outside recommended range [0.1, 1.0]');
            }
            if (state.userPreferences.audioVolume < 0 || state.userPreferences.audioVolume > 1) {
                errors.push('Audio volume out of range [0, 1]');
            }
        }
        
        // Validate performance metrics
        if (state.performance) {
            if (state.performance.fps < 0) {
                warnings.push('Negative FPS value');
            }
            if (state.performance.fps < 30) {
                warnings.push('Low FPS detected');
            }
        }
        
        // Validate component states
        if (!state.components) {
            errors.push('Missing component states');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Create a state snapshot
     */
    private createSnapshot(reason: string): void {
        const snapshot: StateSnapshot = {
            timestamp: new Date(),
            state: JSON.parse(JSON.stringify(this.currentState)),
            reason
        };
        
        this.stateHistory.push(snapshot);
        
        // Trim history if needed
        if (this.stateHistory.length > this.config.maxSnapshots) {
            this.stateHistory.shift();
        }
    }
    
    /**
     * Get state history
     */
    public getHistory(limit?: number): StateSnapshot[] {
        if (limit) {
            return this.stateHistory.slice(-limit);
        }
        return [...this.stateHistory];
    }
    
    /**
     * Restore state from a snapshot
     */
    public restoreSnapshot(timestamp: Date): boolean {
        const snapshot = this.stateHistory.find(s => s.timestamp.getTime() === timestamp.getTime());
        
        if (!snapshot) {
            return false;
        }
        
        this.currentState = JSON.parse(JSON.stringify(snapshot.state));
        this.notifyListeners(this.currentState, this.currentState);
        
        return true;
    }
    
    /**
     * Subscribe to state changes
     */
    public subscribe(listener: StateChangeListener): string {
        const id = `listener_${++this.listenerCounter}`;
        this.listeners.set(id, listener);
        return id;
    }
    
    /**
     * Unsubscribe from state changes
     */
    public unsubscribe(listenerId: string): boolean {
        return this.listeners.delete(listenerId);
    }
    
    /**
     * Notify all listeners of state change
     */
    private notifyListeners(newState: SystemState, oldState: SystemState): void {
        for (const listener of this.listeners.values()) {
            try {
                listener(newState, oldState);
            } catch (error) {
                console.error('[StateManager] Error in state change listener:', error);
            }
        }
    }
    
    /**
     * Reset state to default
     */
    public reset(): void {
        this.currentState = this.createDefaultState();
        this.stateHistory = [];
        this.createSnapshot('State reset');
        this.notifyListeners(this.currentState, this.currentState);
    }
    
    /**
     * Clear state history
     */
    public clearHistory(): void {
        this.stateHistory = [];
    }
}
