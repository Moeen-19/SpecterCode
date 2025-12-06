/**
 * PersonaVisualOverlay - Renders visual effects for persona manifestations
 * Implements overlay rendering that doesn't interfere with code editing
 */

import { PersonaType } from '../models/SystemModels';
import { VisualEffect, VisualEffectType } from './PersonaResponseGenerator';

/**
 * Configuration for overlay rendering
 */
export interface OverlayConfig {
    /** Canvas element for rendering */
    canvas: HTMLCanvasElement;
    
    /** Whether overlay is enabled */
    enabled: boolean;
    
    /** Global opacity multiplier (0-1) */
    opacity: number;
    
    /** Whether to use hardware acceleration */
    useHardwareAcceleration: boolean;
    
    /** Maximum number of concurrent effects */
    maxConcurrentEffects: number;
}

/**
 * Active effect instance
 */
interface ActiveEffect {
    /** Unique effect ID */
    id: string;
    
    /** Effect configuration */
    effect: VisualEffect;
    
    /** Persona that triggered this effect */
    persona: PersonaType;
    
    /** Start time */
    startTime: number;
    
    /** Current progress (0-1) */
    progress: number;
    
    /** Whether effect is complete */
    complete: boolean;
}

/**
 * Transition animation state
 */
interface TransitionState {
    /** Source persona */
    from: PersonaType | null;
    
    /** Target persona */
    to: PersonaType;
    
    /** Transition progress (0-1) */
    progress: number;
    
    /** Transition duration */
    duration: number;
    
    /** Start time */
    startTime: number;
}

/**
 * Manages visual overlay rendering for persona manifestations
 */
export class PersonaVisualOverlay {
    private config: OverlayConfig;
    private ctx: CanvasRenderingContext2D | null = null;
    private activeEffects: Map<string, ActiveEffect> = new Map();
    private animationFrameId: number | null = null;
    private isRendering: boolean = false;
    private transitionState: TransitionState | null = null;
    private effectIdCounter: number = 0;
    
    constructor(config: OverlayConfig) {
        this.config = config;
        this.initialize();
    }
    
