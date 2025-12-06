/**
 * Theme specification data models for MirrorCanvas
 * Defines the structure for visual, audio, and behavioral themes
 */

/**
 * Complete theme specification defining all aspects of a MirrorCanvas theme
 */
export interface ThemeSpec {
    /** Theme metadata and identification */
    metadata: ThemeMetadata;
    
    /** Visual properties including colors, effects, and animations */
    visual: VisualSpec;
    
    /** Audio properties including ambient sounds and effects */
    audio: AudioSpec;
    
    /** Particle system configuration */
    particles: ParticleSpec;
    
    /** Animation behavior configuration */
    animations: AnimationSpec;
}

/**
 * Theme metadata and identification information
 */
export interface ThemeMetadata {
    /** Unique theme identifier (kebab-case) */
    id: string;
    
    /** Display name for the theme */
    name: string;
    
    /** Theme version (semver format) */
    version: string;
    
    /** Theme author/creator */
    author: string;
    
    /** Brief description of the theme */
    description: string;
    
    /** Tags for categorization and search */
    tags: string[];
    
    /** Preview image URL or path */
    previewImage?: string;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
}

/**
 * Visual specification for colors, effects, and styling
 */
export interface VisualSpec {
    /** Color palette for the theme */
    palette: ColorPalette;
    
    /** Visual effects configuration */
    effects: VisualEffects;
    
    /** Background configuration */
    background: BackgroundSpec;
    
    /** Lighting and glow effects */
    lighting: LightingSpec;
}

/**
 * Color palette defining theme colors
 */
export interface ColorPalette {
    /** Primary theme color (hex format) */
    primary: string;
    
    /** Secondary theme color (hex format) */
    secondary: string;
    
    /** Accent color for highlights (hex format) */
    accent: string;
    
    /** Background color or gradient stops (hex format) */
    background: string[];
    
    /** Text/foreground color (hex format) */
    foreground: string;
    
    /** Emotional state color mappings */
    emotional: {
        calm: string;
        tense: string;
        curious: string;
        excited: string;
        frustrated: string;
    };
}

/**
 * Visual effects configuration
 */
export interface VisualEffects {
    /** Glow intensity (0-1 scale) */
    glowIntensity: number;
    
    /** Blur amount for atmospheric effects (0-10 pixels) */
    blurAmount: number;
    
    /** Opacity for overlay effects (0-1 scale) */
    overlayOpacity: number;
    
    /** Saturation adjustment (-1 to 1, 0 = normal) */
    saturation: number;
    
    /** Brightness adjustment (-1 to 1, 0 = normal) */
    brightness: number;
    
    /** Contrast adjustment (-1 to 1, 0 = normal) */
    contrast: number;
    
    /** Enable chromatic aberration effect */
    chromaticAberration: boolean;
    
    /** Enable vignette effect */
    vignette: boolean;
    
    /** Vignette intensity if enabled (0-1 scale) */
    vignetteIntensity: number;
}

/**
 * Background specification
 */
export interface BackgroundSpec {
    /** Background type */
    type: 'solid' | 'gradient' | 'texture' | 'animated';
    
    /** Gradient direction if type is gradient */
    gradientDirection?: 'horizontal' | 'vertical' | 'diagonal' | 'radial';
    
    /** Texture image path if type is texture */
    texturePath?: string;
    
    /** Texture opacity (0-1 scale) */
    textureOpacity?: number;
    
    /** Enable procedural texture generation */
    proceduralTexture: boolean;
    
    /** Procedural texture complexity (0-1 scale) */
    textureComplexity?: number;
}

/**
 * Lighting and glow effects specification
 */
export interface LightingSpec {
    /** Ambient light intensity (0-1 scale) */
    ambientIntensity: number;
    
    /** Enable dynamic lighting based on emotions */
    dynamicLighting: boolean;
    
    /** Glow color (hex format) */
    glowColor: string;
    
