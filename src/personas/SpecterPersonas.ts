/**
 * SpecterPersonas - Main orchestrator for the Specter Personas system
 * Coordinates persona activation, response generation, and visual effects
 */

import { EmotionalState } from '../models/EmotionalModels';
import { PersonaType, UserAction, SessionInfo } from '../models/SystemModels';
import {
    PersonaManager,
    PersonaContext,
    PersonaState,
    PersonaActivationResult
} from './PersonaManager';
import {
    PersonaResponseGenerator,
    PersonaResponse,
    VisualEffect
} from './PersonaResponseGenerator';
import {
    PersonaVisualOverlay,
    OverlayConfig
} from './PersonaVisualOverlay';
import {
    PersonaKiroIntegration,
    KiroAgentRequest,
    KiroAgentResponse
} from './PersonaKiroIntegration';

/**
 * Configuration for Specter Personas system
 */
export interface SpecterPersonasConfig {
    /** Whether personas are enabled */
    enabled: boolean;
    
    /** Canvas element for visual overlays */
    canvas: HTMLCanvasElement;
    
    /** Whether to use Kiro AI integration */
    useKiroAI: boolean;
    
    /** Overlay opacity (0-1) */
    overlayOpacity: number;
    
    /** Maximum concurrent visual effects */
    maxConcurrentEffects: number;
    
    /** Cooldown between persona activations (ms) */
    activationCooldown: number;
}

/**
 * Event types for persona system
 */
export enum PersonaEventType {
    ACTIVATED = 'persona_activated',
    DEACTIVATED = 'persona_deactivated',
    RESPONSE_GENERATED = 'response_generated',
    INTERACTION = 'persona_interaction',
    ERROR = 'persona_error'
}

/**
 * Persona system event
 */
export interface PersonaEvent {
    type: PersonaEventType;
    persona: PersonaType;
    timestamp: Date;
    data?: any;
}

/**
 * Event listener callback
 */
export type PersonaEventListener = (event: PersonaEvent) => void;

/**
 * Main orchestrator for Specter Personas system
 */
export class SpecterPersonas {
    private config: SpecterPersonasConfig;
    private manager: PersonaManager;
    private responseGenerator: PersonaResponseGenerator;
    private visualOverlay: PersonaVisualOverlay;
    private kiroIntegration: PersonaKiroIntegration;
    private eventListeners: Map<PersonaEventType, PersonaEventListener[]> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly updateFrequency: number = 5000; // Check every 5 seconds
    
    constructor(config: SpecterPersonasConfig) {
        this.config = config;
        
        // Initialize components
        this.manager = new PersonaManager();
        this.manager.setCooldownPeriod(config.activationCooldown);
        
        this.responseGenerator = new PersonaResponseGenerator();
        
        const overlayConfig: OverlayConfig = {
            canvas: config.canvas,
            enabled: config.enabled,
            opacity: config.overlayOpacity,
            useHardwareAcceleration: true,
            maxConcurrentEffects: config.maxConcurrentEffects
        };
        this.visualOverlay = new PersonaVisualOverlay(overlayConfig);
        
        this.kiroIntegration = new PersonaKiroIntegration();
        
        // Start automatic update loop if enabled
        if (config.enabled) {
            this.startUpdateLoop();
        }
    }
    
    /**
     * Update persona system with current context
     */
    public update(
        emotionalState: EmotionalState,
        recentActions: UserAction[],
        session: SessionInfo
    ): void {
        if (!this.config.enabled) {
            return;
        }
        
        // Build context
        const context: PersonaContext = {
            emotionalState,
            recentActions,
            session,
            activePersonas: this.manager.getActivePersonas(),
            timeSinceLastActivation: 0,
            metadata: {}
        };
        
        // Update manager context
        this.manager.updateContext(context);
        
        // Check for persona activations
        const activationResults = this.manager.checkActivationTriggers();
        
        for (const result of activationResults) {
            if (result.shouldActivate) {
                this.activatePersona(result.persona, result.suggestedIntensity || 0.7, context);
            }
        }
    }
    
