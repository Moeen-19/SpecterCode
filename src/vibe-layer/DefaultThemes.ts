/**
 * Default theme specifications for MirrorCanvas
 */

import { ThemeSpec, ThemePreset } from '../models/ThemeModels';

/**
 * Halloween theme - spooky, atmospheric with orange and black tones
 */
export const HALLOWEEN_THEME: ThemeSpec = {
    metadata: {
        id: 'halloween',
        name: 'Halloween',
        version: '1.0.0',
        author: 'MirrorCanvas',
        description: 'Spooky Halloween atmosphere with fog, spectral effects, and eerie sounds',
        tags: ['halloween', 'spooky', 'dark', 'atmospheric'],
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-01'),
    },
    visual: {
        palette: {
            primary: '#FF6B35',      // Pumpkin orange
            secondary: '#1A1A1A',    // Deep black
            accent: '#FFB627',       // Golden glow
            background: ['#0D0D0D', '#1A0F0F', '#2D1B1B'], // Dark gradient
            foreground: '#E8E8E8',   // Light gray text
            emotional: {
                calm: '#4A90E2',     // Soft blue
                tense: '#8B0000',    // Dark red
                curious: '#9B59B6',  // Purple
                excited: '#FF6B35',  // Orange
                frustrated: '#C0392B', // Red
            },
        },
        effects: {
            glowIntensity: 0.8,
            blurAmount: 2,
            overlayOpacity: 0.3,
            saturation: 0.2,
            brightness: -0.1,
            contrast: 0.15,
            chromaticAberration: false,
            vignette: true,
            vignetteIntensity: 0.6,
        },
        background: {
            type: 'gradient',
            gradientDirection: 'vertical',
            proceduralTexture: true,
            textureComplexity: 0.4,
            textureOpacity: 0.2,
        },
        lighting: {
            ambientIntensity: 0.3,
            dynamicLighting: true,
            glowColor: '#FFB627',
            glowRadius: 20,
            spectralEffects: true,
        },
    },
    audio: {
        ambient: {
            audioPath: 'assets/sounds/halloween-ambient.mp3',
            loop: true,
            fadeInDuration: 2000,
            fadeOutDuration: 1500,
            volume: 0.4,
        },
        actionSounds: {
            save: 'assets/sounds/whisper.mp3',
            error: 'assets/sounds/thunder.mp3',
            compile: 'assets/sounds/ghost-whoosh.mp3',
        },
        emotionalSounds: {
            frustrated: 'assets/sounds/low-rumble.mp3',
            excited: 'assets/sounds/sparkle.mp3',
            transition: 'assets/sounds/wind-gust.mp3',
        },
        volume: 0.3,
        spatialAudio: true,
    },
    particles: {
        enabled: true,
        density: 15,
        sizeRange: [2, 8],
        speedRange: [10, 30],
        opacityRange: [0.2, 0.7],
        colors: ['#FFB627', '#FF6B35', '#8B4513'],
        shape: 'circle',
        behavior: 'drift',
        cursorInteraction: true,
        interactionRadius: 100,
    },
    animations: {
        speed: 1.0,
        transitionDuration: 1000,
        easing: 'ease-in-out',
        typingAnimations: true,
        typingTrailLength: 5,
        saveAnimations: true,
        errorAnimations: true,
        idleAnimations: true,
        idleDelay: 120000, // 2 minutes
    },
};

/**
 * Rainy Forest theme - calm, natural with green tones
 */
