/**
 * Background Evolution Generation System
 * Generates procedural textures and visual evolution based on emotional patterns
 */

import { EmotionType } from '../models/EmotionalModels';
import { StoredEmotionalSession } from './EmotionalDataAccess';
import { DetectedPattern, EmotionalPattern } from './TrendAnalyzer';

/**
 * Procedural texture configuration
 */
export interface ProceduralTexture {
    /** Texture type */
    type: TextureType;
    
    /** Base color in HSL format */
    baseColor: { hue: number; saturation: number; lightness: number };
    
    /** Secondary color for gradients/patterns */
    secondaryColor?: { hue: number; saturation: number; lightness: number };
    
    /** Noise parameters for texture generation */
    noise: {
        scale: number;
        octaves: number;
        persistence: number;
        lacunarity: number;
    };
    
    /** Pattern complexity (0-1 scale) */
    complexity: number;
    
    /** Animation parameters */
    animation: {
        speed: number;
        direction: { x: number; y: number };
        intensity: number;
    };
    
    /** Blend mode for layering */
    blendMode: BlendMode;
    
    /** Opacity (0-1 scale) */
    opacity: number;
}

/**
 * Texture types for procedural generation
 */
export enum TextureType {
    GRADIENT = 'gradient',
    PERLIN_NOISE = 'perlin-noise',
    FRACTAL = 'fractal',
    CELLULAR = 'cellular',
    VORONOI = 'voronoi',
    WAVES = 'waves',
    PARTICLES = 'particles',
    GRAIN = 'grain'
}

/**
 * Blend modes for texture layering
 */
export enum BlendMode {
    NORMAL = 'normal',
    MULTIPLY = 'multiply',
    SCREEN = 'screen',
    OVERLAY = 'overlay',
    ADD = 'add',
    SUBTRACT = 'subtract'
}

/**
 * Visual evolution state representing the current background appearance
 */
export interface VisualEvolutionState {
    /** Unique identifier for this state */
    id: string;
    
    /** Timestamp when this state was generated */
    timestamp: Date;
    
    /** Layers of procedural textures */
    layers: ProceduralTexture[];
    
    /** Overall color palette */
    palette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
    
    /** Particle system configuration */
    particles: {
        density: number;
        size: { min: number; max: number };
        speed: { min: number; max: number };
        color: string;
        opacity: number;
    };
    
    /** Ambient effects */
    ambient: {
        glow: { intensity: number; radius: number; color: string };
        vignette: { intensity: number; color: string };
        blur: { amount: number };
    };
    
    /** Metadata about the emotional context */
    metadata: {
        dominantEmotion: EmotionType;
        intensity: number;
        stability: number;
        patterns: EmotionalPattern[];
    };
}

/**
 * Transition configuration between visual states
 */
export interface VisualTransition {
    /** Duration of transition in milliseconds */
    duration: number;
    
    /** Easing function for smooth transitions */
    easing: EasingFunction;
    
    /** Whether to cross-fade between states */
    crossFade: boolean;
    
    /** Delay before starting transition */
    delay: number;
}

/**
 * Easing functions for transitions
 */
export enum EasingFunction {
    LINEAR = 'linear',
    EASE_IN = 'ease-in',
    EASE_OUT = 'ease-out',
    EASE_IN_OUT = 'ease-in-out',
    CUBIC_BEZIER = 'cubic-bezier'
}

/**
 * Background Evolution Generator
 * Creates and manages procedural background evolution based on emotional history
 */
export class BackgroundEvolutionGenerator {
    private currentState: VisualEvolutionState | null = null;
    private previousStates: VisualEvolutionState[] = [];
    private maxHistorySize: number = 10;
    
