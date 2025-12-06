/**
 * Utility functions for theme validation and management
 */

import {
    ThemeSpec,
    ThemeValidationResult,
    ThemePreset,
    ColorPalette,
    VisualSpec,
    AudioSpec,
    ParticleSpec,
    AnimationSpec
} from './ThemeModels';

/**
 * Validates a theme specification
 */
export function validateThemeSpec(theme: ThemeSpec): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate metadata
    if (!theme.metadata) {
        errors.push('Theme metadata is required');
    } else {
        if (!theme.metadata.id || typeof theme.metadata.id !== 'string') {
            errors.push('Theme metadata.id is required and must be a string');
        }
        if (!theme.metadata.name || typeof theme.metadata.name !== 'string') {
            errors.push('Theme metadata.name is required and must be a string');
        }
        if (!theme.metadata.version || !isValidSemver(theme.metadata.version)) {
            errors.push('Theme metadata.version must be valid semver format');
        }
    }
    
    // Validate visual spec
    if (!theme.visual) {
        errors.push('Theme visual specification is required');
    } else {
        validateColorPalette(theme.visual.palette, errors, warnings);
        validateVisualEffects(theme.visual.effects, errors, warnings);
    }
    
    // Validate audio spec
    if (!theme.audio) {
        errors.push('Theme audio specification is required');
    } else {
        validateAudioSpec(theme.audio, errors, warnings);
    }
    
    // Validate particle spec
    if (theme.particles) {
        validateParticleSpec(theme.particles, errors, warnings);
    }
    
    // Validate animation spec
    if (theme.animations) {
        validateAnimationSpec(theme.animations, errors, warnings);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validates color palette
 */
function validateColorPalette(palette: ColorPalette, errors: string[], warnings: string[]): void {
    if (!palette) {
        errors.push('Color palette is required');
        return;
    }
    
    const colorFields = ['primary', 'secondary', 'accent', 'foreground'];
    for (const field of colorFields) {
        const color = (palette as any)[field];
        if (!color || !isValidHexColor(color)) {
            errors.push(`palette.${field} must be a valid hex color`);
        }
    }
    
    if (!palette.background || !Array.isArray(palette.background) || palette.background.length === 0) {
        errors.push('palette.background must be a non-empty array of hex colors');
    } else {
        for (let i = 0; i < palette.background.length; i++) {
            if (!isValidHexColor(palette.background[i])) {
                errors.push(`palette.background[${i}] must be a valid hex color`);
            }
        }
    }
    
    if (!palette.emotional) {
        errors.push('palette.emotional is required');
    } else {
        const emotions = ['calm', 'tense', 'curious', 'excited', 'frustrated'];
        for (const emotion of emotions) {
            const color = (palette.emotional as any)[emotion];
            if (!color || !isValidHexColor(color)) {
                errors.push(`palette.emotional.${emotion} must be a valid hex color`);
            }
        }
    }
}

/**
 * Validates visual effects
 */
function validateVisualEffects(effects: any, errors: string[], warnings: string[]): void {
    if (!effects) {
        errors.push('Visual effects specification is required');
        return;
    }
    
    validateNumberRange(effects.glowIntensity, 'effects.glowIntensity', 0, 1, errors);
    validateNumberRange(effects.blurAmount, 'effects.blurAmount', 0, 10, errors);
    validateNumberRange(effects.overlayOpacity, 'effects.overlayOpacity', 0, 1, errors);
    validateNumberRange(effects.saturation, 'effects.saturation', -1, 1, errors);
    validateNumberRange(effects.brightness, 'effects.brightness', -1, 1, errors);
    validateNumberRange(effects.contrast, 'effects.contrast', -1, 1, errors);
    
    if (effects.vignette && effects.vignetteIntensity !== undefined) {
        validateNumberRange(effects.vignetteIntensity, 'effects.vignetteIntensity', 0, 1, errors);
    }
}

/**
 * Validates audio specification
 */
function validateAudioSpec(audio: AudioSpec, errors: string[], warnings: string[]): void {
    validateNumberRange(audio.volume, 'audio.volume', 0, 1, errors);
    
    if (audio.ambient) {
        if (!audio.ambient.audioPath) {
            warnings.push('audio.ambient.audioPath is not specified');
        }
        validateNumberRange(audio.ambient.volume, 'audio.ambient.volume', 0, 1, errors);
        
        if (audio.ambient.fadeInDuration !== undefined && audio.ambient.fadeInDuration < 0) {
            errors.push('audio.ambient.fadeInDuration must be >= 0');
        }
        if (audio.ambient.fadeOutDuration !== undefined && audio.ambient.fadeOutDuration < 0) {
            errors.push('audio.ambient.fadeOutDuration must be >= 0');
        }
    }
}

/**
 * Validates particle specification
 */
function validateParticleSpec(particles: ParticleSpec, errors: string[], warnings: string[]): void {
    if (particles.enabled) {
        validateNumberRange(particles.density, 'particles.density', 0, 100, errors);
        
        if (!Array.isArray(particles.sizeRange) || particles.sizeRange.length !== 2) {
            errors.push('particles.sizeRange must be an array of [min, max]');
        } else if (particles.sizeRange[0] > particles.sizeRange[1]) {
            errors.push('particles.sizeRange min must be <= max');
        }
        
        if (!Array.isArray(particles.speedRange) || particles.speedRange.length !== 2) {
            errors.push('particles.speedRange must be an array of [min, max]');
        } else if (particles.speedRange[0] > particles.speedRange[1]) {
            errors.push('particles.speedRange min must be <= max');
        }
        
        if (!Array.isArray(particles.opacityRange) || particles.opacityRange.length !== 2) {
            errors.push('particles.opacityRange must be an array of [min, max]');
        } else if (particles.opacityRange[0] > particles.opacityRange[1]) {
            errors.push('particles.opacityRange min must be <= max');
        }
        
        if (!particles.colors || !Array.isArray(particles.colors) || particles.colors.length === 0) {
            errors.push('particles.colors must be a non-empty array');
        } else {
            for (let i = 0; i < particles.colors.length; i++) {
                if (!isValidHexColor(particles.colors[i])) {
                    errors.push(`particles.colors[${i}] must be a valid hex color`);
                }
            }
        }
        
        if (particles.cursorInteraction && !particles.interactionRadius) {
            warnings.push('particles.cursorInteraction is enabled but interactionRadius is not specified');
        }
    }
}

/**
 * Validates animation specification
 */
function validateAnimationSpec(animations: AnimationSpec, errors: string[], warnings: string[]): void {
    validateNumberRange(animations.speed, 'animations.speed', 0.1, 5.0, errors);
    
    if (animations.transitionDuration !== undefined && animations.transitionDuration < 0) {
        errors.push('animations.transitionDuration must be >= 0');
    }
    
    const validEasings = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'];
    if (animations.easing && !validEasings.includes(animations.easing)) {
        errors.push(`animations.easing must be one of: ${validEasings.join(', ')}`);
    }
    
    if (animations.idleAnimations && !animations.idleDelay) {
        warnings.push('animations.idleAnimations is enabled but idleDelay is not specified');
    }
}

/**
 * Helper to validate number ranges
 */
function validateNumberRange(
    value: any,
    fieldName: string,
    min: number,
    max: number,
    errors: string[]
): void {
    if (value === undefined || value === null) {
        errors.push(`${fieldName} is required`);
    } else if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${fieldName} must be a number`);
    } else if (value < min || value > max) {
        errors.push(`${fieldName} must be between ${min} and ${max}, got ${value}`);
    }
}

/**
 * Validates hex color format
 */
function isValidHexColor(color: string): boolean {
    return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
}

/**
 * Validates semver format
 */
function isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version);
}

/**
 * Creates the default Halloween theme
 */
export function createHalloweenTheme(): ThemeSpec {
    return {
        metadata: {
            id: 'halloween',
            name: 'Halloween',
            version: '1.0.0',
            author: 'MirrorCanvas',
            description: 'Spooky Halloween atmosphere with fog, spectral effects, and eerie sounds',
            tags: ['halloween', 'spooky', 'dark', 'atmospheric'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        visual: {
            palette: {
                primary: '#FF6B35',      // Pumpkin orange
                secondary: '#1A1A1A',    // Deep black
                accent: '#9D4EDD',       // Purple accent
                background: ['#0A0A0A', '#1A0F1F', '#2D1B3D'], // Dark gradient
                foreground: '#E8E8E8',   // Light gray text
                emotional: {
                    calm: '#4A90E2',     // Soft blue
                    tense: '#8B0000',    // Dark red
                    curious: '#9D4EDD',  // Purple
                    excited: '#FF6B35',  // Orange
                    frustrated: '#DC143C' // Crimson
                }
            },
            effects: {
                glowIntensity: 0.8,
                blurAmount: 2.0,
                overlayOpacity: 0.3,
                saturation: 0.2,
                brightness: -0.1,
                contrast: 0.3,
                chromaticAberration: true,
                vignette: true,
                vignetteIntensity: 0.6
            },
            background: {
                type: 'gradient',
                gradientDirection: 'vertical',
                proceduralTexture: true,
                textureComplexity: 0.7,
                textureOpacity: 0.4
            },
            lighting: {
                ambientIntensity: 0.3,
                dynamicLighting: true,
                glowColor: '#FF6B35',
                glowRadius: 20,
                spectralEffects: true
            }
        },
        audio: {
            ambient: {
                audioPath: 'assets/sounds/halloween-ambient.mp3',
                loop: true,
                fadeInDuration: 2000,
                fadeOutDuration: 1500,
                volume: 0.4
            },
            actionSounds: {
                save: 'assets/sounds/ghost-whisper.mp3',
                error: 'assets/sounds/thunder-crack.mp3',
                compile: 'assets/sounds/spell-cast.mp3'
            },
            emotionalSounds: {
                frustrated: 'assets/sounds/distant-scream.mp3',
                excited: 'assets/sounds/witch-cackle.mp3',
                transition: 'assets/sounds/wind-gust.mp3'
            },
            volume: 0.6,
            spatialAudio: true
        },
        particles: {
            enabled: true,
            density: 15,
            sizeRange: [2, 8],
            speedRange: [10, 30],
            opacityRange: [0.3, 0.8],
            colors: ['#9D4EDD', '#FF6B35', '#E8E8E8'],
            shape: 'circle',
            behavior: 'drift',
            cursorInteraction: true,
            interactionRadius: 100
        },
        animations: {
            speed: 1.0,
            transitionDuration: 800,
            easing: 'ease-in-out',
            typingAnimations: true,
            typingTrailLength: 5,
            saveAnimations: true,
            errorAnimations: true,
            idleAnimations: true,
            idleDelay: 120000 // 2 minutes
        }
    };
}

/**
 * Creates the Rainy Forest theme
 */
export function createRainyForestTheme(): ThemeSpec {
    return {
        metadata: {
            id: 'rainy-forest',
            name: 'Rainy Forest',
            version: '1.0.0',
            author: 'MirrorCanvas',
            description: 'Peaceful forest atmosphere with rain sounds and green tones',
            tags: ['nature', 'calm', 'rain', 'forest'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        visual: {
            palette: {
                primary: '#2ECC71',
                secondary: '#1E3A2E',
                accent: '#52D273',
                background: ['#0F1F14', '#1A2F1F', '#243F2A'],
                foreground: '#D4E8D4',
                emotional: {
                    calm: '#3498DB',
                    tense: '#E74C3C',
                    curious: '#9B59B6',
                    excited: '#F39C12',
                    frustrated: '#C0392B'
                }
            },
            effects: {
                glowIntensity: 0.5,
                blurAmount: 1,
                overlayOpacity: 0.2,
                saturation: 0.3,
                brightness: 0,
                contrast: 0.1,
                chromaticAberration: false,
                vignette: true,
                vignetteIntensity: 0.4
            },
            background: {
                type: 'gradient',
                gradientDirection: 'vertical',
                proceduralTexture: true,
                textureComplexity: 0.3,
                textureOpacity: 0.15
            },
            lighting: {
                ambientIntensity: 0.4,
                dynamicLighting: true,
                glowColor: '#52D273',
                glowRadius: 15,
                spectralEffects: false
            }
        },
        audio: {
            ambient: {
                audioPath: 'assets/sounds/rain-forest.mp3',
                loop: true,
                fadeInDuration: 3000,
                fadeOutDuration: 2000,
                volume: 0.5
            },
            actionSounds: {
                save: 'assets/sounds/water-drop.mp3',
                error: 'assets/sounds/thunder-distant.mp3'
            },
            emotionalSounds: {},
            volume: 0.4,
            spatialAudio: false
        },
        particles: {
            enabled: true,
            density: 25,
            sizeRange: [1, 3],
            speedRange: [50, 100],
            opacityRange: [0.3, 0.8],
            colors: ['#52D273', '#3498DB'],
            shape: 'circle',
            behavior: 'fall',
            cursorInteraction: false
        },
        animations: {
            speed: 0.7,
            transitionDuration: 1500,
            easing: 'ease-out',
            typingAnimations: true,
            typingTrailLength: 3,
            saveAnimations: true,
            errorAnimations: true,
            idleAnimations: true,
            idleDelay: 180000
        }
    };
}

/**
 * Creates the Café theme
 */
export function createCafeTheme(): ThemeSpec {
    return {
        metadata: {
            id: 'cafe',
            name: 'Café',
            version: '1.0.0',
            author: 'MirrorCanvas',
            description: 'Warm, cozy café atmosphere with ambient coffee shop sounds',
            tags: ['cafe', 'warm', 'cozy', 'ambient'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        visual: {
            palette: {
                primary: '#D4A574',
                secondary: '#3E2723',
                accent: '#F4A460',
                background: ['#2C1810', '#3E2723', '#4A3728'],
                foreground: '#F5DEB3',
                emotional: {
                    calm: '#8B7355',
                    tense: '#A0522D',
                    curious: '#CD853F',
                    excited: '#FFD700',
                    frustrated: '#8B4513'
                }
            },
            effects: {
                glowIntensity: 0.4,
                blurAmount: 1,
                overlayOpacity: 0.15,
                saturation: 0.1,
                brightness: 0.05,
                contrast: 0.05,
                chromaticAberration: false,
                vignette: true,
                vignetteIntensity: 0.3
            },
            background: {
                type: 'gradient',
                gradientDirection: 'vertical',
                proceduralTexture: true,
                textureComplexity: 0.2,
                textureOpacity: 0.1
            },
            lighting: {
                ambientIntensity: 0.6,
                dynamicLighting: true,
                glowColor: '#FFD700',
                glowRadius: 12,
                spectralEffects: false
            }
        },
        audio: {
            ambient: {
                audioPath: 'assets/sounds/cafe-ambient.mp3',
                loop: true,
                fadeInDuration: 2500,
                fadeOutDuration: 2000,
                volume: 0.5
            },
            actionSounds: {
                save: 'assets/sounds/coffee-sip.mp3',
                error: 'assets/sounds/cup-clink.mp3'
            },
            emotionalSounds: {
                calm: 'assets/sounds/ambient-chatter.mp3'
            },
            volume: 0.35,
            spatialAudio: false
        },
        particles: {
            enabled: true,
            density: 8,
            sizeRange: [1, 4],
            speedRange: [5, 15],
            opacityRange: [0.2, 0.5],
            colors: ['#D4A574', '#F4A460', '#8B7355'],
            shape: 'circle',
            behavior: 'float',
            cursorInteraction: false
        },
        animations: {
            speed: 0.8,
            transitionDuration: 1200,
            easing: 'ease-out',
            typingAnimations: true,
            typingTrailLength: 3,
            saveAnimations: true,
            errorAnimations: true,
            idleAnimations: true,
            idleDelay: 150000
        }
    };
}

/**
 * Creates the Cave theme
 */
export function createCaveTheme(): ThemeSpec {
    return {
        metadata: {
            id: 'cave',
            name: 'Cave',
            version: '1.0.0',
            author: 'MirrorCanvas',
            description: 'Dark cave atmosphere with bioluminescent effects and echo sounds',
            tags: ['cave', 'dark', 'mysterious', 'bioluminescent'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        visual: {
            palette: {
                primary: '#00D9FF',
                secondary: '#0A0E27',
                accent: '#00FF88',
                background: ['#050810', '#0A0E27', '#0F1535'],
                foreground: '#B0E0E6',
                emotional: {
                    calm: '#00D9FF',
                    tense: '#FF1493',
                    curious: '#00FF88',
                    excited: '#FFD700',
                    frustrated: '#FF4500'
                }
            },
            effects: {
                glowIntensity: 0.9,
                blurAmount: 1.5,
                overlayOpacity: 0.25,
                saturation: 0.4,
                brightness: -0.2,
                contrast: 0.4,
                chromaticAberration: true,
                vignette: true,
                vignetteIntensity: 0.7
            },
            background: {
                type: 'gradient',
                gradientDirection: 'radial',
                proceduralTexture: true,
                textureComplexity: 0.6,
                textureOpacity: 0.3
            },
            lighting: {
                ambientIntensity: 0.2,
                dynamicLighting: true,
                glowColor: '#00D9FF',
                glowRadius: 25,
                spectralEffects: true
            }
        },
        audio: {
            ambient: {
                audioPath: 'assets/sounds/cave-ambient.mp3',
                loop: true,
                fadeInDuration: 3000,
                fadeOutDuration: 2500,
                volume: 0.45
            },
            actionSounds: {
                save: 'assets/sounds/cave-echo.mp3',
                error: 'assets/sounds/stone-drop.mp3',
                compile: 'assets/sounds/crystal-chime.mp3'
            },
            emotionalSounds: {
                excited: 'assets/sounds/cave-rumble.mp3'
            },
            volume: 0.4,
            spatialAudio: true
        },
        particles: {
            enabled: true,
            density: 20,
            sizeRange: [1, 6],
            speedRange: [8, 25],
            opacityRange: [0.4, 0.9],
            colors: ['#00D9FF', '#00FF88', '#FF1493'],
            shape: 'circle',
            behavior: 'swirl',
            cursorInteraction: true,
            interactionRadius: 120
        },
        animations: {
            speed: 1.2,
            transitionDuration: 1000,
            easing: 'ease-in-out',
            typingAnimations: true,
            typingTrailLength: 6,
            saveAnimations: true,
            errorAnimations: true,
            idleAnimations: true,
            idleDelay: 100000
        }
    };
}

/**
 * Creates the Neon City theme
 */
export function createNeonCityTheme(): ThemeSpec {
    return {
        metadata: {
            id: 'neon-city',
            name: 'Neon City',
            version: '1.0.0',
            author: 'MirrorCanvas',
            description: 'Cyberpunk synthwave atmosphere with neon colors and electronic sounds',
            tags: ['neon', 'cyberpunk', 'synthwave', 'electronic'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        visual: {
            palette: {
                primary: '#FF006E',
                secondary: '#0A0E27',
                accent: '#00F5FF',
                background: ['#0D0221', '#1A0033', '#2D0052'],
                foreground: '#E0FFFF',
                emotional: {
                    calm: '#00F5FF',
                    tense: '#FF006E',
                    curious: '#8338EC',
                    excited: '#FFBE0B',
                    frustrated: '#FF006E'
                }
            },
            effects: {
                glowIntensity: 1.0,
                blurAmount: 0.5,
                overlayOpacity: 0.2,
                saturation: 0.8,
                brightness: 0.1,
                contrast: 0.5,
                chromaticAberration: true,
                vignette: true,
                vignetteIntensity: 0.5
            },
            background: {
                type: 'gradient',
                gradientDirection: 'diagonal',
                proceduralTexture: true,
                textureComplexity: 0.5,
                textureOpacity: 0.2
            },
            lighting: {
                ambientIntensity: 0.4,
                dynamicLighting: true,
                glowColor: '#FF006E',
                glowRadius: 30,
                spectralEffects: true
            }
        },
        audio: {
            ambient: {
                audioPath: 'assets/sounds/neon-city-ambient.mp3',
                loop: true,
                fadeInDuration: 2000,
                fadeOutDuration: 1500,
                volume: 0.5
            },
            actionSounds: {
                save: 'assets/sounds/synth-beep.mp3',
                error: 'assets/sounds/digital-error.mp3',
                compile: 'assets/sounds/synth-rise.mp3'
            },
            emotionalSounds: {
                excited: 'assets/sounds/synth-pulse.mp3',
                frustrated: 'assets/sounds/digital-glitch.mp3'
            },
            volume: 0.45,
            spatialAudio: true
        },
        particles: {
            enabled: true,
            density: 30,
            sizeRange: [1, 5],
            speedRange: [20, 50],
            opacityRange: [0.5, 1.0],
            colors: ['#FF006E', '#00F5FF', '#8338EC', '#FFBE0B'],
            shape: 'square',
            behavior: 'swirl',
            cursorInteraction: true,
            interactionRadius: 150
        },
        animations: {
            speed: 1.5,
            transitionDuration: 600,
            easing: 'ease-in',
            typingAnimations: true,
            typingTrailLength: 8,
            saveAnimations: true,
            errorAnimations: true,
            idleAnimations: true,
            idleDelay: 90000
        }
    };
}

/**
 * Gets a theme preset by type
 */
export function getThemePreset(preset: ThemePreset): ThemeSpec | null {
    switch (preset) {
        case ThemePreset.HALLOWEEN:
            return createHalloweenTheme();
        case ThemePreset.RAINY_FOREST:
            return createRainyForestTheme();
        case ThemePreset.CAFE:
            return createCafeTheme();
        case ThemePreset.CAVE:
            return createCaveTheme();
        case ThemePreset.NEON_CITY:
            return createNeonCityTheme();
        default:
            return null;
    }
}

/**
 * Merges a partial theme spec with defaults
 */
export function mergeWithDefaults(partial: Partial<ThemeSpec>, base: ThemeSpec = createHalloweenTheme()): ThemeSpec {
    return {
        metadata: { ...base.metadata, ...partial.metadata },
        visual: partial.visual ? {
            palette: { ...base.visual.palette, ...partial.visual.palette },
            effects: { ...base.visual.effects, ...partial.visual.effects },
            background: { ...base.visual.background, ...partial.visual.background },
            lighting: { ...base.visual.lighting, ...partial.visual.lighting }
        } : base.visual,
        audio: partial.audio ? {
            ambient: { ...base.audio.ambient, ...partial.audio.ambient },
            actionSounds: { ...base.audio.actionSounds, ...partial.audio.actionSounds },
            emotionalSounds: { ...base.audio.emotionalSounds, ...partial.audio.emotionalSounds },
            volume: partial.audio.volume ?? base.audio.volume,
            spatialAudio: partial.audio.spatialAudio ?? base.audio.spatialAudio
        } : base.audio,
        particles: partial.particles ? { ...base.particles, ...partial.particles } : base.particles,
        animations: partial.animations ? { ...base.animations, ...partial.animations } : base.animations
    };
}