    /** Glow spread radius (pixels) */
    glowRadius: number;
    
    /** Enable spectral/rainbow effects */
    spectralEffects: boolean;
}

/**
 * Audio specification for sounds and music
 */
export interface AudioSpec {
    /** Ambient background loop configuration */
    ambient: AmbientAudioSpec;
    
    /** Action-triggered sound effects */
    actionSounds: ActionSoundMap;
    
    /** Emotional state sound mappings */
    emotionalSounds: EmotionalSoundMap;
    
    /** Master volume (0-1 scale) */
    volume: number;
    
    /** Enable spatial audio effects */
    spatialAudio: boolean;
}

/**
 * Ambient audio loop specification
 */
export interface AmbientAudioSpec {
    /** Path to ambient audio file */
    audioPath: string;
    
    /** Loop the ambient audio */
    loop: boolean;
    
    /** Fade in duration (milliseconds) */
    fadeInDuration: number;
    
    /** Fade out duration (milliseconds) */
    fadeOutDuration: number;
    
    /** Volume for ambient audio (0-1 scale) */
    volume: number;
}

/**
 * Mapping of user actions to sound effects
 */
export interface ActionSoundMap {
    save?: string;
    compile?: string;
    error?: string;
    hover?: string;
    click?: string;
    type?: string;
    delete?: string;
    undo?: string;
    redo?: string;
}

/**
 * Mapping of emotional states to sound effects
 */
export interface EmotionalSoundMap {
    calm?: string;
    tense?: string;
    curious?: string;
    excited?: string;
    frustrated?: string;
    transition?: string; // Sound when emotion changes
}

/**
 * Particle system specification
 */
export interface ParticleSpec {
    /** Enable particle system */
    enabled: boolean;
    
    /** Particle density (particles per 1000 pixels) */
    density: number;
    
    /** Particle size range [min, max] in pixels */
    sizeRange: [number, number];
    
    /** Particle speed range [min, max] in pixels/second */
    speedRange: [number, number];
    
    /** Particle opacity range [min, max] (0-1 scale) */
    opacityRange: [number, number];
    
    /** Particle color or colors (hex format) */
    colors: string[];
    
    /** Particle shape */
    shape: 'circle' | 'square' | 'triangle' | 'custom';
    
    /** Custom particle image path if shape is custom */
    customImagePath?: string;
    
    /** Particle behavior type */
    behavior: 'float' | 'drift' | 'fall' | 'rise' | 'swirl';
    
    /** Enable particle interaction with cursor */
    cursorInteraction: boolean;
    
    /** Cursor interaction radius (pixels) */
    interactionRadius?: number;
}

/**
 * Animation specification
 */
export interface AnimationSpec {
    /** Animation speed multiplier (0.1 = slow, 2.0 = fast) */
    speed: number;
    
    /** Transition duration for theme changes (milliseconds) */
    transitionDuration: number;
    
    /** Easing function for transitions */
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
    
    /** Enable typing animations */
    typingAnimations: boolean;
    
    /** Typing animation trail length (characters) */
    typingTrailLength?: number;
    
    /** Enable save animations */
    saveAnimations: boolean;
    
    /** Enable error animations */
    errorAnimations: boolean;
    
    /** Enable idle animations */
    idleAnimations: boolean;
    
    /** Idle animation trigger delay (milliseconds) */
    idleDelay?: number;
}

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
    /** Whether the theme is valid */
    isValid: boolean;
    
    /** Array of validation errors */
    errors: string[];
    
    /** Array of validation warnings */
    warnings: string[];
    
    /** Corrected theme if corrections were applied */
    correctedTheme?: ThemeSpec;
}

/**
 * Theme preset type for quick selection
 */
export enum ThemePreset {
    HALLOWEEN = 'halloween',
    RAINY_FOREST = 'rainy-forest',
    CAFE = 'cafe',
    CAVE = 'cave',
    NEON_CITY = 'neon-city',
    CUSTOM = 'custom'
}
