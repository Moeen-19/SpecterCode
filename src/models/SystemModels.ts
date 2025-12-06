/**
 * System state and user action models for MirrorCanvas
 * Defines structures for capturing user interactions and coordinating system state
 */

import { EmotionalState } from './EmotionalModels';
import { ThemeSpec, ThemePreset } from './ThemeModels';

/**
 * Types of user actions that can be captured
 */
export enum UserActionType {
    TYPING = 'typing',
    SAVE = 'save',
    COMPILE = 'compile',
    ERROR = 'error',
    HOVER = 'hover',
    CLICK = 'click',
    DELETE = 'delete',
    UNDO = 'undo',
    REDO = 'redo',
    OPEN_FILE = 'open_file',
    CLOSE_FILE = 'close_file',
    SWITCH_TAB = 'switch_tab',
    SCROLL = 'scroll',
    SELECT = 'select',
    PASTE = 'paste',
    CUT = 'cut',
    COPY = 'copy',
    SEARCH = 'search',
    REPLACE = 'replace',
    FORMAT = 'format',
    REFACTOR = 'refactor',
    DEBUG = 'debug',
    RUN = 'run',
    IDLE = 'idle'
}

/**
 * Represents a user action in the editor
 */
export interface UserAction {
    /** Unique identifier for this action */
    id: string;
    
    /** Type of action performed */
    type: UserActionType;
    
    /** Timestamp when the action occurred */
    timestamp: Date;
    
    /** Context information about the action */
    context: ActionContext;
    
    /** Duration of the action in milliseconds (for continuous actions) */
    duration?: number;
    
    /** Whether this action was successful */
    success: boolean;
    
    /** Error message if action failed */
    errorMessage?: string;
}

/**
 * Context information for user actions
 */
export interface ActionContext {
    /** File type/extension being edited */
    fileType?: string;
    
    /** Programming language */
    language?: string;
    
    /** Current line number */
    lineNumber?: number;
    
    /** Current column number */
    columnNumber?: number;
    
    /** Number of characters typed (for typing actions) */
    characterCount?: number;
    
    /** Typing speed in characters per minute */
    typingSpeed?: number;
    
    /** Number of errors in current file */
    errorCount?: number;
    
    /** Error severity if applicable */
    errorSeverity?: 'error' | 'warning' | 'info';
    
    /** Session duration in milliseconds */
    sessionDuration?: number;
    
    /** Time since last action in milliseconds */
    timeSinceLastAction?: number;
    
    /** Current file path */
    filePath?: string;
    
    /** Project/workspace name */
    projectName?: string;
    
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Persona types that can be activated
 */
export enum PersonaType {
    MUSE = 'muse',
    CRITIC = 'critic',
    ARCHIVIST = 'archivist',
    NONE = 'none'
}

/**
 * System state coordinating all components
 */
export interface SystemState {
    /** Current emotional state */
    currentEmotion: EmotionalState;
    
    /** Active theme specification */
    activeTheme: ThemeSpec;
    
    /** Currently active personas */
    activePersonas: PersonaType[];
    
    /** User configuration and preferences */
    userPreferences: UserConfig;
    
    /** System performance metrics */
    performance: PerformanceMetrics;
    
    /** Extension activation status */
    isActive: boolean;
    
    /** Current session information */
    session: SessionInfo;
    
    /** Component states */
    components: ComponentStates;
}

/**
 * User configuration and preferences
 */
export interface UserConfig {
    /** Whether MirrorCanvas is enabled */
    enabled: boolean;
    
    /** Selected theme preset or custom theme ID */
    theme: ThemePreset | string;
    
    /** Emotion detection sensitivity (0.1 - 1.0) */
    emotionSensitivity: number;
    
    /** Animation intensity (0.0 - 1.0) */
    animationIntensity: number;
    
    /** Whether audio is enabled */
    audioEnabled: boolean;
    
    /** Audio volume (0.0 - 1.0) */
    audioVolume: number;
    
    /** Whether to enable particle effects */
    particlesEnabled: boolean;
    
    /** Particle density override (0 - 100) */
    particleDensity?: number;
    
    /** Whether to enable persona interactions */
    personasEnabled: boolean;
    
    /** Performance mode setting */
    performanceMode: PerformanceMode;
    
    /** Whether to collect emotional history */
    collectHistory: boolean;
    
    /** Custom theme specifications */
    customThemes: Record<string, ThemeSpec>;
    
    /** Keyboard shortcuts customization */
    shortcuts: Record<string, string>;
    
    /** Privacy settings */
    privacy: PrivacySettings;
}

/**
 * Performance mode settings
 */
export enum PerformanceMode {
    HIGH_QUALITY = 'high-quality',
    BALANCED = 'balanced',
    PERFORMANCE = 'performance',
    MINIMAL = 'minimal'
}

/**
 * Privacy settings for data collection
 */
export interface PrivacySettings {
    /** Allow emotional data collection */
    allowEmotionalTracking: boolean;
    
