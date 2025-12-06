/**
 * PersonaResponseGenerator - Generates contextual responses for Specter Personas
 * Implements template-based response system with persona-specific patterns
 */

import { EmotionalState, EmotionType } from '../models/EmotionalModels';
import { PersonaType, UserAction, UserActionType } from '../models/SystemModels';
import { PersonaContext } from './PersonaManager';

/**
 * Visual effect types for persona manifestations
 */
export enum VisualEffectType {
    GLITCH = 'glitch',
    GLOW = 'glow',
    RIBBONS = 'ribbons',
    SPARKLE = 'sparkle',
    PULSE = 'pulse',
    FADE = 'fade',
    SHIMMER = 'shimmer',
    STATIC = 'static'
}

/**
 * Visual effect configuration
 */
export interface VisualEffect {
    /** Type of visual effect */
    type: VisualEffectType;
    
    /** Effect intensity (0-1) */
    intensity: number;
    
    /** Effect duration in milliseconds */
    duration: number;
    
    /** Effect color (hex or rgba) */
    color?: string;
    
    /** Effect position */
    position?: {
        x: number;
        y: number;
    };
    
    /** Additional effect parameters */
    params?: Record<string, any>;
}

/**
 * Sound effect configuration
 */
export interface SoundEffect {
    /** Sound file identifier */
    soundId: string;
    
    /** Volume (0-1) */
    volume: number;
    
    /** Whether to loop the sound */
    loop: boolean;
    
    /** Fade in duration in milliseconds */
    fadeIn?: number;
    
    /** Fade out duration in milliseconds */
    fadeOut?: number;
}

/**
 * Action suggestion from a persona
 */
export interface ActionSuggestion {
    /** Type of action suggested */
    actionType: string;
    
    /** Description of the suggestion */
    description: string;
    
    /** Command to execute if user accepts */
    command?: string;
    
    /** Priority of the suggestion (0-1) */
    priority: number;
    
    /** Additional context */
    context?: Record<string, any>;
}

/**
 * Complete persona response
 */
export interface PersonaResponse {
    /** Persona that generated this response */
    persona: PersonaType;
    
    /** Visual overlay effect */
    visualOverlay: VisualEffect;
    
    /** Audio effect */
    audioEffect?: SoundEffect;
    
    /** Text message to display */
    textMessage?: string;
    
    /** Action suggestion */
    actionSuggestion?: ActionSuggestion;
    
    /** Response timestamp */
    timestamp: Date;
    
    /** Response confidence (0-1) */
    confidence: number;
}

/**
 * Response template for generating contextual messages
 */
interface ResponseTemplate {
    /** Template patterns with {variable} placeholders */
    patterns: string[];
    
    /** Conditions for using this template */
    conditions?: {
        emotions?: EmotionType[];
        actions?: UserActionType[];
        minIntensity?: number;
    };
    
    /** Visual effect to accompany this template */
    visualEffect: VisualEffectType;
    
    /** Optional sound effect */
    soundEffect?: string;
}

/**
 * Generates contextual responses for Specter Personas
 */
export class PersonaResponseGenerator {
    private museTemplates: ResponseTemplate[] = [];
    private criticTemplates: ResponseTemplate[] = [];
    private archivistTemplates: ResponseTemplate[] = [];
    
    constructor() {
        this.initializeTemplates();
    }
    