export const RAINY_FOREST_THEME: ThemeSpec = {
    metadata: {
        id: 'rainy-forest',
        name: 'Rainy Forest',
        version: '1.0.0',
        author: 'MirrorCanvas',
        description: 'Peaceful forest atmosphere with rain sounds and green tones',
        tags: ['nature', 'calm', 'rain', 'forest'],
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-01'),
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
                frustrated: '#C0392B',
            },
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
            vignetteIntensity: 0.4,
        },
        background: {
            type: 'gradient',
            gradientDirection: 'vertical',
            proceduralTexture: true,
            textureComplexity: 0.3,
            textureOpacity: 0.15,
        },
        lighting: {
            ambientIntensity: 0.4,
            dynamicLighting: true,
            glowColor: '#52D273',
            glowRadius: 15,
            spectralEffects: false,
        },
    },
    audio: {
        ambient: {
            audioPath: 'assets/sounds/rain-forest.mp3',
            loop: true,
            fadeInDuration: 3000,
            fadeOutDuration: 2000,
            volume: 0.5,
        },
        actionSounds: {
            save: 'assets/sounds/water-drop.mp3',
            error: 'assets/sounds/thunder-distant.mp3',
        },
        emotionalSounds: {},
        volume: 0.4,
        spatialAudio: false,
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
        cursorInteraction: false,
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
        idleDelay: 180000, // 3 minutes
    },
};

/**
 * Café theme - warm, cozy with ambient coffee shop sounds
 */
export const CAFE_THEME: ThemeSpec = {
    metadata: {
        id: 'cafe',
        name: 'Café',
        version: '1.0.0',
        author: 'MirrorCanvas',
        description: 'Warm, cozy café atmosphere with ambient coffee shop sounds',
        tags: ['cafe', 'warm', 'cozy', 'ambient'],
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-01'),
    },
    visual: {
        palette: {
            primary: '#D4A574',      // Warm tan
            secondary: '#3E2723',    // Dark brown
            accent: '#F4A460',       // Sandy brown
            background: ['#2C1810', '#3E2723', '#4A3728'], // Brown gradient
            foreground: '#F5DEB3',   // Wheat
            emotional: {
                calm: '#8B7355',     // Saddle brown
                tense: '#A0522D',    // Sienna
                curious: '#CD853F',  // Peru
                excited: '#FFD700',  // Gold
                frustrated: '#8B4513', // Saddle brown
            },
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
            vignetteIntensity: 0.3,
        },
        background: {
            type: 'gradient',
            gradientDirection: 'vertical',
            proceduralTexture: true,
            textureComplexity: 0.2,
            textureOpacity: 0.1,
        },
        lighting: {
            ambientIntensity: 0.6,
            dynamicLighting: true,
            glowColor: '#FFD700',
            glowRadius: 12,
            spectralEffects: false,
        },
    },
    audio: {
        ambient: {
            audioPath: 'assets/sounds/cafe-ambient.mp3',
            loop: true,
            fadeInDuration: 2500,
            fadeOutDuration: 2000,
            volume: 0.5,
        },
        actionSounds: {
            save: 'assets/sounds/coffee-sip.mp3',
            error: 'assets/sounds/cup-clink.mp3',
        },
        emotionalSounds: {
            calm: 'assets/sounds/ambient-chatter.mp3',
        },
        volume: 0.35,
        spatialAudio: false,
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
        cursorInteraction: false,
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
        idleDelay: 150000, // 2.5 minutes
    },
};

/**
 * Cave theme - dark, mysterious with bioluminescent effects
 */
export const CAVE_THEME: ThemeSpec = {
    metadata: {
        id: 'cave',
        name: 'Cave',
        version: '1.0.0',
        author: 'MirrorCanvas',
        description: 'Dark cave atmosphere with bioluminescent effects and echo sounds',
        tags: ['cave', 'dark', 'mysterious', 'bioluminescent'],
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-01'),
    },
    visual: {
        palette: {
            primary: '#00D9FF',      // Cyan bioluminescence
            secondary: '#0A0E27',    // Deep blue-black
            accent: '#00FF88',       // Neon green
            background: ['#050810', '#0A0E27', '#0F1535'], // Deep blue gradient
            foreground: '#B0E0E6',   // Powder blue
            emotional: {
                calm: '#00D9FF',     // Cyan
                tense: '#FF1493',    // Deep pink
                curious: '#00FF88',  // Neon green
                excited: '#FFD700',  // Gold
                frustrated: '#FF4500', // Orange red
            },
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
            vignetteIntensity: 0.7,
        },
        background: {
            type: 'gradient',
            gradientDirection: 'radial',
            proceduralTexture: true,
            textureComplexity: 0.6,
            textureOpacity: 0.3,
        },
        lighting: {
            ambientIntensity: 0.2,
            dynamicLighting: true,
            glowColor: '#00D9FF',
            glowRadius: 25,
            spectralEffects: true,
        },
    },
    audio: {
        ambient: {
            audioPath: 'assets/sounds/cave-ambient.mp3',
            loop: true,
            fadeInDuration: 3000,
            fadeOutDuration: 2500,
            volume: 0.45,
        },
        actionSounds: {
            save: 'assets/sounds/cave-echo.mp3',
            error: 'assets/sounds/stone-drop.mp3',
            compile: 'assets/sounds/crystal-chime.mp3',
        },
        emotionalSounds: {
            excited: 'assets/sounds/cave-rumble.mp3',
        },
        volume: 0.4,
        spatialAudio: true,
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
        interactionRadius: 120,
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
        idleDelay: 100000, // 1.67 minutes
    },
};

