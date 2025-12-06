/**
 * Vibe Coding Layer - Visual and audio feedback system
 * Exports all vibe layer components
 */

export { ThemeRenderer, CSS_VARIABLES, ThemeTransitionConfig } from './ThemeRenderer';
export { HALLOWEEN_THEME, RAINY_FOREST_THEME, getThemeByPreset, getAllDefaultThemes } from './DefaultThemes';
export { AnimationEngine, AnimationTrigger, AnimationCallback, UserActionType } from './AnimationEngine';
export { ParticleSystem, Particle, ParticleSystemConfig } from './ParticleSystem';
export { AudioManager, AudioPlaybackOptions, SoundEvent, SoundEventType } from './AudioManager';
export { PerformanceMonitor, PerformanceMetrics, QualityLevel, QualitySettings } from './PerformanceMonitor';
export { VibeCodingLayer, VibeCodingLayerConfig } from './VibeCodingLayer';
