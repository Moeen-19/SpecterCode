/**
 * Audio Manager - Handles spatial audio effects, ambient loops, and sound events
 */

import { AudioSpec, ActionSoundMap, EmotionalSoundMap } from '../models/ThemeModels';
import { EmotionalState, EmotionType } from '../models/EmotionalModels';

/**
 * Audio playback options
 */
export interface AudioPlaybackOptions {
    volume?: number;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
    spatial?: boolean;
    position?: { x: number; y: number };
}

/**
 * Sound event type
 */
export type SoundEventType = 'action' | 'emotional' | 'ambient';

/**
 * Sound event
 */
export interface SoundEvent {
    type: SoundEventType;
    soundKey: string;
    options?: AudioPlaybackOptions;
}

/**
 * Audio context state
 */
type AudioContextState = 'suspended' | 'running' | 'closed';

/**
 * AudioManager manages all audio playback using Web Audio API
 */
export class AudioManager {
    private audioContext: AudioContext | null = null;
    private masterGainNode: GainNode | null = null;
    private ambientGainNode: GainNode | null = null;
    private effectsGainNode: GainNode | null = null;
    private audioSpec: AudioSpec | null = null;
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private activeSources: Map<string, AudioBufferSourceNode> = new Map();
    private ambientSource: AudioBufferSourceNode | null = null;
    private isEnabled: boolean = true;
    private isMuted: boolean = false;
    private masterVolume: number = 1.0;
    
    constructor() {
        this.initializeAudioContext();
    }
    
