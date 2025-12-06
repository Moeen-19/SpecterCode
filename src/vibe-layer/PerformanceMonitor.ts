/**
 * Performance Monitor - Tracks FPS, resource usage, and implements quality adjustment
 */

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    fps: number;
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    frameTime: number;
    memoryUsage?: number;
    particleCount: number;
    activeAnimations: number;
    audioBuffersLoaded: number;
    qualityLevel: QualityLevel;
}

/**
 * Quality level for performance adjustment
 */
export enum QualityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    ULTRA = 'ultra',
}

/**
 * Quality settings for each level
 */
export interface QualitySettings {
    particleDensity: number;
    maxParticles: number;
    animationSpeed: number;
    enableBlur: boolean;
    enableGlow: boolean;
    enableVignette: boolean;
    enableChromaticAberration: boolean;
    audioEnabled: boolean;
}

/**
 * Performance thresholds for quality adjustment
 */
const PERFORMANCE_THRESHOLDS = {
    LOW_FPS: 30,
    MEDIUM_FPS: 45,
    HIGH_FPS: 55,
    TARGET_FPS: 60,
};

/**
 * Quality settings presets
 */
const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
    [QualityLevel.LOW]: {
        particleDensity: 5,
        maxParticles: 50,
        animationSpeed: 0.5,
        enableBlur: false,
        enableGlow: false,
        enableVignette: false,
        enableChromaticAberration: false,
        audioEnabled: true,
    },
    [QualityLevel.MEDIUM]: {
        particleDensity: 10,
        maxParticles: 100,
        animationSpeed: 0.75,
        enableBlur: false,
        enableGlow: true,
        enableVignette: true,
        enableChromaticAberration: false,
        audioEnabled: true,
    },
    [QualityLevel.HIGH]: {
        particleDensity: 15,
        maxParticles: 200,
        animationSpeed: 1.0,
        enableBlur: true,
        enableGlow: true,
        enableVignette: true,
        enableChromaticAberration: false,
        audioEnabled: true,
    },
    [QualityLevel.ULTRA]: {
        particleDensity: 25,
        maxParticles: 500,
        animationSpeed: 1.0,
        enableBlur: true,
        enableGlow: true,
        enableVignette: true,
        enableChromaticAberration: true,
        audioEnabled: true,
    },
};

/**
 * Performance monitor callback
 */
export type PerformanceCallback = (metrics: PerformanceMetrics) => void;

/**
 * Quality change callback
 */
export type QualityChangeCallback = (level: QualityLevel, settings: QualitySettings) => void;

/**
 * PerformanceMonitor tracks performance metrics and adjusts quality
 */
export class PerformanceMonitor {
    private fpsHistory: number[] = [];
    private frameTimeHistory: number[] = [];
    private lastFrameTime: number = 0;
    private currentFPS: number = 60;
    private currentQuality: QualityLevel = QualityLevel.HIGH;
    private autoAdjustEnabled: boolean = true;
    private metricsCallbacks: PerformanceCallback[] = [];
    private qualityCallbacks: QualityChangeCallback[] = [];
    private particleCount: number = 0;
    private activeAnimations: number = 0;
    private audioBuffersLoaded: number = 0;
    private performanceCheckInterval: number | null = null;
    private lowPerformanceFrames: number = 0;
    private readonly HISTORY_SIZE = 120; // 2 seconds at 60fps
    private readonly CHECK_INTERVAL = 2000; // Check every 2 seconds
    private readonly LOW_PERFORMANCE_THRESHOLD = 30; // 30 frames below target
    
    constructor(initialQuality: QualityLevel = QualityLevel.HIGH) {
        this.currentQuality = initialQuality;
        this.startMonitoring();
    }
    
    /**
     * Start performance monitoring
     */
    private startMonitoring(): void {
        this.performanceCheckInterval = window.setInterval(() => {
            this.checkPerformance();
        }, this.CHECK_INTERVAL);
    }
    