    /**
     * Initialize response templates for each persona
     */
    private initializeTemplates(): void {
        // Muse templates - encouraging and creative
        this.museTemplates = [
            {
                patterns: [
                    "Your code flows beautifully today. Keep this rhythm going.",
                    "I sense creative energy in your work. Let it guide you.",
                    "The patterns you're creating are elegant. Trust your instincts."
                ],
                conditions: {
                    emotions: [EmotionType.CALM, EmotionType.CURIOUS],
                    minIntensity: 0.5
                },
                visualEffect: VisualEffectType.GLOW,
                soundEffect: 'muse_whisper'
            },
            {
                patterns: [
                    "Take a moment to breathe. Clarity will follow.",
                    "Sometimes the best code comes after a pause.",
                    "Your mind is sharp. A brief rest will sharpen it further."
                ],
                conditions: {
                    emotions: [EmotionType.TENSE],
                    minIntensity: 0.4
                },
                visualEffect: VisualEffectType.PULSE,
                soundEffect: 'muse_calm'
            },
            {
                patterns: [
                    "Explore this path. I sense potential here.",
                    "Your curiosity is leading you somewhere interesting.",
                    "This direction feels promising. Follow it."
                ],
                conditions: {
                    emotions: [EmotionType.CURIOUS],
                    minIntensity: 0.6
                },
                visualEffect: VisualEffectType.SPARKLE,
                soundEffect: 'muse_inspire'
            }
        ];
        
        // Critic templates - constructive and analytical
        this.criticTemplates = [
            {
                patterns: [
                    "I notice {errorCount} errors. Let's address them systematically.",
                    "These errors are solvable. Start with the most critical one.",
                    "Don't let frustration cloud your judgment. Break it down step by step."
                ],
                conditions: {
                    emotions: [EmotionType.FRUSTRATED],
                    actions: [UserActionType.ERROR],
                    minIntensity: 0.4
                },
                visualEffect: VisualEffectType.GLITCH,
                soundEffect: 'critic_alert'
            },
            {
                patterns: [
                    "Consider refactoring this section. It could be clearer.",
                    "This approach works, but there might be a more elegant solution.",
                    "Your logic is sound, but the structure could be improved."
                ],
                conditions: {
                    emotions: [EmotionType.CALM, EmotionType.CURIOUS],
                    minIntensity: 0.3
                },
                visualEffect: VisualEffectType.SHIMMER,
                soundEffect: 'critic_suggest'
            },
            {
                patterns: [
                    "You've been stuck here for a while. Try a different approach.",
                    "Sometimes stepping back reveals the solution.",
                    "This pattern isn't working. Let's try something new."
                ],
                conditions: {
                    emotions: [EmotionType.FRUSTRATED, EmotionType.TENSE],
                    minIntensity: 0.6
                },
                visualEffect: VisualEffectType.STATIC,
                soundEffect: 'critic_warn'
            }
        ];
        
        // Archivist templates - reflective and summarizing
        this.archivistTemplates = [
            {
                patterns: [
                    "You've been coding for {sessionDuration} minutes. Impressive focus.",
                    "This session: {actionCount} actions, {filesEdited} files touched.",
                    "Your productivity today has been remarkable. Well done."
                ],
                conditions: {
                    minIntensity: 0.3
                },
                visualEffect: VisualEffectType.RIBBONS,
                soundEffect: 'archivist_summary'
            },
            {
                patterns: [
                    "I've recorded your emotional journey. Mostly {dominantEmotion} today.",
                    "Your mood has been {trend} throughout this session.",
                    "Interesting patterns in your work rhythm today."
                ],
                conditions: {
                    minIntensity: 0.4
                },
                visualEffect: VisualEffectType.FADE,
                soundEffect: 'archivist_reflect'
            },
            {
                patterns: [
                    "Time to save your progress. You've accomplished much.",
                    "Consider committing your work. It's been a productive session.",
                    "Your work today deserves to be preserved."
                ],
                conditions: {
                    actions: [UserActionType.SAVE],
                    minIntensity: 0.5
                },
                visualEffect: VisualEffectType.GLOW,
                soundEffect: 'archivist_preserve'
            }
        ];
    }
    
    /**
     * Generate a response for a persona based on context
     */
    public generateResponse(
        persona: PersonaType,
        context: PersonaContext,
        intensity: number = 0.7
    ): PersonaResponse {
        const templates = this.getTemplatesForPersona(persona);
        const matchingTemplate = this.selectTemplate(templates, context);
        
        if (!matchingTemplate) {
            return this.generateDefaultResponse(persona, intensity);
        }
        
        const message = this.fillTemplate(matchingTemplate, context);
        const visualEffect = this.createVisualEffect(matchingTemplate.visualEffect, intensity);
        const audioEffect = matchingTemplate.soundEffect
            ? this.createSoundEffect(matchingTemplate.soundEffect, intensity)
            : undefined;
        
        const actionSuggestion = this.generateActionSuggestion(persona, context);
        
        return {
            persona,
            visualOverlay: visualEffect,
            audioEffect,
            textMessage: message,
            actionSuggestion,
            timestamp: new Date(),
            confidence: 0.8
        };
    }
    
    /**
     * Get templates for a specific persona
     */
    private getTemplatesForPersona(persona: PersonaType): ResponseTemplate[] {
        switch (persona) {
            case PersonaType.MUSE:
                return this.museTemplates;
            case PersonaType.CRITIC:
                return this.criticTemplates;
            case PersonaType.ARCHIVIST:
                return this.archivistTemplates;
            default:
                return [];
        }
    }
    
    /**
     * Select the most appropriate template based on context
     */
    private selectTemplate(
        templates: ResponseTemplate[],
        context: PersonaContext
    ): ResponseTemplate | null {
        const state = context.emotionalState;
        
        // Filter templates that match conditions
        const matchingTemplates = templates.filter(template => {
            if (!template.conditions) {
                return true;
            }
            
            const conditions = template.conditions;
            
            // Check emotion conditions
            if (conditions.emotions) {
                const hasMatchingEmotion = conditions.emotions.includes(state.primary) ||
                    (state.secondary && conditions.emotions.includes(state.secondary));
                if (!hasMatchingEmotion) {
                    return false;
                }
            }
            
            // Check intensity conditions
            if (conditions.minIntensity !== undefined) {
                if (state.intensity < conditions.minIntensity) {
                    return false;
                }
            }
            
            // Check action conditions
            if (conditions.actions) {
                const hasMatchingAction = context.recentActions.some(action =>
                    conditions.actions!.includes(action.type)
                );
                if (!hasMatchingAction) {
                    return false;
                }
            }
            
            return true;
        });
        
        if (matchingTemplates.length === 0) {
            return null;
        }
        
        // Select random template from matching ones
        const randomIndex = Math.floor(Math.random() * matchingTemplates.length);
        return matchingTemplates[randomIndex];
    }
    
