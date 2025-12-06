/**
 * Vibe Coding Layer - Main coordinator for visual and audio systems
 */

import { ThemeRenderer } from './ThemeRenderer';
import { AnimationEngine, AnimationTrigger } from './AnimationEngine';
import { AudioManager } from './AudioManager';
import { PerformanceMonitor, QualityLevel } from './PerformanceMonitor';
import { ThemeSpec } from '../models/ThemeModels';
import { EmotionalState } from '../models/EmotionalModels';

/**
 * Vibe Coding Layer configuration
 */
export interface VibeCodingLayerConfig {
    canvas: HTMLCanvasElement;
    rootElement?: HTMLElement;
    initialQuality?: QualityLevel;
    autoAdjustQuality?: boolean;
}

/**
 * VibeCodingLayer coordinates all visual and audio systems
 */
export class VibeCodingLayer {
    private themeRenderer: ThemeRenderer;
    private animationEngine: AnimationEngine;
    private audioManager: AudioManager;
    private performanceMonitor: PerformanceMonitor;
    private currentTheme: ThemeSpec | null = null;
    private isActive: boolean = false;
    
    constructor(config: VibeCodingLayerConfig) {
        // Initialize components
        this.themeRenderer = new ThemeRenderer(config.rootElement);
        this.animationEngine = new AnimationEngine(config.canvas);
        this.audioManager = new AudioManager();
        this.performanceMonitor = new PerformanceMonitor(
            config.initialQuality || QualityLevel.HIGH
        );
        
        // Configure auto-adjust
        if (config.autoAdjustQuality !== false) {
            this.performanceMonitor.enableAutoAdjust();
        }
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
    }
    
    /**
     * Setup performance monitoring and quality adjustment
     */
    private setupPerformanceMonitoring(): void {
        // Listen for quality changes
        this.performanceMonitor.onQualityChange((level, settings) => {
            this.applyQualitySettings(settings);
        });
        
        // Update performance metrics periodically
        setInterval(() => {
            const particleCount = this.animationEngine.getParticleCount();
            this.performanceMonitor.updateResourceCounts(particleCount, 0, 0);
            this.performanceMonitor.notifyMetricsCallbacks();
        }, 1000);
    }
    
    /**
     * Apply quality settings to all systems
     */
    private applyQualitySettings(settings: any): void {
        if (!this.currentTheme) return;
        
        // Update particle system
        const updatedTheme = { ...this.currentTheme };
        updatedTheme.particles.density = settings.particleDensity;
        updatedTheme.particles.enabled = settings.particleDensity > 0;
        
        // Update visual effects
        updatedTheme.visual.effects.blurAmount = settings.enableBlur ? 
            this.currentTheme.visual.effects.blurAmount : 0;
        updatedTheme.visual.effects.glowIntensity = settings.enableGlow ? 
            this.currentTheme.visual.effects.glowIntensity : 0;
        updatedTheme.visual.effects.vignette = settings.enableVignette;
        updatedTheme.visual.effects.chromaticAberration = settings.enableChromaticAberration;
        
        // Update animation speed
        updatedTheme.animations.speed = settings.animationSpeed;
        
        // Reload theme with updated settings
        this.animationEngine.loadTheme(updatedTheme);
        
        // Update audio
        if (!settings.audioEnabled) {
            this.audioManager.disable();
        } else {
            this.audioManager.enable();
        }
    }
    
    /**
     * Load and activate a theme
     */
    public async loadTheme(theme: ThemeSpec): Promise<void> {
        this.currentTheme = theme;
        
        // Load theme in renderer
        await this.themeRenderer.loadTheme(theme);
        
        // Load theme in animation engine
        this.animationEngine.loadTheme(theme);
        
        // Load audio
        await this.audioManager.loadAudioSpec(theme.audio);
    }
    
    /**
     * Start the vibe coding layer
     */
    public start(): void {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Start animation engine
        this.animationEngine.start();
        
        // Start ambient audio
        this.audioManager.playAmbient();
        
        // Setup animation loop for performance monitoring
        this.animationEngine.addCallback((deltaTime) => {
            this.performanceMonitor.updateFPS(deltaTime);
        });
    }
    
    /**
     * Stop the vibe coding layer
     */
    public stop(): void {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Stop animation engine
        this.animationEngine.stop();
        
        // Stop audio
        this.audioManager.stopAll();
    }
    
    /**
     * Trigger an animation
     */
    public triggerAnimation(trigger: AnimationTrigger): void {
        this.animationEngine.triggerAnimation(trigger);
        
        // Play corresponding sound if applicable
        if (trigger.type === 'save') {
            this.audioManager.playActionSound('save', {
                spatial: true,
                position: trigger.x !== undefined && trigger.y !== undefined ? 
                    { x: trigger.x, y: trigger.y } : undefined,
            });
        } else if (trigger.type === 'error') {
            this.audioManager.playActionSound('error');
        } else if (trigger.type === 'compile') {
            this.audioManager.playActionSound('compile');
        }
    }
    
    /**
     * Update based on emotional state
     */
    public updateForEmotionalState(emotionalState: EmotionalState): void {
        // Update theme renderer
        this.themeRenderer.updateForEmotionalState(emotionalState);
        
        // Update animation engine
        this.animationEngine.updateForEmotionalState(emotionalState);
        
        // Update audio
        this.audioManager.updateForEmotionalState(emotionalState);
    }
    
    /**
     * Switch to a new theme
     */
    public async switchTheme(newTheme: ThemeSpec): Promise<void> {
        // Fade out audio
        this.audioManager.stopAmbient();
        
        // Load new theme
        await this.loadTheme(newTheme);
        
        // Restart if active
        if (this.isActive) {
            this.audioManager.playAmbient();
        }
    }
    
    /**
     * Set master volume
     */
    public setVolume(volume: number): void {
        this.audioManager.setMasterVolume(volume);
    }
    
    /**
     * Get master volume
     */
    public getVolume(): number {
        return this.audioManager.getMasterVolume();
    }
    
    /**
     * Mute audio
     */
    public mute(): void {
        this.audioManager.mute();
    }
    
    /**
     * Unmute audio
     */
    public unmute(): void {
        this.audioManager.unmute();
    }
    
    /**
     * Check if audio is muted
     */
    public isMuted(): boolean {
        return this.audioManager.isMutedState();
    }
    
    /**
     * Set quality level
     */
    public setQualityLevel(level: QualityLevel): void {
        this.performanceMonitor.setQualityLevel(level);
    }
    
    /**
     * Get quality level
     */
    public getQualityLevel(): QualityLevel {
        return this.performanceMonitor.getQualityLevel();
    }
    
    /**
     * Enable auto quality adjustment
     */
    public enableAutoQuality(): void {
        this.performanceMonitor.enableAutoAdjust();
    }
    
    /**
     * Disable auto quality adjustment
     */
    public disableAutoQuality(): void {
        this.performanceMonitor.disableAutoAdjust();
    }
    
    /**
     * Get performance metrics
     */
    public getPerformanceMetrics() {
        return this.performanceMonitor.getMetrics();
    }
    
    /**
     * Get current theme
     */
    public getCurrentTheme(): ThemeSpec | null {
        return this.currentTheme;
    }
    
    /**
     * Check if active
     */
    public isVibeActive(): boolean {
        return this.isActive;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();
        this.themeRenderer.dispose();
        this.animationEngine.dispose();
        this.audioManager.dispose();
        this.performanceMonitor.dispose();
    }
}
