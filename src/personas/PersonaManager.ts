/**
 * PersonaManager - Manages activation, deactivation, and state of Specter Personas
 * Implements rule-based activation triggers for Muse, Critic, and Archivist personas
 */

import { EmotionalState, EmotionType, EmotionalTrend } from '../models/EmotionalModels';
import { PersonaType, UserAction, UserActionType, SessionInfo } from '../models/SystemModels';

/**
 * Activation trigger configuration for a persona
 */
export interface PersonaActivationTrigger {
    /** Persona type this trigger applies to */
    persona: PersonaType;
    
    /** Required primary emotion(s) */
    requiredEmotions?: EmotionType[];
    
    /** Minimum emotional intensity (0-1) */
    minIntensity?: number;
    
    /** Maximum emotional intensity (0-1) */
    maxIntensity?: number;
    
    /** Required emotional trend */
    requiredTrend?: EmotionalTrend;
    
    /** Minimum emotional stability (0-1) */
    minStability?: number;
    
    /** Required user action types */
    requiredActions?: UserActionType[];
    
    /** Minimum session duration (milliseconds) */
    minSessionDuration?: number;
    
    /** Minimum error count */
    minErrorCount?: number;
    
    /** Custom condition function */
    customCondition?: (state: EmotionalState, context: PersonaContext) => boolean;
}

/**
 * Context information for persona activation decisions
 */
export interface PersonaContext {
    /** Current emotional state */
    emotionalState: EmotionalState;
    
    /** Recent user actions */
    recentActions: UserAction[];
    
    /** Current session information */
    session: SessionInfo;
    
    /** Currently active personas */
    activePersonas: PersonaType[];
    
    /** Time since last persona activation */
    timeSinceLastActivation: number;
    
    /** Additional context data */
    metadata?: Record<string, any>;
}

/**
 * State of an active persona
 */
export interface PersonaState {
    /** Persona type */
    type: PersonaType;
    
    /** When the persona was activated */
    activatedAt: Date;
    
    /** Current activation intensity (0-1) */
    intensity: number;
    
    /** Interaction count since activation */
    interactionCount: number;
    
    /** Last interaction timestamp */
    lastInteraction?: Date;
    
    /** Persona-specific state data */
    data: Record<string, any>;
}

/**
 * Result of persona activation check
 */
export interface PersonaActivationResult {
    /** Whether the persona should be activated */
    shouldActivate: boolean;
    
    /** Persona type */
    persona: PersonaType;
    
    /** Activation confidence (0-1) */
    confidence: number;
    
    /** Reason for activation/non-activation */
    reason: string;
    
    /** Suggested intensity for activation */
    suggestedIntensity?: number;
}

/**
 * Manages Specter Personas activation, deactivation, and state
 */
export class PersonaManager {
    private activePersonas: Map<PersonaType, PersonaState> = new Map();
    private activationTriggers: PersonaActivationTrigger[] = [];
    private context: PersonaContext | null = null;
    private lastActivationTime: Date | null = null;
    private readonly cooldownPeriod: number = 30000; // 30 seconds between activations
    
    constructor() {
        this.initializeDefaultTriggers();
    }
    
