/**
 * Utility functions for system state management and user action processing
 */

import {
    UserAction,
    UserActionType,
    ActionContext,
    SystemState,
    UserConfig,
    PerformanceMode,
    SessionInfo,
    ComponentState,
    SystemEvent,
    SystemEventType,
    PersonaType
} from './SystemModels';
import { EmotionalState, EmotionType, EmotionalTrend } from './EmotionalModels';
import { ThemePreset } from './ThemeModels';
import { createHalloweenTheme } from './ThemeUtils';

/**
 * Creates a new user action
 */
export function createUserAction(
    type: UserActionType,
    context: Partial<ActionContext> = {},
    success: boolean = true
): UserAction {
    return {
        id: generateActionId(),
        type,
        timestamp: new Date(),
        context: context as ActionContext,
        success,
    };
}

/**
 * Generates a unique action ID
 */
function generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates default user configuration
 */
export function createDefaultUserConfig(): UserConfig {
    return {
        enabled: true,
        theme: ThemePreset.HALLOWEEN,
        emotionSensitivity: 0.7,
        animationIntensity: 0.8,
        audioEnabled: true,
        audioVolume: 0.3,
        particlesEnabled: true,
        personasEnabled: true,
        performanceMode: PerformanceMode.BALANCED,
        collectHistory: true,
        customThemes: {},
        shortcuts: {
            toggleMirrorCanvas: 'ctrl+shift+m',
            switchTheme: 'ctrl+shift+t',
            showSettings: 'ctrl+shift+p'
        },
        privacy: {
            allowEmotionalTracking: true,
            allowAnalytics: false,
            allowCrashReports: true,
            anonymizeData: true
        }
    };
}

/**
 * Creates initial system state
 */
export function createInitialSystemState(): SystemState {
    return {
        currentEmotion: createNeutralEmotionalState(),
        activeTheme: createHalloweenTheme(),
        activePersonas: [],
        userPreferences: createDefaultUserConfig(),
        performance: createInitialPerformanceMetrics(),
        isActive: false,
        session: createNewSession(),
        components: createInitialComponentStates()
    };
}

/**
 * Creates a neutral emotional state
 */
function createNeutralEmotionalState(): EmotionalState {
    return {
        primary: EmotionType.CALM,
        intensity: 0.5,
        stability: 1.0,
        trend: EmotionalTrend.STABLE,
        confidence: 1.0,
        duration: 0,
        vector: {
            calm: 0.5,
            tense: 0.0,
            curious: 0.0,
            excited: 0.0,
            frustrated: 0.0,
            timestamp: new Date(),
            confidence: 1.0
        }
    };
}

/**
 * Creates initial performance metrics
 */
function createInitialPerformanceMetrics() {
    return {
        fps: 60,
        memoryUsage: 0,
        cpuUsage: 0,
        activeAnimations: 0,
        activeParticles: 0,
        audioLatency: 0,
        lastCheck: new Date(),
        warnings: []
    };
}

/**
 * Creates a new session
 */
export function createNewSession(): SessionInfo {
    return {
        sessionId: generateSessionId(),
        startTime: new Date(),
        lastActivityTime: new Date(),
        actionCount: 0,
        typingTime: 0,
        idleTime: 0,
        filesEdited: [],
        errorCount: 0,
        successCount: 0
    };
}

/**
 * Generates a unique session ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates initial component states
 */
function createInitialComponentStates() {
    const createState = (name: string): ComponentState => ({
        initialized: false,
        active: false,
        lastUpdate: new Date(),
        status: `${name} not initialized`,
        errors: []
    });

    return {
        emotionEngine: createState('Emotion Engine'),
        vibeLayer: createState('Vibe Layer'),
        memoryCanvas: createState('Memory Canvas'),
        personas: createState('Personas'),
        configManager: createState('Config Manager')
    };
}

/**
 * Updates session with a new user action
 */
export function updateSessionWithAction(
    session: SessionInfo,
    action: UserAction
): SessionInfo {
    const updatedSession = { ...session };
    
    updatedSession.actionCount++;
    updatedSession.lastActivityTime = action.timestamp;
    
    // Update typing time
    if (action.type === UserActionType.TYPING && action.duration) {
        updatedSession.typingTime += action.duration;
    }
    
    // Update idle time
    if (action.type === UserActionType.IDLE && action.duration) {
        updatedSession.idleTime += action.duration;
    }
    
    // Track files edited
    if (action.context.filePath && !updatedSession.filesEdited.includes(action.context.filePath)) {
        updatedSession.filesEdited.push(action.context.filePath);
    }
    
    // Track errors
    if (action.type === UserActionType.ERROR) {
        updatedSession.errorCount++;
    }
    
    // Track successes
    if ((action.type === UserActionType.COMPILE || action.type === UserActionType.RUN) && action.success) {
        updatedSession.successCount++;
    }
    
    return updatedSession;
}