    /**
     * Activate a persona
     */
    private activatePersona(
        persona: PersonaType,
        intensity: number,
        context: PersonaContext
    ): void {
        // Activate in manager
        const state = this.manager.activatePersona(persona, intensity);
        
        // Start transition animation
        const currentActive = this.manager.getActivePersonas();
        const previousPersona = currentActive.length > 1 ? currentActive[0] : null;
        this.visualOverlay.startTransition(previousPersona, persona, 1000);
        
        // Generate and display response
        this.generateAndDisplayResponse(persona, context, intensity);
        
        // Emit activation event
        this.emitEvent({
            type: PersonaEventType.ACTIVATED,
            persona,
            timestamp: new Date(),
            data: { state, intensity }
        });
    }
    
    /**
     * Deactivate a persona
     */
    public deactivatePersona(persona: PersonaType): void {
        const wasActive = this.manager.deactivatePersona(persona);
        
        if (wasActive) {
            this.emitEvent({
                type: PersonaEventType.DEACTIVATED,
                persona,
                timestamp: new Date()
            });
        }
    }
    
    /**
     * Generate and display persona response
     */
    private async generateAndDisplayResponse(
        persona: PersonaType,
        context: PersonaContext,
        intensity: number
    ): Promise<void> {
        try {
            let response: PersonaResponse;
            
            // Use Kiro AI if enabled and available
            if (this.config.useKiroAI && this.kiroIntegration.isKiroAvailable()) {
                response = await this.generateAIResponse(persona, context, intensity);
            } else {
                // Use template-based response
                response = this.responseGenerator.generateResponse(persona, context, intensity);
            }
            
            // Display visual effect
            this.visualOverlay.triggerEffect(response.visualOverlay, persona);
            
            // Record interaction
            this.manager.recordInteraction(persona);
            
            // Emit response event
            this.emitEvent({
                type: PersonaEventType.RESPONSE_GENERATED,
                persona,
                timestamp: new Date(),
                data: response
            });
        } catch (error) {
            console.error('Failed to generate persona response:', error);
            this.emitEvent({
                type: PersonaEventType.ERROR,
                persona,
                timestamp: new Date(),
                data: { error }
            });
        }
    }
    
    /**
     * Generate AI-powered response using Kiro integration
     */
    private async generateAIResponse(
        persona: PersonaType,
        context: PersonaContext,
        intensity: number
    ): Promise<PersonaResponse> {
        const request: KiroAgentRequest = {
            persona,
            context,
            prompt: this.buildAIPrompt(persona, context),
            temperature: 0.7
        };
        
        const aiResponse = await this.kiroIntegration.generateAIResponse(request);
        
        // Convert AI response to PersonaResponse format
        const templateResponse = this.responseGenerator.generateResponse(persona, context, intensity);
        
        return {
            ...templateResponse,
            textMessage: aiResponse.text,
            actionSuggestion: aiResponse.suggestions[0],
            confidence: aiResponse.confidence
        };
    }
    
    /**
     * Build AI prompt based on persona and context
     */
    private buildAIPrompt(persona: PersonaType, context: PersonaContext): string {
        const state = context.emotionalState;
        
        switch (persona) {
            case PersonaType.MUSE:
                return `The developer is feeling ${state.primary} with ${state.intensity.toFixed(2)} intensity. 
                        Provide encouraging, creative guidance to help them maintain flow.`;
            
            case PersonaType.CRITIC:
                return `The developer has encountered ${context.session.errorCount} errors and is feeling ${state.primary}. 
                        Provide constructive, actionable feedback to help them resolve issues.`;
            
            case PersonaType.ARCHIVIST:
                return `Summarize the developer's session: ${context.session.actionCount} actions, 
                        ${context.session.filesEdited.length} files edited, emotional state: ${state.primary}. 
                        Provide reflective insights about their work patterns.`;
            
            default:
                return 'Provide helpful guidance to the developer.';
        }
    }
    