/**
 * Neon City theme - cyberpunk synthwave with electronic sounds
 */
export const NEON_CITY_THEME: ThemeSpec = {
    metadata: {
        id: 'neon-city',
        name: 'Neon City',
        version: '1.0.0',
        author: 'MirrorCanvas',
        description: 'Cyberpunk synthwave atmosphere with neon colors and electronic sounds',
        tags: ['neon', 'cyberpunk', 'synthwave', 'electronic'],
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-01'),
    },
    visual: {
        palette: {
            primary: '#FF006E',      // Hot pink
            secondary: '#0A0E27',    // Deep blue
            accent: '#00F5FF',       // Cyan
            background: ['#0D0221', '#1A0033', '#2D0052'], // Purple-blue gradient
            foreground: '#E0FFFF',   // Light cyan
            emotional: {
                calm: '#00F5FF',     // Cyan
                tense: '#FF006E',    // Hot pink
                curious: '#8338EC',  // Purple
                excited: '#FFBE0B',  // Yellow
                frustrated: '#FF006E', // Hot pink
            },
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
            vignetteIntensity: 0.5,
        },
        background: {
            type: 'gradient',
            gradientDirection: 'diagonal',
            proceduralTexture: true,
            textureComplexity: 0.5,
            textureOpacity: 0.2,
        },
        lighting: {
            ambientIntensity: 0.4,
            dynamicLighting: true,
            glowColor: '#FF006E',
            glowRadius: 30,
            spectralEffects: true,
        },
    },
    audio: {
        ambient: {
            audioPath: 'assets/sounds/neon-city-ambient.mp3',
            loop: true,
            fadeInDuration: 2000,
            fadeOutDuration: 1500,
            volume: 0.5,
        },
        actionSounds: {
            save: 'assets/sounds/synth-beep.mp3',
            error: 'assets/sounds/digital-error.mp3',
            compile: 'assets/sounds/synth-rise.mp3',
        },
        emotionalSounds: {
            excited: 'assets/sounds/synth-pulse.mp3',
            frustrated: 'assets/sounds/digital-glitch.mp3',
        },
        volume: 0.45,
        spatialAudio: true,
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
        interactionRadius: 150,
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
        idleDelay: 90000, // 1.5 minutes
    },
};

/**
 * Get a theme by preset type
 */
export function getThemeByPreset(preset: ThemePreset): ThemeSpec {
    switch (preset) {
        case ThemePreset.HALLOWEEN:
            return HALLOWEEN_THEME;
        case ThemePreset.RAINY_FOREST:
            return RAINY_FOREST_THEME;
        case ThemePreset.CAFE:
            return CAFE_THEME;
        case ThemePreset.CAVE:
            return CAVE_THEME;
        case ThemePreset.NEON_CITY:
            return NEON_CITY_THEME;
        default:
            return HALLOWEEN_THEME;
    }
}

/**
 * Get all available default themes
 */
export function getAllDefaultThemes(): ThemeSpec[] {
    return [
        HALLOWEEN_THEME,
        RAINY_FOREST_THEME,
        CAFE_THEME,
        CAVE_THEME,
        NEON_CITY_THEME,
    ];
}