    /**
     * Initialize default activation triggers for each persona
     */
    private initializeDefaultTriggers(): void {
        // Muse: Activated when calm/inspired
        this.activationTriggers.push({
            persona: PersonaType.MUSE,
            requiredEmotions: [EmotionType.CALM, EmotionType.CURIOUS],
            minIntensity: 0.5,
            minStability: 0.6,
            customCondition: (state, context) => {
                // Activate when user is in a creative flow
                const hasRecentTyping = context.recentActions.some(
                    action => action.type === UserActionType.TYPING
                );
                return hasRecentTyping && state.primary === EmotionType.CALM;
            }
        });
        
        // Critic: Activated when frustrated/encountering errors
        this.activationTriggers.push({
            persona: PersonaType.CRITIC,
            requiredEmotions: [EmotionType.FRUSTRATED, EmotionType.TENSE],
            minIntensity: 0.4,
            minErrorCount: 3,
            customCondition: (state, context) => {
                // Activate when user is struggling with errors
                const hasRecentErrors = context.recentActions.some(
                    action => action.type === UserActionType.ERROR
                );
                return hasRecentErrors && context.session.errorCount >= 3;
            }
        });
        
        // Archivist: Activated at end of session or after significant work
        this.activationTriggers.push({
            persona: PersonaType.ARCHIVIST,
            minSessionDuration: 1800000, // 30 minutes
            customCondition: (state, context) => {
                // Activate when session has been productive
                const sessionDuration = Date.now() - context.session.startTime.getTime();
                const hasSignificantActivity = context.session.actionCount > 50;
                return sessionDuration > 1800000 && hasSignificantActivity;
            }
        });
    }
    
    /**
     * Update the context for persona activation decisions
     */
    public updateContext(context: PersonaContext): void {
        this.context = context;
    }
    
    /**
     * Check which personas should be activated based on current context
     */
    public checkActivationTriggers(): PersonaActivationResult[] {
        if (!this.context) {
            return [];
        }
        
        const results: PersonaActivationResult[] = [];
        
        // Check cooldown period
        const now = Date.now();
        if (this.lastActivationTime) {
            const timeSinceLastActivation = now - this.lastActivationTime.getTime();
            if (timeSinceLastActivation < this.cooldownPeriod) {
                return results;
            }
        }
        
        // Check each trigger
        for (const trigger of this.activationTriggers) {
            // Skip if persona is already active
            if (this.activePersonas.has(trigger.persona)) {
                continue;
            }
            
            const result = this.evaluateTrigger(trigger, this.context);
            results.push(result);
        }
        
        return results;
    }
    
    /**
     * Evaluate a single activation trigger
     */
    private evaluateTrigger(
        trigger: PersonaActivationTrigger,
        context: PersonaContext
    ): PersonaActivationResult {
        const state = context.emotionalState;
        let confidence = 0;
        const reasons: string[] = [];
        
        // Check required emotions
        if (trigger.requiredEmotions) {
            const hasRequiredEmotion = trigger.requiredEmotions.includes(state.primary) ||
                (state.secondary && trigger.requiredEmotions.includes(state.secondary));
            
            if (hasRequiredEmotion) {
                confidence += 0.3;
                reasons.push(`Emotion matches: ${state.primary}`);
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: `Required emotion not present (need ${trigger.requiredEmotions.join(' or ')})`
                };
            }
        }
        
