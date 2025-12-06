/**
 * Particle System - Creates atmospheric effects like fog, fireflies, rain
 */

import { ParticleSpec } from '../models/ThemeModels';
import { EmotionalState } from '../models/EmotionalModels';

/**
 * Represents a single particle in the system
 */
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
    life: number;
    maxLife: number;
    rotation: number;
    rotationSpeed: number;
}

/**
 * Particle system configuration
 */
export interface ParticleSystemConfig extends ParticleSpec {
    canvasWidth: number;
    canvasHeight: number;
}

/**
 * ParticleSystem manages particle creation, update, and rendering
 */
export class ParticleSystem {
    private particles: Particle[] = [];
    private config: ParticleSystemConfig;
    private mouseX: number = 0;
    private mouseY: number = 0;
    
    constructor(config: ParticleSystemConfig) {
        this.config = config;
        this.initializeParticles();
    }
    
    /**
     * Initialize particles based on density
     */
    private initializeParticles(): void {
        if (!this.config.enabled) return;
        
        const area = this.config.canvasWidth * this.config.canvasHeight;
        const particleCount = Math.floor((area / 1000) * this.config.density);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    /**
     * Create a new particle with random properties
     */
    private createParticle(x?: number, y?: number): Particle {
        const [minSize, maxSize] = this.config.sizeRange;
        const [minSpeed, maxSpeed] = this.config.speedRange;
        const [minOpacity, maxOpacity] = this.config.opacityRange;
        
        const size = minSize + Math.random() * (maxSize - minSize);
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        const opacity = minOpacity + Math.random() * (maxOpacity - minOpacity);
        const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        
        // Set velocity based on behavior
        let vx = 0;
        let vy = 0;
        
        switch (this.config.behavior) {
            case 'float':
                vx = (Math.random() - 0.5) * speed * 0.5;
                vy = (Math.random() - 0.5) * speed * 0.5;
                break;
            case 'drift':
                vx = (Math.random() - 0.3) * speed * 0.3;
                vy = (Math.random() - 0.5) * speed * 0.2;
                break;
            case 'fall':
                vx = (Math.random() - 0.5) * speed * 0.2;
                vy = speed;
                break;
            case 'rise':
                vx = (Math.random() - 0.5) * speed * 0.2;
                vy = -speed;
                break;
            case 'swirl':
                const angle = Math.random() * Math.PI * 2;
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
                break;
        }
        
        return {
            x: x ?? Math.random() * this.config.canvasWidth,
            y: y ?? Math.random() * this.config.canvasHeight,
            vx,
            vy,
            size,
            opacity,
            color,
            life: 0,
            maxLife: 1000 + Math.random() * 2000,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
        };
    }
    
    /**
     * Update particle positions and properties
     */
    public update(deltaTime: number): void {
        if (!this.config.enabled) return;
        
        const dt = deltaTime / 1000; // Convert to seconds
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            
            // Update rotation
            particle.rotation += particle.rotationSpeed;
            
            // Update life
            particle.life += deltaTime;
            
            // Apply cursor interaction
            if (this.config.cursorInteraction && this.config.interactionRadius) {
                const dx = this.mouseX - particle.x;
                const dy = this.mouseY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.interactionRadius) {
                    const force = (1 - distance / this.config.interactionRadius) * 2;
                    particle.vx -= (dx / distance) * force;
                    particle.vy -= (dy / distance) * force;
                }
            }
            
            // Apply behavior-specific updates
            if (this.config.behavior === 'swirl') {
                const centerX = this.config.canvasWidth / 2;
                const centerY = this.config.canvasHeight / 2;
                const dx = particle.x - centerX;
                const dy = particle.y - centerY;
                const angle = Math.atan2(dy, dx);
                particle.vx += Math.cos(angle + Math.PI / 2) * 0.5;
                particle.vy += Math.sin(angle + Math.PI / 2) * 0.5;
            }
            
            // Wrap around screen edges or remove particle
            if (particle.x < -particle.size) {
                particle.x = this.config.canvasWidth + particle.size;
            } else if (particle.x > this.config.canvasWidth + particle.size) {
                particle.x = -particle.size;
            }
            
            if (particle.y < -particle.size) {
                particle.y = this.config.canvasHeight + particle.size;
            } else if (particle.y > this.config.canvasHeight + particle.size) {
                particle.y = -particle.size;
            }
            
            // Remove dead particles
            if (particle.life > particle.maxLife) {
                this.particles.splice(i, 1);
            }
        }
        
        // Maintain particle count
        while (this.particles.length < this.getTargetParticleCount()) {
            this.particles.push(this.createParticle());
        }
    }
    
    /**
     * Render particles to canvas
     */
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.config.enabled) return;
        
        for (const particle of this.particles) {
            ctx.save();
            
            // Apply opacity fade based on life
            const lifeFactor = Math.min(particle.life / 500, 1) * Math.max(1 - (particle.life - particle.maxLife + 500) / 500, 0);
            ctx.globalAlpha = particle.opacity * lifeFactor;
            
            // Translate and rotate
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            // Draw particle based on shape
            ctx.fillStyle = particle.color;
            
            switch (this.config.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'square':
                    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
                    break;
                    
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(0, -particle.size);
                    ctx.lineTo(particle.size, particle.size);
                    ctx.lineTo(-particle.size, particle.size);
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            
            ctx.restore();
        }
    }
    
    /**
     * Update mouse position for cursor interaction
     */
    public updateMousePosition(x: number, y: number): void {
        this.mouseX = x;
        this.mouseY = y;
    }
    
    /**
     * Update configuration
     */
    public updateConfig(config: Partial<ParticleSystemConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Adjust particle count if density changed
        const targetCount = this.getTargetParticleCount();
        if (this.particles.length > targetCount) {
            this.particles.length = targetCount;
        }
    }
    
    /**
     * Get target particle count based on density
     */
    private getTargetParticleCount(): number {
        const area = this.config.canvasWidth * this.config.canvasHeight;
        return Math.floor((area / 1000) * this.config.density);
    }
    
    /**
     * Adjust particles based on emotional state
     */
    public updateForEmotionalState(emotionalState: EmotionalState): void {
        // Adjust particle behavior based on emotion
        switch (emotionalState.primary) {
            case 'excited':
                this.config.speedRange = [30, 60];
                this.config.density = Math.min(this.config.density * 1.5, 50);
                break;
            case 'calm':
                this.config.speedRange = [5, 15];
                break;
            case 'frustrated':
                this.config.speedRange = [20, 40];
                // Add some erratic movement
                this.particles.forEach(p => {
                    p.vx += (Math.random() - 0.5) * 10;
                    p.vy += (Math.random() - 0.5) * 10;
                });
                break;
            case 'tense':
                this.config.opacityRange = [0.1, 0.4];
                break;
        }
    }
    
    /**
     * Burst particles from a specific location
     */
    public burst(x: number, y: number, count: number = 20): void {
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(x, y);
            const angle = (Math.PI * 2 * i) / count;
            const speed = 50 + Math.random() * 50;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.maxLife = 500 + Math.random() * 500;
            this.particles.push(particle);
        }
    }
    
    /**
     * Clear all particles
     */
    public clear(): void {
        this.particles = [];
    }
    
    /**
     * Get particle count
     */
    public getParticleCount(): number {
        return this.particles.length;
    }
}