    /**
     * Initialize Web Audio API context
     */
    private initializeAudioContext(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Create master gain node
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.connect(this.audioContext.destination);
            
            // Create gain nodes for different audio types
            this.ambientGainNode = this.audioContext.createGain();
            this.ambientGainNode.connect(this.masterGainNode);
            
            this.effectsGainNode = this.audioContext.createGain();
            this.effectsGainNode.connect(this.masterGainNode);
            
            // Handle audio context state changes
            this.audioContext.addEventListener('statechange', () => {
                console.log('Audio context state:', this.audioContext?.state);
            });
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            this.isEnabled = false;
        }
    }
    
    /**
     * Resume audio context (required for user interaction)
     */
    public async resumeAudioContext(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.error('Failed to resume audio context:', error);
            }
        }
    }
    
    /**
     * Load audio specification from theme
     */
    public async loadAudioSpec(audioSpec: AudioSpec): Promise<void> {
        this.audioSpec = audioSpec;
        this.setMasterVolume(audioSpec.volume);
        
        // Preload ambient audio
        if (audioSpec.ambient.audioPath) {
            await this.loadAudio('ambient', audioSpec.ambient.audioPath);
        }
        
        // Preload action sounds
        for (const [key, path] of Object.entries(audioSpec.actionSounds)) {
            if (path) {
                await this.loadAudio(`action_${key}`, path);
            }
        }
        
        // Preload emotional sounds
        for (const [key, path] of Object.entries(audioSpec.emotionalSounds)) {
            if (path) {
                await this.loadAudio(`emotional_${key}`, path);
            }
        }
    }
    
    /**
     * Load an audio file and decode it
     */
    private async loadAudio(key: string, path: string): Promise<void> {
        if (!this.audioContext || !this.isEnabled) return;
        
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(key, audioBuffer);
        } catch (error) {
            console.warn(`Failed to load audio: ${path}`, error);
        }
    }
    
    /**
     * Play ambient audio loop
     */
    public playAmbient(): void {
        if (!this.audioContext || !this.audioSpec || !this.isEnabled || this.isMuted) return;
        
        const buffer = this.audioBuffers.get('ambient');
        if (!buffer) {
            console.warn('Ambient audio buffer not loaded');
            return;
        }
        
        // Stop existing ambient if playing
        this.stopAmbient();
        
        // Create source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = this.audioSpec.ambient.loop;
        
        // Connect to ambient gain node
        source.connect(this.ambientGainNode!);
        
        // Set volume
        this.ambientGainNode!.gain.value = this.audioSpec.ambient.volume;
        
        // Fade in
        if (this.audioSpec.ambient.fadeInDuration > 0) {
            this.ambientGainNode!.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.ambientGainNode!.gain.linearRampToValueAtTime(
                this.audioSpec.ambient.volume,
                this.audioContext.currentTime + this.audioSpec.ambient.fadeInDuration / 1000
            );
        }
        
        // Start playback
        source.start(0);
        this.ambientSource = source;
    }
    
    /**
     * Stop ambient audio
     */
    public stopAmbient(): void {
        if (!this.ambientSource || !this.audioContext || !this.audioSpec) return;
        
        // Fade out
        if (this.audioSpec.ambient.fadeOutDuration > 0) {
            const currentGain = this.ambientGainNode!.gain.value;
            this.ambientGainNode!.gain.setValueAtTime(currentGain, this.audioContext.currentTime);
            this.ambientGainNode!.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + this.audioSpec.ambient.fadeOutDuration / 1000
            );
            
            setTimeout(() => {
                this.ambientSource?.stop();
                this.ambientSource = null;
            }, this.audioSpec.ambient.fadeOutDuration);
        } else {
            this.ambientSource.stop();
            this.ambientSource = null;
        }
    }
    
    /**
     * Play an action sound
     */
    public playActionSound(action: keyof ActionSoundMap, options?: AudioPlaybackOptions): void {
        if (!this.isEnabled || this.isMuted) return;
        
        const key = `action_${action}`;
        this.playSound(key, options);
    }
    
    /**
     * Play an emotional sound
     */
    public playEmotionalSound(emotion: keyof EmotionalSoundMap, options?: AudioPlaybackOptions): void {
        if (!this.isEnabled || this.isMuted) return;
        
        const key = `emotional_${emotion}`;
        this.playSound(key, options);
    }
    
    /**
     * Play a sound by key
     */
    private playSound(key: string, options?: AudioPlaybackOptions): void {
        if (!this.audioContext || !this.audioSpec) return;
        
        const buffer = this.audioBuffers.get(key);
        if (!buffer) {
            console.warn(`Audio buffer not found: ${key}`);
            return;
        }
        
        // Resume audio context if needed
        this.resumeAudioContext();
        
        // Create source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = options?.loop || false;
        
        // Create gain node for this sound
        const gainNode = this.audioContext.createGain();
        const volume = options?.volume ?? 1.0;
        gainNode.gain.value = volume;
        
        // Apply spatial audio if enabled
        if (options?.spatial && options?.position && this.audioSpec.spatialAudio) {
            const panner = this.audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;
            
            // Set position (normalize to -1 to 1 range)
            const x = (options.position.x / window.innerWidth) * 2 - 1;
            const y = (options.position.y / window.innerHeight) * 2 - 1;
            panner.setPosition(x, y, 0);
            
            source.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(this.effectsGainNode!);
        } else {
            source.connect(gainNode);
            gainNode.connect(this.effectsGainNode!);
        }
        
        // Fade in if specified
        if (options?.fadeIn) {
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                volume,
                this.audioContext.currentTime + options.fadeIn / 1000
            );
        }
        
        // Start playback
        source.start(0);
        
        // Store active source
        this.activeSources.set(key, source);
        
        // Clean up when finished
        source.onended = () => {
            this.activeSources.delete(key);
        };
        
        // Fade out if specified
        if (options?.fadeOut && !options.loop) {
            const duration = buffer.duration;
            const fadeOutStart = duration - options.fadeOut / 1000;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + fadeOutStart);
            gainNode.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + duration
            );
        }
    }
    
    /**
     * Update audio based on emotional state
     */
    public updateForEmotionalState(emotionalState: EmotionalState): void {
        if (!this.audioSpec || !this.isEnabled) return;
        
        // Adjust ambient volume based on emotion intensity
        if (this.ambientGainNode && this.audioContext) {
            const baseVolume = this.audioSpec.ambient.volume;
            const adjustedVolume = baseVolume * (0.7 + emotionalState.intensity * 0.3);
            
            this.ambientGainNode.gain.linearRampToValueAtTime(
                adjustedVolume,
                this.audioContext.currentTime + 0.5
            );
        }
        
        // Play emotional transition sound if emotion changed significantly
        const emotionKey = emotionalState.primary as keyof EmotionalSoundMap;
        if (this.audioSpec.emotionalSounds[emotionKey]) {
            this.playEmotionalSound(emotionKey, { volume: 0.5 });
        }
    }
    
    /**
     * Set master volume
     */
    public setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGainNode && this.audioContext) {
            this.masterGainNode.gain.linearRampToValueAtTime(
                this.masterVolume,
                this.audioContext.currentTime + 0.1
            );
        }
    }
    
    /**
     * Get master volume
     */
    public getMasterVolume(): number {
        return this.masterVolume;
    }
    
    /**
     * Mute all audio
     */
    public mute(): void {
        this.isMuted = true;
        if (this.masterGainNode && this.audioContext) {
            this.masterGainNode.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + 0.1
            );
        }
    }
    
    /**
     * Unmute audio
     */
    public unmute(): void {
        this.isMuted = false;
        if (this.masterGainNode && this.audioContext) {
            this.masterGainNode.gain.linearRampToValueAtTime(
                this.masterVolume,
                this.audioContext.currentTime + 0.1
            );
        }
    }
    
    /**
     * Check if audio is muted
     */
    public isMutedState(): boolean {
        return this.isMuted;
    }
    
    /**
     * Enable audio
     */
    public enable(): void {
        this.isEnabled = true;
    }
    
    /**
     * Disable audio
     */
    public disable(): void {
        this.isEnabled = false;
        this.stopAll();
    }
    
    /**
     * Check if audio is enabled
     */
    public isAudioEnabled(): boolean {
        return this.isEnabled;
    }
    
    /**
     * Stop all active sounds
     */
    public stopAll(): void {
        this.stopAmbient();
        
        for (const source of this.activeSources.values()) {
            try {
                source.stop();
            } catch (error) {
                // Source may already be stopped
            }
        }
        
        this.activeSources.clear();
    }
    
    /**
     * Get audio context state
     */
    public getAudioContextState(): AudioContextState | null {
        return this.audioContext?.state || null;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stopAll();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.audioBuffers.clear();
        this.masterGainNode = null;
        this.ambientGainNode = null;
        this.effectsGainNode = null;
    }
}