    /**
     * Fill template with contextual variables
     */
    private fillTemplate(template: ResponseTemplate, context: PersonaContext): string {
        const pattern = template.patterns[Math.floor(Math.random() * template.patterns.length)];
        
        let message = pattern;
        
        // Replace variables
        message = message.replace('{errorCount}', context.session.errorCount.toString());
        message = message.replace('{actionCount}', context.session.actionCount.toString());
        message = message.replace('{filesEdited}', context.session.filesEdited.length.toString());
        
        const sessionDuration = Math.floor(
            (Date.now() - context.session.startTime.getTime()) / 60000
        );
        message = message.replace('{sessionDuration}', sessionDuration.toString());
        
        message = message.replace('{dominantEmotion}', context.emotionalState.primary);
        message = message.replace('{trend}', context.emotionalState.trend);
        
        return message;
    }
    
    /**
     * Create visual effect configuration
     */
    private createVisualEffect(type: VisualEffectType, intensity: number): VisualEffect {
        return {
            type,
            intensity: Math.max(0, Math.min(1, intensity)),
            duration: 3000, // 3 seconds default
            color: this.getEffectColor(type),
            params: {}
        };
    }
    
    /**
     * Get color for visual effect type
     */
    private getEffectColor(type: VisualEffectType): string {
        const colors: Record<VisualEffectType, string> = {
            [VisualEffectType.GLITCH]: '#ff0066',
            [VisualEffectType.GLOW]: '#00ffaa',
            [VisualEffectType.RIBBONS]: '#6600ff',
            [VisualEffectType.SPARKLE]: '#ffff00',
            [VisualEffectType.PULSE]: '#00aaff',
            [VisualEffectType.FADE]: '#aaaaaa',
            [VisualEffectType.SHIMMER]: '#ffaa00',
            [VisualEffectType.STATIC]: '#ff3333'
        };
        
        return colors[type] || '#ffffff';
    }
    
    /**
     * Create sound effect configuration
     */
    private createSoundEffect(soundId: string, intensity: number): SoundEffect {
        return {
            soundId,
            volume: Math.max(0.1, Math.min(0.8, intensity * 0.6)),
            loop: false,
            fadeIn: 500,
            fadeOut: 1000
        };
    }
    
    /**
     * Generate action suggestion based on persona and context
     */
    private generateActionSuggestion(
        persona: PersonaType,
        context: PersonaContext
    ): ActionSuggestion | undefined {
        const state = context.emotionalState;
        
        switch (persona) {
            case PersonaType.MUSE:
                if (state.primary === EmotionType.TENSE && state.intensity > 0.6) {
                    return {
                        actionType: 'take_break',
                        description: 'Take a 5-minute break to refresh your mind',
                        priority: 0.7
                    };
                }
                break;
                
            case PersonaType.CRITIC:
                if (context.session.errorCount > 5) {
                    return {
                        actionType: 'review_errors',
                        description: 'Review and fix errors systematically',
                        command: 'workbench.action.showErrorsWarnings',
                        priority: 0.8
                    };
                }
                break;
                
            case PersonaType.ARCHIVIST:
                const sessionDuration = Date.now() - context.session.startTime.getTime();
                if (sessionDuration > 1800000 && context.session.actionCount > 100) {
                    return {
                        actionType: 'save_progress',
                        description: 'Save and commit your progress',
                        command: 'workbench.action.files.saveAll',
                        priority: 0.6
                    };
                }
                break;
        }
        
        return undefined;
    }
    
    /**
     * Generate default response when no template matches
     */
    private generateDefaultResponse(persona: PersonaType, intensity: number): PersonaResponse {
        const defaultMessages: Record<PersonaType, string> = {
            [PersonaType.MUSE]: "I'm here to inspire you.",
            [PersonaType.CRITIC]: "Let's improve your code together.",
            [PersonaType.ARCHIVIST]: "I'm recording your journey.",
            [PersonaType.NONE]: ""
        };
        
        const defaultEffects: Record<PersonaType, VisualEffectType> = {
            [PersonaType.MUSE]: VisualEffectType.GLOW,
            [PersonaType.CRITIC]: VisualEffectType.SHIMMER,
            [PersonaType.ARCHIVIST]: VisualEffectType.FADE,
            [PersonaType.NONE]: VisualEffectType.FADE
        };
        
        return {
            persona,
            visualOverlay: this.createVisualEffect(defaultEffects[persona], intensity),
            textMessage: defaultMessages[persona],
            timestamp: new Date(),
            confidence: 0.5
        };
    }
    
    /**
     * Add custom response template
     */
    public addTemplate(persona: PersonaType, template: ResponseTemplate): void {
        const templates = this.getTemplatesForPersona(persona);
        templates.push(template);
    }
}