    /**
     * Update FPS measurement
     */
    public updateFPS(deltaTime: number): void {
        const currentTime = performance.now();
        
        if (this.lastFrameTime > 0) {
            const actualDelta = currentTime - this.lastFrameTime;
            const fps = 1000 / actualDelta;
            
            this.fpsHistory.push(fps);
            this.frameTimeHistory.push(actualDelta);
            
            // Keep history size limited
            if (this.fpsHistory.length > this.HISTORY_SIZE) {
                this.fpsHistory.shift();
                this.frameTimeHistory.shift();
            }
            
            // Calculate current FPS
            this.currentFPS = fps;
            
            // Track low performance frames
            if (fps < PERFORMANCE_THRESHOLDS.TARGET_FPS - 5) {
                this.lowPerformanceFrames++;
            }
        }
        
        this.lastFrameTime = currentTime;
    }
    
    /**
     * Check performance and adjust quality if needed
     */
    private checkPerformance(): void {
        if (!this.autoAdjustEnabled || this.fpsHistory.length < 60) return;
        
        const avgFPS = this.getAverageFPS();
        const minFPS = this.getMinFPS();
        
        // Determine if quality adjustment is needed
        if (minFPS < PERFORMANCE_THRESHOLDS.LOW_FPS || 
            this.lowPerformanceFrames > this.LOW_PERFORMANCE_THRESHOLD) {
            // Performance is poor, reduce quality
            this.reduceQuality();
            this.lowPerformanceFrames = 0;
        } else if (avgFPS > PERFORMANCE_THRESHOLDS.HIGH_FPS && 
                   minFPS > PERFORMANCE_THRESHOLDS.MEDIUM_FPS &&
                   this.currentQuality !== QualityLevel.ULTRA) {
            // Performance is good, try increasing quality
            this.increaseQuality();
        }
    }
    
