/**
 * Theme Renderer - Manages dynamic theme application and CSS custom properties
 * Handles theme loading, validation, and smooth transitions between themes
 */

import { ThemeSpec, ThemeValidationResult, ColorPalette } from '../models/ThemeModels';
import { EmotionalState } from '../models/EmotionalModels';

/**
 * CSS custom property names used for dynamic theming
 */
export const CSS_VARIABLES = {
    // Color palette
    PRIMARY: '--mc-color-primary',
    SECONDARY: '--mc-color-secondary',
    ACCENT: '--mc-color-accent',
    BACKGROUND: '--mc-color-background',
    FOREGROUND: '--mc-color-foreground',
    
    // Emotional colors
    CALM: '--mc-color-calm',
    TENSE: '--mc-color-tense',
    CURIOUS: '--mc-color-curious',
    EXCITED: '--mc-color-excited',
    FRUSTRATED: '--mc-color-frustrated',
    
    // Effects
    GLOW_INTENSITY: '--mc-glow-intensity',
    BLUR_AMOUNT: '--mc-blur-amount',
    OVERLAY_OPACITY: '--mc-overlay-opacity',
    SATURATION: '--mc-saturation',
    BRIGHTNESS: '--mc-brightness',
    CONTRAST: '--mc-contrast',
    VIGNETTE_INTENSITY: '--mc-vignette-intensity',
    
    // Animation
    TRANSITION_DURATION: '--mc-transition-duration',
    ANIMATION_SPEED: '--mc-animation-speed',
    
    // Particles
    PARTICLE_DENSITY: '--mc-particle-density',
    PARTICLE_OPACITY: '--mc-particle-opacity',
} as const;

/**
 * Theme transition configuration
 */
export interface ThemeTransitionConfig {
    /** Duration of the transition in milliseconds */
    duration: number;
    
    /** Easing function for the transition */
    easing: string;
    
    /** Whether to fade out before transitioning */
    fadeOut: boolean;
    
    /** Callback when transition starts */
    onStart?: () => void;
    
    /** Callback when transition completes */
    onComplete?: () => void;
}

/**
 * Default theme transition configuration
 */
const DEFAULT_TRANSITION: ThemeTransitionConfig = {
    duration: 1000,
    easing: 'ease-in-out',
    fadeOut: true,
};

/**
 * ThemeRenderer manages the application and rendering of themes
 */
export class ThemeRenderer {
    private currentTheme: ThemeSpec | null = null;
    private isTransitioning: boolean = false;
    private styleElement: HTMLStyleElement | null = null;
    private rootElement: HTMLElement;
    
    constructor(rootElement: HTMLElement = document.documentElement) {
        this.rootElement = rootElement;
        this.initializeStyleElement();
    }
    
    /**
     * Initialize the style element for dynamic CSS injection
     */
    private initializeStyleElement(): void {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'mirrorcanvas-theme-styles';
        document.head.appendChild(this.styleElement);
    }
    
    /**
     * Validate a theme specification
     */
    public validateTheme(theme: ThemeSpec): ThemeValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate metadata
        if (!theme.metadata?.id) {
            errors.push('Theme must have a valid metadata.id');
        }
        if (!theme.metadata?.name) {
            errors.push('Theme must have a valid metadata.name');
        }
        if (!theme.metadata?.version) {
            warnings.push('Theme should have a version number');
        }
        
        // Validate color palette
        if (!theme.visual?.palette) {
            errors.push('Theme must have a visual.palette');
        } else {
            const palette = theme.visual.palette;
            if (!this.isValidHexColor(palette.primary)) {
                errors.push('Invalid primary color format');
            }
            if (!this.isValidHexColor(palette.secondary)) {
                errors.push('Invalid secondary color format');
            }
            if (!this.isValidHexColor(palette.accent)) {
                errors.push('Invalid accent color format');
            }
            if (!Array.isArray(palette.background) || palette.background.length === 0) {
                errors.push('Background must be a non-empty array of colors');
            }
        }
        
        // Validate effects
        if (theme.visual?.effects) {
            const effects = theme.visual.effects;
            if (effects.glowIntensity < 0 || effects.glowIntensity > 1) {
                errors.push('glowIntensity must be between 0 and 1');
            }
            if (effects.overlayOpacity < 0 || effects.overlayOpacity > 1) {
                errors.push('overlayOpacity must be between 0 and 1');
            }
        }
        