    /**
     * Manually trigger a persona interaction
     */
    public async triggerInteraction(
        persona: PersonaType,
        customPrompt?: string
    ): Promise<PersonaResponse | null> {
        if (!this.config.enabled) {
            return null;
        }
        
        // Get current context from manager
        const context = (this.manager as any).context;
        if (!context) {
            console.warn('No context available for persona interaction');
            return null;
        }
        
        // Activate persona if not already active
        if (!this.manager.isPersonaActive(persona)) {
            this.manager.activatePersona(persona, 0.7);
        }
        
        // Generate response
        let response: PersonaResponse;
        
        if (customPrompt && this.config.useKiroAI) {
            const request: KiroAgentRequest = {
                persona,
                context,
                prompt: customPrompt,
                temperature: 0.7
            };
            
            const aiResponse = await this.kiroIntegration.generateAIResponse(request);
            const templateResponse = this.responseGenerator.generateResponse(persona, context, 0.7);
            
            response = {
                ...templateResponse,
                textMessage: aiResponse.text,
                confidence: aiResponse.confidence
            };
        } else {
            response = this.responseGenerator.generateResponse(persona, context, 0.7);
        }
        
        // Display visual effect
        this.visualOverlay.triggerEffect(response.visualOverlay, persona);
        
        // Record interaction
        this.manager.recordInteraction(persona);
        
        // Emit event
        this.emitEvent({
            type: PersonaEventType.INTERACTION,
            persona,
            timestamp: new Date(),
            data: response
        });
        
        return response;
    }
    
    /**
     * Get active personas
     */
    public getActivePersonas(): PersonaType[] {
        return this.manager.getActivePersonas();
    }
    
    /**
     * Get persona state
     */
    public getPersonaState(persona: PersonaType): PersonaState | undefined {
        return this.manager.getPersonaState(persona);
    }
    
    /**
     * Check if a persona is active
     */
    public isPersonaActive(persona: PersonaType): boolean {
        return this.manager.isPersonaActive(persona);
    }
    
    /**
     * Start automatic update loop
     */
    private startUpdateLoop(): void {
        if (this.updateInterval) {
            return;
        }
        
        this.updateInterval = setInterval(() => {
            // Automatic updates would be triggered by external system
            // This is just a placeholder for the update mechanism
        }, this.updateFrequency);
    }
    
    /**
     * Stop automatic update loop
     */
    private stopUpdateLoop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Add event listener
     */
    public addEventListener(type: PersonaEventType, listener: PersonaEventListener): void {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type)!.push(listener);
    }
    
    /**
     * Remove event listener
     */
    public removeEventListener(type: PersonaEventType, listener: PersonaEventListener): void {
        const listeners = this.eventListeners.get(type);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to listeners
     */
    private emitEvent(event: PersonaEvent): void {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error('Error in persona event listener:', error);
                }
            }
        }
    }
    
    /**
     * Enable or disable personas
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        this.visualOverlay.setEnabled(enabled);
        
        if (enabled) {
            this.startUpdateLoop();
        } else {
            this.stopUpdateLoop();
            this.manager.deactivateAllPersonas();
        }
    }
    
    /**
     * Set overlay opacity
     */
    public setOverlayOpacity(opacity: number): void {
        this.config.overlayOpacity = opacity;
        this.visualOverlay.setOpacity(opacity);
    }
    
    /**
     * Clear all visual effects
     */
    public clearVisualEffects(): void {
        this.visualOverlay.clearEffects();
    }
    
    /**
     * Dispose of all resources
     */
    public dispose(): void {
        this.stopUpdateLoop();
        this.manager.deactivateAllPersonas();
        this.visualOverlay.dispose();
        this.kiroIntegration.clearCache();
        this.eventListeners.clear();
    }
}