    /**
     * Initialize the overlay system
     */
    private initialize(): void {
        if (!this.config.canvas) {
            throw new Error('Canvas element is required for PersonaVisualOverlay');
        }
        
        this.ctx = this.config.canvas.getContext('2d', {
            alpha: true,
            desynchronized: this.config.useHardwareAcceleration
        });
        
        if (!this.ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        
        // Set canvas to full viewport size
        this.resizeCanvas();
        
        // Make canvas non-interactive
        this.config.canvas.style.pointerEvents = 'none';
        this.config.canvas.style.position = 'fixed';
        this.config.canvas.style.top = '0';
        this.config.canvas.style.left = '0';
        this.config.canvas.style.zIndex = '9999';
        
        // Listen for resize events
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * Resize canvas to match viewport
     */
    private resizeCanvas(): void {
        const dpr = window.devicePixelRatio || 1;
        this.config.canvas.width = window.innerWidth * dpr;
        this.config.canvas.height = window.innerHeight * dpr;
        this.config.canvas.style.width = `${window.innerWidth}px`;
        this.config.canvas.style.height = `${window.innerHeight}px`;
        
        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
    }
    
    /**
     * Trigger a visual effect
     */
    public triggerEffect(effect: VisualEffect, persona: PersonaType): string {
        if (!this.config.enabled) {
            return '';
        }
        
        // Check max concurrent effects
        if (this.activeEffects.size >= this.config.maxConcurrentEffects) {
            // Remove oldest effect
            const oldestId = Array.from(this.activeEffects.keys())[0];
            this.activeEffects.delete(oldestId);
        }
        
        const effectId = `effect_${this.effectIdCounter++}`;
        const activeEffect: ActiveEffect = {
            id: effectId,
            effect,
            persona,
            startTime: Date.now(),
            progress: 0,
            complete: false
        };
        
        this.activeEffects.set(effectId, activeEffect);
        
        // Start rendering if not already running
        if (!this.isRendering) {
            this.startRendering();
        }
        
        return effectId;
    }
    
    /**
     * Start persona transition animation
     */
    public startTransition(from: PersonaType | null, to: PersonaType, duration: number = 1000): void {
        this.transitionState = {
            from,
            to,
            progress: 0,
            duration,
            startTime: Date.now()
        };
        
        if (!this.isRendering) {
            this.startRendering();
        }
    }
    
    /**
     * Start the rendering loop
     */
    private startRendering(): void {
        if (this.isRendering) {
            return;
        }
        
        this.isRendering = true;
        this.render();
    }
    
    /**
     * Stop the rendering loop
     */
    private stopRendering(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isRendering = false;
    }
    
    /**
     * Main render loop
     */
    private render = (): void => {
        if (!this.ctx || !this.config.enabled) {
            this.stopRendering();
            return;
        }
        
        const now = Date.now();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.config.canvas.width, this.config.canvas.height);
        
        // Update and render transition
        if (this.transitionState) {
            this.updateTransition(now);
            this.renderTransition();
        }
        
        // Update and render active effects
        const effectsToRemove: string[] = [];
        
        for (const [id, activeEffect] of this.activeEffects) {
            const elapsed = now - activeEffect.startTime;
            activeEffect.progress = Math.min(elapsed / activeEffect.effect.duration, 1);
            
            if (activeEffect.progress >= 1) {
                activeEffect.complete = true;
                effectsToRemove.push(id);
            } else {
                this.renderEffect(activeEffect);
            }
        }
        
        // Remove completed effects
        for (const id of effectsToRemove) {
            this.activeEffects.delete(id);
        }
        
        // Continue rendering if there are active effects or transitions
        if (this.activeEffects.size > 0 || this.transitionState) {
            this.animationFrameId = requestAnimationFrame(this.render);
        } else {
            this.stopRendering();
        }
    };
    
    /**
     * Update transition state
     */
    private updateTransition(now: number): void {
        if (!this.transitionState) {
            return;
        }
        
        const elapsed = now - this.transitionState.startTime;
        this.transitionState.progress = Math.min(elapsed / this.transitionState.duration, 1);
        
        if (this.transitionState.progress >= 1) {
            this.transitionState = null;
        }
    }
    
    /**
     * Render transition animation
     */
    private renderTransition(): void {
        if (!this.ctx || !this.transitionState) {
            return;
        }
        
        const { progress, to } = this.transitionState;
        const eased = this.easeInOutCubic(progress);
        
        // Render transition effect based on target persona
        this.ctx.save();
        this.ctx.globalAlpha = eased * this.config.opacity;
        
        switch (to) {
            case PersonaType.MUSE:
                this.renderMuseTransition(eased);
                break;
            case PersonaType.CRITIC:
                this.renderCriticTransition(eased);
                break;
            case PersonaType.ARCHIVIST:
                this.renderArchivistTransition(eased);
                break;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Render effect based on type
     */
    private renderEffect(activeEffect: ActiveEffect): void {
        if (!this.ctx) {
            return;
        }
        
        const { effect, progress } = activeEffect;
        
        this.ctx.save();
        this.ctx.globalAlpha = effect.intensity * this.config.opacity * (1 - progress);
        
        switch (effect.type) {
            case VisualEffectType.GLITCH:
                this.renderGlitchEffect(effect, progress);
                break;
            case VisualEffectType.GLOW:
                this.renderGlowEffect(effect, progress);
                break;
            case VisualEffectType.RIBBONS:
                this.renderRibbonsEffect(effect, progress);
                break;
            case VisualEffectType.SPARKLE:
                this.renderSparkleEffect(effect, progress);
                break;
            case VisualEffectType.PULSE:
                this.renderPulseEffect(effect, progress);
                break;
            case VisualEffectType.FADE:
                this.renderFadeEffect(effect, progress);
                break;
            case VisualEffectType.SHIMMER:
                this.renderShimmerEffect(effect, progress);
                break;
            case VisualEffectType.STATIC:
                this.renderStaticEffect(effect, progress);
                break;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Render glitch effect
     */
    private renderGlitchEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const width = this.config.canvas.width;
        const height = this.config.canvas.height;
        
        // Random glitch bars
        for (let i = 0; i < 5; i++) {
            const y = Math.random() * height;
            const barHeight = 2 + Math.random() * 10;
            const offset = (Math.random() - 0.5) * 20;
            
            this.ctx.fillStyle = effect.color || '#ff0066';
            this.ctx.fillRect(offset, y, width, barHeight);
        }
    }
    
    /**
     * Render glow effect
     */
    private renderGlowEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const centerX = effect.position?.x || this.config.canvas.width / 2;
        const centerY = effect.position?.y || this.config.canvas.height / 2;
        const radius = 100 + progress * 200;
        
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, effect.color || '#00ffaa');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    }
    
    /**
     * Render ribbons effect
     */
    private renderRibbonsEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const width = this.config.canvas.width;
        const height = this.config.canvas.height;
        
        this.ctx.strokeStyle = effect.color || '#6600ff';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            const yOffset = (i / 3) * height;
            const amplitude = 50;
            const frequency = 0.02;
            
            for (let x = 0; x < width; x += 5) {
                const y = yOffset + Math.sin(x * frequency + progress * Math.PI * 2) * amplitude;
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
        }
    }
    
    /**
     * Render sparkle effect
     */
    private renderSparkleEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const width = this.config.canvas.width;
        const height = this.config.canvas.height;
        
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 2 + Math.random() * 4;
            const alpha = Math.random() * (1 - progress);
            
            this.ctx.fillStyle = effect.color || '#ffff00';
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    /**
     * Render pulse effect
     */
    private renderPulseEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
        const alpha = 0.3 * (1 - progress);
        
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = effect.color || '#00aaff';
        this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    }
    