    /**
     * Reduce quality level
     */
    private reduceQuality(): void {
        const levels = [QualityLevel.ULTRA, QualityLevel.HIGH, QualityLevel.MEDIUM, QualityLevel.LOW];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex < levels.length - 1) {
            this.setQualityLevel(levels[currentIndex + 1]);
            console.log(`Performance: Reduced quality to ${this.currentQuality}`);
        }
    }
    
    /**
     * Increase quality level
     */
    private increaseQuality(): void {
        const levels = [QualityLevel.LOW, QualityLevel.MEDIUM, QualityLevel.HIGH, QualityLevel.ULTRA];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex < levels.length - 1) {
            this.setQualityLevel(levels[currentIndex + 1]);
            console.log(`Performance: Increased quality to ${this.currentQuality}`);
        }
    }
    
    /**
     * Set quality level
     */
    public setQualityLevel(level: QualityLevel): void {
        if (this.currentQuality === level) return;
        
        this.currentQuality = level;
        const settings = this.getQualitySettings();
        
        // Notify callbacks
        for (const callback of this.qualityCallbacks) {
            callback(level, settings);
        }
    }
    
    /**
     * Get current quality level
     */
    public getQualityLevel(): QualityLevel {
        return this.currentQuality;
    }
    
    /**
     * Get quality settings for current level
     */
    public getQualitySettings(): QualitySettings {
        return QUALITY_PRESETS[this.currentQuality];
    }
    
    /**
     * Get quality settings for a specific level
     */
    public getQualitySettingsForLevel(level: QualityLevel): QualitySettings {
        return QUALITY_PRESETS[level];
    }
    
    /**
     * Enable automatic quality adjustment
     */
    public enableAutoAdjust(): void {
        this.autoAdjustEnabled = true;
    }
    
    /**
     * Disable automatic quality adjustment
     */
    public disableAutoAdjust(): void {
        this.autoAdjustEnabled = false;
    }
    
    /**
     * Check if auto-adjust is enabled
     */
    public isAutoAdjustEnabled(): boolean {
        return this.autoAdjustEnabled;
    }
    
    /**
     * Get current FPS
     */
    public getCurrentFPS(): number {
        return Math.round(this.currentFPS);
    }
    
    /**
     * Get average FPS
     */
    public getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return 60;
        
        const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.fpsHistory.length);
    }
    
    /**
     * Get minimum FPS
     */
    public getMinFPS(): number {
        if (this.fpsHistory.length === 0) return 60;
        return Math.round(Math.min(...this.fpsHistory));
    }
    
    /**
     * Get maximum FPS
     */
    public getMaxFPS(): number {
        if (this.fpsHistory.length === 0) return 60;
        return Math.round(Math.max(...this.fpsHistory));
    }
    
    /**
     * Get average frame time
     */
    public getAverageFrameTime(): number {
        if (this.frameTimeHistory.length === 0) return 16.67;
        
        const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
        return sum / this.frameTimeHistory.length;
    }
    
    /**
     * Get memory usage (if available)
     */
    public getMemoryUsage(): number | undefined {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        }
        return undefined;
    }
    
    /**
     * Update resource counts
     */
    public updateResourceCounts(particles: number, animations: number, audioBuffers: number): void {
        this.particleCount = particles;
        this.activeAnimations = animations;
        this.audioBuffersLoaded = audioBuffers;
    }
    
    /**
     * Get current performance metrics
     */
    public getMetrics(): PerformanceMetrics {
        return {
            fps: this.getCurrentFPS(),
            averageFPS: this.getAverageFPS(),
            minFPS: this.getMinFPS(),
            maxFPS: this.getMaxFPS(),
            frameTime: this.getAverageFrameTime(),
            memoryUsage: this.getMemoryUsage(),
            particleCount: this.particleCount,
            activeAnimations: this.activeAnimations,
            audioBuffersLoaded: this.audioBuffersLoaded,
            qualityLevel: this.currentQuality,
        };
    }
    
    /**
     * Add metrics callback
     */
    public onMetricsUpdate(callback: PerformanceCallback): void {
        this.metricsCallbacks.push(callback);
    }
    
    /**
     * Remove metrics callback
     */
    public offMetricsUpdate(callback: PerformanceCallback): void {
        const index = this.metricsCallbacks.indexOf(callback);
        if (index !== -1) {
            this.metricsCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Add quality change callback
     */
    public onQualityChange(callback: QualityChangeCallback): void {
        this.qualityCallbacks.push(callback);
    }
    
    /**
     * Remove quality change callback
     */
    public offQualityChange(callback: QualityChangeCallback): void {
        const index = this.qualityCallbacks.indexOf(callback);
        if (index !== -1) {
            this.qualityCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Notify metrics callbacks
     */
    public notifyMetricsCallbacks(): void {
        const metrics = this.getMetrics();
        for (const callback of this.metricsCallbacks) {
            callback(metrics);
        }
    }
    
    /**
     * Check if performance is degraded
     */
    public isPerformanceDegraded(): boolean {
        return this.getAverageFPS() < PERFORMANCE_THRESHOLDS.MEDIUM_FPS;
    }
    
    /**
     * Get performance status
     */
    public getPerformanceStatus(): 'excellent' | 'good' | 'fair' | 'poor' {
        const avgFPS = this.getAverageFPS();
        
        if (avgFPS >= PERFORMANCE_THRESHOLDS.HIGH_FPS) return 'excellent';
        if (avgFPS >= PERFORMANCE_THRESHOLDS.MEDIUM_FPS) return 'good';
        if (avgFPS >= PERFORMANCE_THRESHOLDS.LOW_FPS) return 'fair';
        return 'poor';
    }
    
    /**
     * Reset performance history
     */
    public reset(): void {
        this.fpsHistory = [];
        this.frameTimeHistory = [];
        this.lowPerformanceFrames = 0;
        this.lastFrameTime = 0;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.performanceCheckInterval !== null) {
            clearInterval(this.performanceCheckInterval);
            this.performanceCheckInterval = null;
        }
        
        this.metricsCallbacks = [];
        this.qualityCallbacks = [];
        this.reset();
    }
}