        // Check intensity
        if (trigger.minIntensity !== undefined) {
            if (state.intensity >= trigger.minIntensity) {
                confidence += 0.2;
                reasons.push(`Intensity sufficient: ${state.intensity.toFixed(2)}`);
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: `Intensity too low: ${state.intensity.toFixed(2)} < ${trigger.minIntensity}`
                };
            }
        }
        
        if (trigger.maxIntensity !== undefined) {
            if (state.intensity <= trigger.maxIntensity) {
                confidence += 0.1;
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: `Intensity too high: ${state.intensity.toFixed(2)} > ${trigger.maxIntensity}`
                };
            }
        }
        
        // Check stability
        if (trigger.minStability !== undefined) {
            if (state.stability >= trigger.minStability) {
                confidence += 0.15;
                reasons.push(`Stability sufficient: ${state.stability.toFixed(2)}`);
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: `Stability too low: ${state.stability.toFixed(2)} < ${trigger.minStability}`
                };
            }
        }
        
        // Check trend
        if (trigger.requiredTrend !== undefined) {
            if (state.trend === trigger.requiredTrend) {
                confidence += 0.1;
                reasons.push(`Trend matches: ${state.trend}`);
            }
        }
        
        // Check session duration
        if (trigger.minSessionDuration !== undefined) {
            const sessionDuration = Date.now() - context.session.startTime.getTime();
            if (sessionDuration >= trigger.minSessionDuration) {
                confidence += 0.15;
                reasons.push(`Session duration sufficient: ${Math.floor(sessionDuration / 60000)}min`);
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: `Session too short: ${Math.floor(sessionDuration / 60000)}min < ${Math.floor(trigger.minSessionDuration / 60000)}min`
                };
            }
        }
        
        // Check error count
        if (trigger.minErrorCount !== undefined) {
            if (context.session.errorCount >= trigger.minErrorCount) {
                confidence += 0.2;
                reasons.push(`Error count sufficient: ${context.session.errorCount}`);
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: `Not enough errors: ${context.session.errorCount} < ${trigger.minErrorCount}`
                };
            }
        }
        
        // Check custom condition
        if (trigger.customCondition) {
            if (trigger.customCondition(state, context)) {
                confidence += 0.2;
                reasons.push('Custom condition met');
            } else {
                return {
                    shouldActivate: false,
                    persona: trigger.persona,
                    confidence: 0,
                    reason: 'Custom condition not met'
                };
            }
        }
        
        // Determine if should activate (confidence > 0.5)
        const shouldActivate = confidence >= 0.5;
        
        return {
            shouldActivate,
            persona: trigger.persona,
            confidence,
            reason: shouldActivate ? reasons.join('; ') : 'Insufficient confidence',
            suggestedIntensity: Math.min(confidence, 1.0)
        };
    }
    
    /**
     * Activate a persona
     */
    public activatePersona(persona: PersonaType, intensity: number = 0.7): PersonaState {
        // Deactivate if already active
        if (this.activePersonas.has(persona)) {
            this.deactivatePersona(persona);
        }
        
        const state: PersonaState = {
            type: persona,
            activatedAt: new Date(),
            intensity: Math.max(0, Math.min(1, intensity)),
            interactionCount: 0,
            data: {}
        };
        
        this.activePersonas.set(persona, state);
        this.lastActivationTime = new Date();
        
        return state;
    }
    
    /**
     * Deactivate a persona
     */
    public deactivatePersona(persona: PersonaType): boolean {
        return this.activePersonas.delete(persona);
    }
    
    /**
     * Deactivate all personas
     */
    public deactivateAllPersonas(): void {
        this.activePersonas.clear();
    }
    
    /**
     * Get the state of an active persona
     */
    public getPersonaState(persona: PersonaType): PersonaState | undefined {
        return this.activePersonas.get(persona);
    }
    
    /**
     * Get all active personas
     */
    public getActivePersonas(): PersonaType[] {
        return Array.from(this.activePersonas.keys());
    }
    
    /**
     * Check if a persona is active
     */
    public isPersonaActive(persona: PersonaType): boolean {
        return this.activePersonas.has(persona);
    }
    
    /**
     * Update persona state data
     */
    public updatePersonaData(persona: PersonaType, data: Record<string, any>): void {
        const state = this.activePersonas.get(persona);
        if (state) {
            state.data = { ...state.data, ...data };
        }
    }
    
    /**
     * Record an interaction with a persona
     */
    public recordInteraction(persona: PersonaType): void {
        const state = this.activePersonas.get(persona);
        if (state) {
            state.interactionCount++;
            state.lastInteraction = new Date();
        }
    }
    
    /**
     * Add a custom activation trigger
     */
    public addActivationTrigger(trigger: PersonaActivationTrigger): void {
        this.activationTriggers.push(trigger);
    }
    
    /**
     * Remove activation triggers for a persona
     */
    public removeActivationTriggers(persona: PersonaType): void {
        this.activationTriggers = this.activationTriggers.filter(
            trigger => trigger.persona !== persona
        );
    }
    
    /**
     * Get all activation triggers
     */
    public getActivationTriggers(): PersonaActivationTrigger[] {
        return [...this.activationTriggers];
    }
    
    /**
     * Set cooldown period between activations
     */
    public setCooldownPeriod(milliseconds: number): void {
        (this as any).cooldownPeriod = milliseconds;
    }
}