    /**
     * Render fade effect
     */
    private renderFadeEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = effect.color || '#aaaaaa';
        this.ctx.globalAlpha = 0.5 * (1 - progress);
        this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    }
    
    /**
     * Render shimmer effect
     */
    private renderShimmerEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const width = this.config.canvas.width;
        const height = this.config.canvas.height;
        const shimmerX = progress * width;
        
        const gradient = this.ctx.createLinearGradient(shimmerX - 100, 0, shimmerX + 100, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, effect.color || '#ffaa00');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
    }
    
    /**
     * Render static effect
     */
    private renderStaticEffect(effect: VisualEffect, progress: number): void {
        if (!this.ctx) return;
        
        const width = this.config.canvas.width;
        const height = this.config.canvas.height;
        const imageData = this.ctx.createImageData(width, height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const value = Math.random() * 255;
            imageData.data[i] = value;
            imageData.data[i + 1] = value;
            imageData.data[i + 2] = value;
            imageData.data[i + 3] = 50 * (1 - progress);
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Render Muse transition
     */
    private renderMuseTransition(progress: number): void {
        if (!this.ctx) return;
        
        const centerX = this.config.canvas.width / 2;
        const centerY = this.config.canvas.height / 2;
        const radius = progress * 300;
        
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0, 255, 170, 0.3)');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    }
    
    /**
     * Render Critic transition
     */
    private renderCriticTransition(progress: number): void {
        if (!this.ctx) return;
        
        this.ctx.strokeStyle = `rgba(255, 0, 102, ${0.5 * progress})`;
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 10; i++) {
            const y = (i / 10) * this.config.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.config.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Render Archivist transition
     */
    private renderArchivistTransition(progress: number): void {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = `rgba(102, 0, 255, ${0.2 * progress})`;
        this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    }
    
    /**
     * Easing function for smooth transitions
     */
    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Clear all active effects
     */
    public clearEffects(): void {
        this.activeEffects.clear();
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.config.canvas.width, this.config.canvas.height);
        }
    }
    
    /**
     * Enable or disable overlay
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        if (!enabled) {
            this.clearEffects();
            this.stopRendering();
        }
    }
    
    /**
     * Set global opacity
     */
    public setOpacity(opacity: number): void {
        this.config.opacity = Math.max(0, Math.min(1, opacity));
    }
    
    /**
     * Dispose of overlay resources
     */
    public dispose(): void {
        this.stopRendering();
        this.clearEffects();
        window.removeEventListener('resize', () => this.resizeCanvas());
    }
}
