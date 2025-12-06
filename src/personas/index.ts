/**
 * Specter Personas module
 * Exports persona management and response generation functionality
 */

export {
    PersonaManager,
    PersonaActivationTrigger,
    PersonaContext,
    PersonaState,
    PersonaActivationResult
} from './PersonaManager';

export {
    PersonaResponseGenerator,
    VisualEffectType,
    VisualEffect,
    SoundEffect,
    ActionSuggestion,
    PersonaResponse
} from './PersonaResponseGenerator';

export {
    PersonaVisualOverlay,
    OverlayConfig
} from './PersonaVisualOverlay';

export {
    PersonaKiroIntegration,
    KiroAgentRequest,
    KiroAgentResponse
} from './PersonaKiroIntegration';

export {
    SpecterPersonas,
    SpecterPersonasConfig,
    PersonaEventType,
    PersonaEvent,
    PersonaEventListener
} from './SpecterPersonas';