    /**
     * Generate a new visual evolution state based on emotional sessions
     */
    generateEvolutionState(
        sessions: StoredEmotionalSession[],
        patterns: DetectedPattern[]
    ): VisualEvolutionState {
        if (sessions.length === 0) {
            return this.getDefaultState();
        }
        
        // Calculate aggregate emotional metrics
        const dominantEmotion = this.calculateDominantEmotion(sessions);
        const avgIntensity = this.calculateAverageIntensity(sessions);
        const stability = this.calculateStability(sessions);
        
        // Generate color palette based on emotion
        const palette = this.generateColorPalette(dominantEmotion, avgIntensity);
        
        // Generate procedural texture layers
        const layers = this.generateTextureLayers(dominantEmotion, avgIntensity, stability, patterns);
        
        // Configure particle system
        const particles = this.generateParticleConfig(dominantEmotion, avgIntensity, patterns);
        
        // Configure ambient effects
        const ambient = this.generateAmbientEffects(dominantEmotion, avgIntensity, stability);
        
        const state: VisualEvolutionState = {
            id: `evolution-${Date.now()}`,
            timestamp: new Date(),
            layers,
            palette,
            particles,
            ambient,
            metadata: {
                dominantEmotion,
                intensity: avgIntensity,
                stability,
                patterns: patterns.map(p => p.pattern)
            }
        };
        
        // Store in history
        this.previousStates.push(state);
        if (this.previousStates.length > this.maxHistorySize) {
            this.previousStates.shift();
        }
        
        this.currentState = state;
        return state;
    }
    
    /**
     * Create a smooth transition between two visual states
     */
    createTransition(
        fromState: VisualEvolutionState,
        toState: VisualEvolutionState,
        config?: Partial<VisualTransition>
    ): VisualTransition {
        const defaultConfig: VisualTransition = {
            duration: 2000,
            easing: EasingFunction.EASE_IN_OUT,
            crossFade: true,
            delay: 0
        };
        
        // Adjust transition based on emotional change magnitude
        const emotionalDistance = this.calculateEmotionalDistance(
            fromState.metadata.dominantEmotion,
            toState.metadata.dominantEmotion
        );
        
        const intensityChange = Math.abs(
            fromState.metadata.intensity - toState.metadata.intensity
        );
        
        // Longer transitions for larger emotional changes
        const adjustedDuration = defaultConfig.duration * (1 + emotionalDistance * 0.5);
        
        return {
            ...defaultConfig,
            ...config,
            duration: config?.duration ?? adjustedDuration
        };
    }
    
    /**
     * Interpolate between two visual states for smooth transitions
     */
    interpolateStates(
        fromState: VisualEvolutionState,
        toState: VisualEvolutionState,
        progress: number
    ): VisualEvolutionState {
        // Clamp progress to 0-1
        progress = Math.max(0, Math.min(1, progress));
        
        // Interpolate color palette
        const palette = {
            primary: this.interpolateColor(fromState.palette.primary, toState.palette.primary, progress),
            secondary: this.interpolateColor(fromState.palette.secondary, toState.palette.secondary, progress),
            accent: this.interpolateColor(fromState.palette.accent, toState.palette.accent, progress),
            background: this.interpolateColor(fromState.palette.background, toState.palette.background, progress)
        };
        
        // Interpolate particle configuration
        const particles = {
            density: this.lerp(fromState.particles.density, toState.particles.density, progress),
            size: {
                min: this.lerp(fromState.particles.size.min, toState.particles.size.min, progress),
                max: this.lerp(fromState.particles.size.max, toState.particles.size.max, progress)
            },
            speed: {
                min: this.lerp(fromState.particles.speed.min, toState.particles.speed.min, progress),
                max: this.lerp(fromState.particles.speed.max, toState.particles.speed.max, progress)
            },
            color: this.interpolateColor(fromState.particles.color, toState.particles.color, progress),
            opacity: this.lerp(fromState.particles.opacity, toState.particles.opacity, progress)
        };
        
        // Interpolate ambient effects
        const ambient = {
            glow: {
                intensity: this.lerp(fromState.ambient.glow.intensity, toState.ambient.glow.intensity, progress),
                radius: this.lerp(fromState.ambient.glow.radius, toState.ambient.glow.radius, progress),
                color: this.interpolateColor(fromState.ambient.glow.color, toState.ambient.glow.color, progress)
            },
            vignette: {
                intensity: this.lerp(fromState.ambient.vignette.intensity, toState.ambient.vignette.intensity, progress),
                color: this.interpolateColor(fromState.ambient.vignette.color, toState.ambient.vignette.color, progress)
            },
            blur: {
                amount: this.lerp(fromState.ambient.blur.amount, toState.ambient.blur.amount, progress)
            }
        };
        
        // Interpolate texture layers (simplified - use toState layers with adjusted opacity)
        const layers = toState.layers.map(layer => ({
            ...layer,
            opacity: layer.opacity * progress
        }));
        
        return {
            id: `interpolated-${Date.now()}`,
            timestamp: new Date(),
            layers,
            palette,
            particles,
            ambient,
            metadata: toState.metadata
        };
    }
    
