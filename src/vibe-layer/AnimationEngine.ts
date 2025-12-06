/**
 * Animation Engine - Manages 60fps animation loop and triggers
 */

import { ParticleSystem } from './ParticleSystem';
import { ThemeSpec } from '../models/ThemeModels';
import { EmotionalState } from '../models/EmotionalModels';

/**
 * User action types that can trigger animations
 */
export type UserActionType = 'typing' | 'save' | 'compile' | 'error' | 'hover' | 'click' | 'idle';

/**
 * Animation trigger event
 */
export interface AnimationTrigger {
    type: UserActionType;
    x?: number;
    y?: number;
    intensity?: number;
    metadata?: Record<string, any>;
}

/**
 * Animation callback function
 */
export type AnimationCallback = (deltaTime: number, totalTime: number) => void;

/**
 * AnimationEngine manages the main animation loop and coordinates visual effects
 */
export class AnimationEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private particleSystem: ParticleSystem | null = null;
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private totalTime: number = 0;
    private animationFrameId: number | null = null;
    private currentTheme: ThemeSpec | null = null;
    private currentEmotion: EmotionalState | null = null;
    private callbacks: AnimationCallback[] = [];
    private targetFPS: number = 60;
    private actualFPS: number = 60;
    private fpsHistory: number[] = [];
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = ctx;
        
        this.setupCanvas();
        this.setupEventListeners();
    }
    
    /**
     * Setup canvas dimensions
     */
    private setupCanvas(): void {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * Resize canvas to match window size
     */
    private resizeCanvas(): void {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        // Update particle system if it exists
        if (this.particleSystem && this.currentTheme) {
            this.particleSystem.updateConfig({
                canvasWidth: rect.width,
                canvasHeight: rect.height,
                ...this.currentTheme.particles,
            });
        }
    }
    
    /**
     * Setup event listeners for mouse tracking
     */
    private setupEventListeners(): void {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.particleSystem) {
                const rect = this.canvas.getBoundingClientRect();
                this.particleSystem.updateMousePosition(
                    e.clientX - rect.left,
                    e.clientY - rect.top
                );
            }
        });
    }
    
    /**
     * Load a theme and initialize particle system
     */
    public loadTheme(theme: ThemeSpec): void {
        this.currentTheme = theme;
        
        const rect = this.canvas.getBoundingClientRect();
        this.particleSystem = new ParticleSystem({
            ...theme.particles,
            canvasWidth: rect.width,
            canvasHeight: rect.height,
        });
    }
    
    /**
     * Start the animation loop
     */
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }
    
    /**
     * Stop the animation loop
     */
    public stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    /**
     * Main animation loop
     */
    private animate = (): void => {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        this.totalTime += deltaTime;
        
        // Calculate FPS
        this.updateFPS(deltaTime);
        
        // Clear canvas
        this.clear();
        
        // Update and render particle system
        if (this.particleSystem && this.currentTheme?.particles.enabled) {
            this.particleSystem.update(deltaTime);
            this.particleSystem.render(this.ctx);
        }
        
        // Execute custom animation callbacks
        for (const callback of this.callbacks) {
            callback(deltaTime, this.totalTime);
        }
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.animate);
    };
    
    /**
     * Clear the canvas
     */
    private clear(): void {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
    }
    
    /**
     * Update FPS calculation
     */
    private updateFPS(deltaTime: number): void {
        const fps = 1000 / deltaTime;
        this.fpsHistory.push(fps);
        
        // Keep only last 60 frames
        if (this.fpsHistory.length > 60) {
            this.fpsHistory.shift();
        }
        
        // Calculate average FPS
        this.actualFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    }
    
    /**
     * Trigger an animation based on user action
     */
    public triggerAnimation(trigger: AnimationTrigger): void {
        if (!this.currentTheme) return;
        
        const { animations } = this.currentTheme;
        
        switch (trigger.type) {
            case 'typing':
                if (animations.typingAnimations && trigger.x !== undefined && trigger.y !== undefined) {
                    this.createTypingEffect(trigger.x, trigger.y);
                }
                break;
                
            case 'save':
                if (animations.saveAnimations && trigger.x !== undefined && trigger.y !== undefined) {
                    this.createSaveEffect(trigger.x, trigger.y);
                }
                break;
                
            case 'error':
                if (animations.errorAnimations) {
                    this.createErrorEffect();
                }
                break;
                
            case 'compile':
                if (trigger.x !== undefined && trigger.y !== undefined) {
                    this.createCompileEffect(trigger.x, trigger.y);
                }
                break;
                
            case 'idle':
                if (animations.idleAnimations) {
                    this.createIdleEffect();
                }
                break;
        }
    }
    
    /**
     * Create typing animation effect
     */
    private createTypingEffect(x: number, y: number): void {
        if (!this.particleSystem) return;
        
        // Create small particle burst at typing location
        this.particleSystem.burst(x, y, 3);
    }
    
    /**
     * Create save animation effect
     */
    private createSaveEffect(x: number, y: number): void {
        if (!this.particleSystem) return;
        
        // Create wave effect
        this.particleSystem.burst(x, y, 15);
        
        // Add ripple animation
        this.addRippleEffect(x, y);
    }
    
    /**
     * Create error animation effect
     */
    private createErrorEffect(): void {
        // Create screen shake effect
        const duration = 300;
        const startTime = this.totalTime;
        const intensity = 5;
        
        const shakeCallback: AnimationCallback = (deltaTime, totalTime) => {
            const elapsed = totalTime - startTime;
            if (elapsed > duration) {
                this.removeCallback(shakeCallback);
                this.canvas.style.transform = '';
                return;
            }
            
            const progress = elapsed / duration;
            const shake = intensity * (1 - progress);
            const x = (Math.random() - 0.5) * shake;
            const y = (Math.random() - 0.5) * shake;
            
            this.canvas.style.transform = `translate(${x}px, ${y}px)`;
        };
        
        this.addCallback(shakeCallback);
    }
    
    /**
     * Create compile animation effect
     */
    private createCompileEffect(x: number, y: number): void {
        if (!this.particleSystem) return;
        
        // Create spark trail
        this.particleSystem.burst(x, y, 25);
    }
    
    /**
     * Create idle animation effect
     */
    private createIdleEffect(): void {
        // Subtle ambient pulse - could be implemented with additional effects
    }
    
    /**
     * Add ripple effect at position
     */
    private addRippleEffect(x: number, y: number): void {
        const startTime = this.totalTime;
        const duration = 1000;
        const maxRadius = 100;
        
        const rippleCallback: AnimationCallback = (deltaTime, totalTime) => {
            const elapsed = totalTime - startTime;
            if (elapsed > duration) {
                this.removeCallback(rippleCallback);
                return;
            }
            
            const progress = elapsed / duration;
            const radius = maxRadius * progress;
            const opacity = 1 - progress;
            
            this.ctx.save();
            this.ctx.strokeStyle = this.currentTheme?.visual.palette.accent || '#ffffff';
            this.ctx.globalAlpha = opacity * 0.5;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        };
        
        this.addCallback(rippleCallback);
    }
    
    /**
     * Update animation based on emotional state
     */
    public updateForEmotionalState(emotionalState: EmotionalState): void {
        this.currentEmotion = emotionalState;
        
        if (this.particleSystem) {
            this.particleSystem.updateForEmotionalState(emotionalState);
        }
    }
    
    /**
     * Add a custom animation callback
     */
    public addCallback(callback: AnimationCallback): void {
        this.callbacks.push(callback);
    }
    
    /**
     * Remove a custom animation callback
     */
    public removeCallback(callback: AnimationCallback): void {
        const index = this.callbacks.indexOf(callback);
        if (index !== -1) {
            this.callbacks.splice(index, 1);
        }
    }
    
    /**
     * Get current FPS
     */
    public getFPS(): number {
        return Math.round(this.actualFPS);
    }
    
    /**
     * Get target FPS
     */
    public getTargetFPS(): number {
        return this.targetFPS;
    }
    
    /**
     * Check if animation is running
     */
    public isAnimating(): boolean {
        return this.isRunning;
    }
    
    /**
     * Get particle count
     */
    public getParticleCount(): number {
        return this.particleSystem?.getParticleCount() || 0;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();
        this.callbacks = [];
        if (this.particleSystem) {
            this.particleSystem.clear();
        }
    }
}