    /** Allow usage analytics */
    allowAnalytics: boolean;
    
    /** Allow crash reporting */
    allowCrashReports: boolean;
    
    /** Anonymize collected data */
    anonymizeData: boolean;
}

/**
 * Performance metrics for system monitoring
 */
export interface PerformanceMetrics {
    /** Current frames per second for animations */
    fps: number;
    
    /** Memory usage in megabytes */
    memoryUsage: number;
    
    /** CPU usage percentage */
    cpuUsage: number;
    
    /** Number of active animations */
    activeAnimations: number;
    
    /** Number of active particles */
    activeParticles: number;
    
    /** Audio latency in milliseconds */
    audioLatency: number;
    
    /** Last performance check timestamp */
    lastCheck: Date;
    
    /** Performance warnings */
    warnings: string[];
}

/**
 * Current session information
 */
export interface SessionInfo {
    /** Unique session identifier */
    sessionId: string;
    
    /** Session start time */
    startTime: Date;
    
    /** Last activity time */
    lastActivityTime: Date;
    
    /** Total actions performed in session */
    actionCount: number;
    
    /** Total typing time in milliseconds */
    typingTime: number;
    
    /** Total idle time in milliseconds */
    idleTime: number;
    
    /** Files edited in this session */
    filesEdited: string[];
    
    /** Errors encountered in this session */
    errorCount: number;
    
    /** Successful compiles/runs in this session */
    successCount: number;
}

/**
 * States of individual system components
 */
export interface ComponentStates {
    /** Emotion engine state */
    emotionEngine: ComponentState;
    
    /** Vibe coding layer state */
    vibeLayer: ComponentState;
    
    /** Memory canvas state */
    memoryCanvas: ComponentState;
    
    /** Specter personas state */
    personas: ComponentState;
    
    /** Configuration manager state */
    configManager: ComponentState;
}

/**
 * Individual component state
 */
export interface ComponentState {
    /** Whether the component is initialized */
    initialized: boolean;
    
    /** Whether the component is active */
    active: boolean;
    
    /** Last update timestamp */
    lastUpdate: Date;
    
    /** Component-specific status message */
    status: string;
    
    /** Component errors if any */
    errors: string[];
    
    /** Component-specific data */
    data?: Record<string, any>;
}

/**
 * Event types for system events
 */
export enum SystemEventType {
    STATE_CHANGED = 'state_changed',
    EMOTION_UPDATED = 'emotion_updated',
    THEME_CHANGED = 'theme_changed',
    PERSONA_ACTIVATED = 'persona_activated',
    PERSONA_DEACTIVATED = 'persona_deactivated',
    CONFIG_UPDATED = 'config_updated',
    PERFORMANCE_WARNING = 'performance_warning',
    ERROR_OCCURRED = 'error_occurred',
    SESSION_STARTED = 'session_started',
    SESSION_ENDED = 'session_ended'
}

/**
 * System event for component communication
 */
export interface SystemEvent {
    /** Event type */
    type: SystemEventType;
    
    /** Timestamp of the event */
    timestamp: Date;
    
    /** Source component that generated the event */
    source: string;
    
    /** Event payload data */
    payload: any;
    
    /** Event priority (higher = more important) */
    priority: number;
}

/**
 * Command types for system commands
 */
export enum CommandType {
    ACTIVATE_EXTENSION = 'activate_extension',
    DEACTIVATE_EXTENSION = 'deactivate_extension',
    SWITCH_THEME = 'switch_theme',
    TOGGLE_AUDIO = 'toggle_audio',
    TOGGLE_PARTICLES = 'toggle_particles',
    TOGGLE_PERSONAS = 'toggle_personas',
    SHOW_SETTINGS = 'show_settings',
    SHOW_EMOTIONAL_JOURNEY = 'show_emotional_journey',
    RESET_SESSION = 'reset_session',
    EXPORT_DATA = 'export_data',
    IMPORT_THEME = 'import_theme',
    EXPORT_THEME = 'export_theme'
}

/**
 * System command for executing actions
 */
export interface SystemCommand {
    /** Command type */
    type: CommandType;
    
    /** Command parameters */
    params?: Record<string, any>;
    
    /** Timestamp when command was issued */
    timestamp: Date;
    
    /** User who issued the command */
    userId?: string;
}

/**
 * Result of command execution
 */
export interface CommandResult {
    /** Whether the command succeeded */
    success: boolean;
    
    /** Result message */
    message: string;
    
    /** Result data if any */
    data?: any;
    
    /** Errors if command failed */
    errors?: string[];
}