/**
 * Calculates typing speed from action context
 */
export function calculateTypingSpeed(
    characterCount: number,
    durationMs: number
): number {
    if (durationMs === 0) return 0;
    const minutes = durationMs / 60000;
    return characterCount / minutes;
}

/**
 * Creates a system event
 */
export function createSystemEvent(
    type: SystemEventType,
    source: string,
    payload: any,
    priority: number = 1
): SystemEvent {
    return {
        type,
        timestamp: new Date(),
        source,
        payload,
        priority
    };
}

/**
 * Determines if performance mode should be adjusted based on metrics
 */
export function shouldAdjustPerformanceMode(
    currentMode: PerformanceMode,
    metrics: SystemState['performance']
): { shouldAdjust: boolean; suggestedMode?: PerformanceMode; reason?: string } {
    // Check FPS
    if (metrics.fps < 30 && currentMode !== PerformanceMode.MINIMAL) {
        return {
            shouldAdjust: true,
            suggestedMode: PerformanceMode.PERFORMANCE,
            reason: 'Low FPS detected'
        };
    }
    
    // Check memory usage (assuming threshold of 500MB)
    if (metrics.memoryUsage > 500 && currentMode === PerformanceMode.HIGH_QUALITY) {
        return {
            shouldAdjust: true,
            suggestedMode: PerformanceMode.BALANCED,
            reason: 'High memory usage detected'
        };
    }
    
    // Check CPU usage
    if (metrics.cpuUsage > 80 && currentMode !== PerformanceMode.MINIMAL) {
        return {
            shouldAdjust: true,
            suggestedMode: PerformanceMode.PERFORMANCE,
            reason: 'High CPU usage detected'
        };
    }
    
    return { shouldAdjust: false };
}

/**
 * Applies performance mode adjustments to user config
 */
export function applyPerformanceMode(
    config: UserConfig,
    mode: PerformanceMode
): UserConfig {
    const adjusted = { ...config, performanceMode: mode };
    
    switch (mode) {
        case PerformanceMode.HIGH_QUALITY:
            adjusted.animationIntensity = 1.0;
            adjusted.particlesEnabled = true;
            adjusted.particleDensity = undefined; // Use theme default
            break;
            
        case PerformanceMode.BALANCED:
            adjusted.animationIntensity = 0.7;
            adjusted.particlesEnabled = true;
            adjusted.particleDensity = 10;
            break;
            
        case PerformanceMode.PERFORMANCE:
            adjusted.animationIntensity = 0.4;
            adjusted.particlesEnabled = true;
            adjusted.particleDensity = 5;
            break;
            
        case PerformanceMode.MINIMAL:
            adjusted.animationIntensity = 0.1;
            adjusted.particlesEnabled = false;
            adjusted.audioEnabled = false;
            break;
    }
    
    return adjusted;
}

/**
 * Validates user configuration
 */
export function validateUserConfig(config: UserConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (config.emotionSensitivity < 0.1 || config.emotionSensitivity > 1.0) {
        errors.push('emotionSensitivity must be between 0.1 and 1.0');
    }
    
    if (config.animationIntensity < 0.0 || config.animationIntensity > 1.0) {
        errors.push('animationIntensity must be between 0.0 and 1.0');
    }
    
    if (config.audioVolume < 0.0 || config.audioVolume > 1.0) {
        errors.push('audioVolume must be between 0.0 and 1.0');
    }
    
    if (config.particleDensity !== undefined && (config.particleDensity < 0 || config.particleDensity > 100)) {
        errors.push('particleDensity must be between 0 and 100');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Determines which personas should be active based on emotional state
 */
export function determineActivePersonas(emotion: EmotionalState): PersonaType[] {
    const personas: PersonaType[] = [];
    
    // Muse activates when calm or curious
    if (emotion.primary === EmotionType.CALM || emotion.primary === EmotionType.CURIOUS) {
        if (emotion.intensity > 0.6) {
            personas.push(PersonaType.MUSE);
        }
    }
    
    // Critic activates when frustrated or tense
    if (emotion.primary === EmotionType.FRUSTRATED || emotion.primary === EmotionType.TENSE) {
        if (emotion.intensity > 0.5) {
            personas.push(PersonaType.CRITIC);
        }
    }
    
    // Archivist can be activated at session end or during stable periods
    if (emotion.stability > 0.8 && emotion.duration > 300000) { // 5 minutes
        personas.push(PersonaType.ARCHIVIST);
    }
    
    return personas;
}

/**
 * Merges partial system state with existing state
 */
export function mergeSystemState(
    current: SystemState,
    updates: Partial<SystemState>
): SystemState {
    return {
        ...current,
        ...updates,
        components: updates.components ? {
            ...current.components,
            ...updates.components
        } : current.components,
        userPreferences: updates.userPreferences ? {
            ...current.userPreferences,
            ...updates.userPreferences
        } : current.userPreferences
    };
}