        // Validate audio
        if (theme.audio) {
            if (theme.audio.volume < 0 || theme.audio.volume > 1) {
                errors.push('audio.volume must be between 0 and 1');
            }
        }
        
        // Validate particles
        if (theme.particles) {
            if (theme.particles.density < 0) {
                errors.push('particle density must be non-negative');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    
    /**
     * Check if a string is a valid hex color
     */
    private isValidHexColor(color: string): boolean {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }
    
    /**
     * Load and apply a theme
     */
    public async loadTheme(theme: ThemeSpec, transitionConfig?: Partial<ThemeTransitionConfig>): Promise<void> {
        // Validate theme first
        const validation = this.validateTheme(theme);
        if (!validation.isValid) {
            throw new Error(`Theme validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Log warnings if any
        if (validation.warnings.length > 0) {
            console.warn('Theme validation warnings:', validation.warnings);
        }
        
        const config = { ...DEFAULT_TRANSITION, ...transitionConfig };
        
        if (this.isTransitioning) {
            throw new Error('Theme transition already in progress');
        }
        
        this.isTransitioning = true;
        config.onStart?.();
        
        try {
            // Fade out if configured
            if (config.fadeOut && this.currentTheme) {
                await this.fadeOut(config.duration / 2);
            }
            
            // Apply the new theme
            this.applyTheme(theme);
            this.currentTheme = theme;
            
            // Fade in
            await this.fadeIn(config.duration / 2);
            
            config.onComplete?.();
        } catch (error) {
            console.error('Error loading theme:', error);
            throw error;
        } finally {
            this.isTransitioning = false;
        }
    }
    
    /**
     * Apply theme to CSS custom properties
     */
    private applyTheme(theme: ThemeSpec): void {
        const { palette, effects, lighting } = theme.visual;
        
        // Apply color palette
        this.setVariable(CSS_VARIABLES.PRIMARY, palette.primary);
        this.setVariable(CSS_VARIABLES.SECONDARY, palette.secondary);
        this.setVariable(CSS_VARIABLES.ACCENT, palette.accent);
        this.setVariable(CSS_VARIABLES.FOREGROUND, palette.foreground);
        
        // Apply background (use first color or create gradient)
        if (palette.background.length === 1) {
            this.setVariable(CSS_VARIABLES.BACKGROUND, palette.background[0]);
        } else {
            const gradient = `linear-gradient(180deg, ${palette.background.join(', ')})`;
            this.setVariable(CSS_VARIABLES.BACKGROUND, gradient);
        }
        
        // Apply emotional colors
        this.setVariable(CSS_VARIABLES.CALM, palette.emotional.calm);
        this.setVariable(CSS_VARIABLES.TENSE, palette.emotional.tense);
        this.setVariable(CSS_VARIABLES.CURIOUS, palette.emotional.curious);
        this.setVariable(CSS_VARIABLES.EXCITED, palette.emotional.excited);
        this.setVariable(CSS_VARIABLES.FRUSTRATED, palette.emotional.frustrated);
        
        // Apply effects
        this.setVariable(CSS_VARIABLES.GLOW_INTENSITY, effects.glowIntensity.toString());
        this.setVariable(CSS_VARIABLES.BLUR_AMOUNT, `${effects.blurAmount}px`);
        this.setVariable(CSS_VARIABLES.OVERLAY_OPACITY, effects.overlayOpacity.toString());
        this.setVariable(CSS_VARIABLES.SATURATION, effects.saturation.toString());
        this.setVariable(CSS_VARIABLES.BRIGHTNESS, effects.brightness.toString());
        this.setVariable(CSS_VARIABLES.CONTRAST, effects.contrast.toString());
        this.setVariable(CSS_VARIABLES.VIGNETTE_INTENSITY, effects.vignetteIntensity.toString());
        
        // Apply animation settings
        this.setVariable(CSS_VARIABLES.TRANSITION_DURATION, `${theme.animations.transitionDuration}ms`);
        this.setVariable(CSS_VARIABLES.ANIMATION_SPEED, theme.animations.speed.toString());
        
        // Apply particle settings
        this.setVariable(CSS_VARIABLES.PARTICLE_DENSITY, theme.particles.density.toString());
        this.setVariable(CSS_VARIABLES.PARTICLE_OPACITY, theme.particles.opacityRange[1].toString());
        
        // Inject additional CSS rules
        this.injectThemeStyles(theme);
    }
    
    /**
     * Set a CSS custom property
     */
    private setVariable(name: string, value: string): void {
        this.rootElement.style.setProperty(name, value);
    }
    
    /**
     * Inject additional theme-specific CSS rules
     */
    private injectThemeStyles(theme: ThemeSpec): void {
        if (!this.styleElement) return;
        
        const { effects } = theme.visual;
        
        let css = `
            :root {
                transition: all var(${CSS_VARIABLES.TRANSITION_DURATION}) ease-in-out;
            }
            
            .mc-theme-container {
                background: var(${CSS_VARIABLES.BACKGROUND});
                color: var(${CSS_VARIABLES.FOREGROUND});
            }
            
            .mc-glow {
                filter: drop-shadow(0 0 ${theme.visual.lighting.glowRadius}px var(${CSS_VARIABLES.ACCENT}));
                opacity: var(${CSS_VARIABLES.GLOW_INTENSITY});
            }
        `;
        
        // Add vignette effect if enabled
        if (effects.vignette) {
            css += `
                .mc-theme-container::after {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    background: radial-gradient(circle, transparent 50%, rgba(0,0,0,var(${CSS_VARIABLES.VIGNETTE_INTENSITY})) 100%);
                }
            `;
        }
        
        // Add chromatic aberration if enabled
        if (effects.chromaticAberration) {
            css += `
                .mc-chromatic {
                    position: relative;
                }
                .mc-chromatic::before,
                .mc-chromatic::after {
                    content: attr(data-text);
                    position: absolute;
                    top: 0;
                    left: 0;
                    opacity: 0.8;
                }
                .mc-chromatic::before {
                    color: #ff0000;
                    transform: translate(-2px, 0);
                }
                .mc-chromatic::after {
                    color: #00ffff;
                    transform: translate(2px, 0);
                }
            `;
        }
        
        this.styleElement.textContent = css;
    }
    
    /**
     * Fade out animation
     */
    private fadeOut(duration: number): Promise<void> {
        return new Promise((resolve) => {
            this.rootElement.style.transition = `opacity ${duration}ms ease-out`;
            this.rootElement.style.opacity = '0';
            setTimeout(resolve, duration);
        });
    }
    
    /**
     * Fade in animation
     */
    private fadeIn(duration: number): Promise<void> {
        return new Promise((resolve) => {
            this.rootElement.style.transition = `opacity ${duration}ms ease-in`;
            this.rootElement.style.opacity = '1';
            setTimeout(resolve, duration);
        });
    }
    
    /**
     * Switch to a new theme with smooth transition
     */
    public async switchTheme(newTheme: ThemeSpec, transitionConfig?: Partial<ThemeTransitionConfig>): Promise<void> {
        return this.loadTheme(newTheme, transitionConfig);
    }
    
    /**
     * Update theme based on emotional state
     */
    public updateForEmotionalState(emotionalState: EmotionalState): void {
        if (!this.currentTheme) return;
        
        const emotionColor = this.getEmotionalColor(emotionalState.primary);
        
        // Adjust accent color based on emotion
        this.setVariable(CSS_VARIABLES.ACCENT, emotionColor);
        
        // Adjust glow intensity based on emotion intensity
        const glowIntensity = this.currentTheme.visual.effects.glowIntensity * emotionalState.intensity;
        this.setVariable(CSS_VARIABLES.GLOW_INTENSITY, glowIntensity.toString());
        
        // Adjust animation speed based on emotion
        let speedMultiplier = 1.0;
        switch (emotionalState.primary) {
            case 'excited':
                speedMultiplier = 1.5;
                break;
            case 'calm':
                speedMultiplier = 0.7;
                break;
            case 'frustrated':
                speedMultiplier = 1.2;
                break;
        }
        
        const adjustedSpeed = this.currentTheme.animations.speed * speedMultiplier;
        this.setVariable(CSS_VARIABLES.ANIMATION_SPEED, adjustedSpeed.toString());
    }
    
    /**
     * Get the color associated with an emotional state
     */
    private getEmotionalColor(emotion: string): string {
        if (!this.currentTheme) return '#ffffff';
        
        const emotionalColors = this.currentTheme.visual.palette.emotional;
        return emotionalColors[emotion as keyof typeof emotionalColors] || this.currentTheme.visual.palette.accent;
    }
    
    /**
     * Get the current theme
     */
    public getCurrentTheme(): ThemeSpec | null {
        return this.currentTheme;
    }
    
    /**
     * Check if a transition is in progress
     */
    public isTransitionInProgress(): boolean {
        return this.isTransitioning;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
        }
        this.styleElement = null;
        this.currentTheme = null;
    }
}