    /**
     * Get the current visual evolution state
     */
    getCurrentState(): VisualEvolutionState | null {
        return this.currentState;
    }
    
    /**
     * Get previous visual states
     */
    getStateHistory(): VisualEvolutionState[] {
        return [...this.previousStates];
    }
    
    // ==================== Private Helper Methods ====================
    
    private calculateDominantEmotion(sessions: StoredEmotionalSession[]): EmotionType {
        const emotionCounts = new Map<EmotionType, number>();
        
        for (const session of sessions) {
            emotionCounts.set(
                session.dominantEmotion,
                (emotionCounts.get(session.dominantEmotion) ?? 0) + 1
            );
        }
        
        return Array.from(emotionCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    private calculateAverageIntensity(sessions: StoredEmotionalSession[]): number {
        if (sessions.length === 0) return 0;
        return sessions.reduce((sum, s) => sum + s.averageIntensity, 0) / sessions.length;
    }
    
    private calculateStability(sessions: StoredEmotionalSession[]): number {
        if (sessions.length === 0) return 0;
        const avgTransitions = sessions.reduce((sum, s) => sum + s.transitionCount, 0) / sessions.length;
        return Math.max(0, 1 - (avgTransitions / 20));
    }
    
    private generateColorPalette(emotion: EmotionType, intensity: number): VisualEvolutionState['palette'] {
        const emotionColors: Record<EmotionType, { hue: number; saturation: number; lightness: number }> = {
            [EmotionType.CALM]: { hue: 200, saturation: 0.4, lightness: 0.6 },
            [EmotionType.TENSE]: { hue: 0, saturation: 0.6, lightness: 0.4 },
            [EmotionType.CURIOUS]: { hue: 280, saturation: 0.7, lightness: 0.7 },
            [EmotionType.EXCITED]: { hue: 60, saturation: 0.8, lightness: 0.8 },
            [EmotionType.FRUSTRATED]: { hue: 15, saturation: 0.7, lightness: 0.5 }
        };
        
        const base = emotionColors[emotion];
        const adjustedSaturation = base.saturation * intensity;
        const adjustedLightness = base.lightness * (0.7 + intensity * 0.3);
        
        return {
            primary: `hsl(${base.hue}, ${adjustedSaturation * 100}%, ${adjustedLightness * 100}%)`,
            secondary: `hsl(${(base.hue + 30) % 360}, ${adjustedSaturation * 80}%, ${adjustedLightness * 90}%)`,
            accent: `hsl(${(base.hue + 180) % 360}, ${adjustedSaturation * 90}%, ${adjustedLightness * 110}%)`,
            background: `hsl(${base.hue}, ${adjustedSaturation * 20}%, ${adjustedLightness * 30}%)`
        };
    }
    
    private generateTextureLayers(
        emotion: EmotionType,
        intensity: number,
        stability: number,
        patterns: DetectedPattern[]
    ): ProceduralTexture[] {
        const layers: ProceduralTexture[] = [];
        
        // Base layer - always present
        layers.push(this.createBaseLayer(emotion, intensity));
        
        // Add complexity based on patterns
        if (patterns.some(p => p.pattern === EmotionalPattern.VOLATILE)) {
            layers.push(this.createVolatileLayer(intensity));
        }
        
        if (patterns.some(p => p.pattern === EmotionalPattern.FLOW_STATE)) {
            layers.push(this.createFlowLayer(intensity));
        }
        
        if (patterns.some(p => p.pattern === EmotionalPattern.BURNOUT)) {
            layers.push(this.createBurnoutLayer(intensity));
        }
        
        // Add noise layer for texture
        if (stability < 0.7) {
            layers.push(this.createNoiseLayer(1 - stability));
        }
        
        return layers;
    }
    
    private createBaseLayer(emotion: EmotionType, intensity: number): ProceduralTexture {
        const emotionColors: Record<EmotionType, { hue: number; saturation: number; lightness: number }> = {
            [EmotionType.CALM]: { hue: 200, saturation: 0.3, lightness: 0.2 },
            [EmotionType.TENSE]: { hue: 0, saturation: 0.4, lightness: 0.15 },
            [EmotionType.CURIOUS]: { hue: 280, saturation: 0.5, lightness: 0.25 },
            [EmotionType.EXCITED]: { hue: 60, saturation: 0.6, lightness: 0.3 },
            [EmotionType.FRUSTRATED]: { hue: 15, saturation: 0.5, lightness: 0.2 }
        };
        
        const color = emotionColors[emotion];
        
        return {
            type: TextureType.GRADIENT,
            baseColor: color,
            secondaryColor: {
                hue: (color.hue + 30) % 360,
                saturation: color.saturation * 0.8,
                lightness: color.lightness * 1.2
            },
            noise: {
                scale: 1.0,
                octaves: 4,
                persistence: 0.5,
                lacunarity: 2.0
            },
            complexity: intensity * 0.5,
            animation: {
                speed: intensity * 0.3,
                direction: { x: 0.5, y: 0.5 },
                intensity: intensity * 0.4
            },
            blendMode: BlendMode.NORMAL,
            opacity: 1.0
        };
    }
    
    private createVolatileLayer(intensity: number): ProceduralTexture {
        return {
            type: TextureType.FRACTAL,
            baseColor: { hue: 0, saturation: 0.6, lightness: 0.3 },
            noise: {
                scale: 2.0,
                octaves: 6,
                persistence: 0.7,
                lacunarity: 2.5
            },
            complexity: 0.8,
            animation: {
                speed: intensity * 1.5,
                direction: { x: Math.random(), y: Math.random() },
                intensity: intensity * 0.8
            },
            blendMode: BlendMode.OVERLAY,
            opacity: 0.3
        };
    }
    
    private createFlowLayer(intensity: number): ProceduralTexture {
        return {
            type: TextureType.WAVES,
            baseColor: { hue: 200, saturation: 0.5, lightness: 0.4 },
            noise: {
                scale: 1.5,
                octaves: 3,
                persistence: 0.4,
                lacunarity: 2.0
            },
            complexity: 0.4,
            animation: {
                speed: intensity * 0.5,
                direction: { x: 1, y: 0 },
                intensity: intensity * 0.6
            },
            blendMode: BlendMode.SCREEN,
            opacity: 0.2
        };
    }
    
    private createBurnoutLayer(intensity: number): ProceduralTexture {
        return {
            type: TextureType.GRAIN,
            baseColor: { hue: 15, saturation: 0.7, lightness: 0.2 },
            noise: {
                scale: 3.0,
                octaves: 5,
                persistence: 0.6,
                lacunarity: 2.2
            },
            complexity: 0.7,
            animation: {
                speed: intensity * 0.2,
                direction: { x: 0, y: -1 },
                intensity: intensity * 0.5
            },
            blendMode: BlendMode.MULTIPLY,
            opacity: 0.4
        };
    }
    
    private createNoiseLayer(instability: number): ProceduralTexture {
        return {
            type: TextureType.PERLIN_NOISE,
            baseColor: { hue: 0, saturation: 0, lightness: 0.5 },
            noise: {
                scale: 2.5,
                octaves: 4,
                persistence: 0.5,
                lacunarity: 2.0
            },
            complexity: instability,
            animation: {
                speed: instability * 0.4,
                direction: { x: 0.3, y: 0.7 },
                intensity: instability * 0.3
            },
            blendMode: BlendMode.OVERLAY,
            opacity: instability * 0.2
        };
    }
    
    private generateParticleConfig(
        emotion: EmotionType,
        intensity: number,
        patterns: DetectedPattern[]
    ): VisualEvolutionState['particles'] {
        const baseDensity = intensity * 50;
        const hasFlowState = patterns.some(p => p.pattern === EmotionalPattern.FLOW_STATE);
        
        return {
            density: hasFlowState ? baseDensity * 1.5 : baseDensity,
            size: {
                min: 1,
                max: intensity * 5
            },
            speed: {
                min: intensity * 10,
                max: intensity * 30
            },
            color: this.getEmotionColor(emotion),
            opacity: intensity * 0.6
        };
    }
    
    private generateAmbientEffects(
        emotion: EmotionType,
        intensity: number,
        stability: number
    ): VisualEvolutionState['ambient'] {
        return {
            glow: {
                intensity: intensity * 0.5,
                radius: intensity * 20,
                color: this.getEmotionColor(emotion)
            },
            vignette: {
                intensity: (1 - stability) * 0.4,
                color: '#000000'
            },
            blur: {
                amount: (1 - stability) * 2
            }
        };
    }
    
    private getEmotionColor(emotion: EmotionType): string {
        const colors: Record<EmotionType, string> = {
            [EmotionType.CALM]: '#6BA3D8',
            [EmotionType.TENSE]: '#D86B6B',
            [EmotionType.CURIOUS]: '#B86BD8',
            [EmotionType.EXCITED]: '#D8D86B',
            [EmotionType.FRUSTRATED]: '#D8866B'
        };
        
        return colors[emotion];
    }
    
    private calculateEmotionalDistance(from: EmotionType, to: EmotionType): number {
        if (from === to) return 0;
        
        // Define emotional distances (0-1 scale)
        const distances: Record<EmotionType, Record<EmotionType, number>> = {
            [EmotionType.CALM]: {
                [EmotionType.CALM]: 0,
                [EmotionType.CURIOUS]: 0.3,
                [EmotionType.EXCITED]: 0.5,
                [EmotionType.TENSE]: 0.7,
                [EmotionType.FRUSTRATED]: 0.8
            },
            [EmotionType.CURIOUS]: {
                [EmotionType.CALM]: 0.3,
                [EmotionType.CURIOUS]: 0,
                [EmotionType.EXCITED]: 0.4,
                [EmotionType.TENSE]: 0.6,
                [EmotionType.FRUSTRATED]: 0.7
            },
            [EmotionType.EXCITED]: {
                [EmotionType.CALM]: 0.5,
                [EmotionType.CURIOUS]: 0.4,
                [EmotionType.EXCITED]: 0,
                [EmotionType.TENSE]: 0.5,
                [EmotionType.FRUSTRATED]: 0.6
            },
            [EmotionType.TENSE]: {
                [EmotionType.CALM]: 0.7,
                [EmotionType.CURIOUS]: 0.6,
                [EmotionType.EXCITED]: 0.5,
                [EmotionType.TENSE]: 0,
                [EmotionType.FRUSTRATED]: 0.3
            },
            [EmotionType.FRUSTRATED]: {
                [EmotionType.CALM]: 0.8,
                [EmotionType.CURIOUS]: 0.7,
                [EmotionType.EXCITED]: 0.6,
                [EmotionType.TENSE]: 0.3,
                [EmotionType.FRUSTRATED]: 0
            }
        };
        
        return distances[from][to];
    }
    
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
    
    private interpolateColor(from: string, to: string, progress: number): string {
        // Simple color interpolation (assumes hex or hsl format)
        // For production, use a proper color library
        if (from.startsWith('hsl') && to.startsWith('hsl')) {
            const fromMatch = from.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
            const toMatch = to.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
            
            if (fromMatch && toMatch) {
                const h = this.lerp(parseFloat(fromMatch[1]), parseFloat(toMatch[1]), progress);
                const s = this.lerp(parseFloat(fromMatch[2]), parseFloat(toMatch[2]), progress);
                const l = this.lerp(parseFloat(fromMatch[3]), parseFloat(toMatch[3]), progress);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        
        // Fallback to target color
        return progress > 0.5 ? to : from;
    }
    
    private getDefaultState(): VisualEvolutionState {
        return {
            id: 'default',
            timestamp: new Date(),
            layers: [this.createBaseLayer(EmotionType.CALM, 0.5)],
            palette: {
                primary: '#6BA3D8',
                secondary: '#8BB8E8',
                accent: '#D8A36B',
                background: '#1A2A3A'
            },
            particles: {
                density: 25,
                size: { min: 1, max: 3 },
                speed: { min: 10, max: 20 },
                color: '#6BA3D8',
                opacity: 0.3
            },
            ambient: {
                glow: { intensity: 0.3, radius: 10, color: '#6BA3D8' },
                vignette: { intensity: 0.2, color: '#000000' },
                blur: { amount: 0.5 }
            },
            metadata: {
                dominantEmotion: EmotionType.CALM,
                intensity: 0.5,
                stability: 0.7,
                patterns: []
            }
        };
    }
}
