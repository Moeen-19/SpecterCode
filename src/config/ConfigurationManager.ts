/**
 * Configuration Manager for MirrorCanvas
 * Handles user preferences, theme management, and settings persistence
 */

import * as vscode from 'vscode';
import { UserConfig, PerformanceMode } from '../models/SystemModels';
import { ThemeSpec, ThemePreset, ThemeValidationResult } from '../models/ThemeModels';

/**
 * Configuration Manager for handling user preferences and theme management
 */
export class ConfigurationManager {
    private context: vscode.ExtensionContext;
    private userConfig: UserConfig;
    private configChangeEmitter = new vscode.EventEmitter<UserConfig>();
    public readonly onConfigChange = this.configChangeEmitter.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.userConfig = this.loadUserConfig();
    }

    /**
     * Load user configuration from VS Code settings and local storage
     */
    private loadUserConfig(): UserConfig {
        const config = vscode.workspace.getConfiguration('mirrorCanvas');
        
        const userConfig: UserConfig = {
            enabled: config.get('enabled', true),
            theme: config.get('theme', ThemePreset.HALLOWEEN),
            emotionSensitivity: config.get('emotionSensitivity', 0.7),
            animationIntensity: config.get('animationIntensity', 0.8),
            audioEnabled: config.get('audioEnabled', true),
            audioVolume: config.get('audioVolume', 0.3),
            particlesEnabled: config.get('particlesEnabled', true),
            particleDensity: config.get('particleDensity', 50),
            personasEnabled: config.get('personasEnabled', true),
            performanceMode: config.get('performanceMode', PerformanceMode.BALANCED),
            collectHistory: config.get('collectHistory', true),
            customThemes: this.context.globalState.get('customThemes', {}),
            shortcuts: this.context.globalState.get('shortcuts', {}),
            privacy: {
                allowEmotionalTracking: config.get('privacy.allowEmotionalTracking', true),
                allowAnalytics: config.get('privacy.allowAnalytics', true),
                allowCrashReports: config.get('privacy.allowCrashReports', true),
                anonymizeData: config.get('privacy.anonymizeData', false),
            },
        };

        return userConfig;
    }

    /**
     * Get current user configuration
     */
    public getUserConfig(): UserConfig {
        return this.userConfig;
    }

    /**
     * Update user configuration
     */
    public async updateUserConfig(updates: Partial<UserConfig>): Promise<void> {
        const config = vscode.workspace.getConfiguration('mirrorCanvas');
        
        // Update VS Code settings
        if (updates.enabled !== undefined) {
            await config.update('enabled', updates.enabled, vscode.ConfigurationTarget.Global);
        }
        if (updates.theme !== undefined) {
            await config.update('theme', updates.theme, vscode.ConfigurationTarget.Global);
        }
        if (updates.emotionSensitivity !== undefined) {
            await config.update('emotionSensitivity', updates.emotionSensitivity, vscode.ConfigurationTarget.Global);
        }
        if (updates.animationIntensity !== undefined) {
            await config.update('animationIntensity', updates.animationIntensity, vscode.ConfigurationTarget.Global);
        }
        if (updates.audioEnabled !== undefined) {
            await config.update('audioEnabled', updates.audioEnabled, vscode.ConfigurationTarget.Global);
        }
        if (updates.audioVolume !== undefined) {
            await config.update('audioVolume', updates.audioVolume, vscode.ConfigurationTarget.Global);
        }
        if (updates.particlesEnabled !== undefined) {
            await config.update('particlesEnabled', updates.particlesEnabled, vscode.ConfigurationTarget.Global);
        }
        if (updates.particleDensity !== undefined) {
            await config.update('particleDensity', updates.particleDensity, vscode.ConfigurationTarget.Global);
        }
        if (updates.personasEnabled !== undefined) {
            await config.update('personasEnabled', updates.personasEnabled, vscode.ConfigurationTarget.Global);
        }
        if (updates.performanceMode !== undefined) {
            await config.update('performanceMode', updates.performanceMode, vscode.ConfigurationTarget.Global);
        }
        if (updates.collectHistory !== undefined) {
            await config.update('collectHistory', updates.collectHistory, vscode.ConfigurationTarget.Global);
        }

        // Update local storage for custom data
        if (updates.customThemes !== undefined) {
            await this.context.globalState.update('customThemes', updates.customThemes);
        }
        if (updates.shortcuts !== undefined) {
            await this.context.globalState.update('shortcuts', updates.shortcuts);
        }
        if (updates.privacy !== undefined) {
            await this.context.globalState.update('privacy', updates.privacy);
        }

        // Update in-memory config
        this.userConfig = { ...this.userConfig, ...updates };
        
        // Emit change event
        this.configChangeEmitter.fire(this.userConfig);
    }

    /**
     * Validate a theme specification
     */
    public validateThemeSpec(theme: ThemeSpec): ThemeValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate metadata
        if (!theme.metadata?.id) {
            errors.push('Theme must have a valid metadata.id');
        }
        if (!theme.metadata?.name) {
            errors.push('Theme must have a valid metadata.name');
        }

        // Validate visual properties
        if (!theme.visual?.palette?.primary) {
            errors.push('Theme must have a valid visual.palette.primary color');
        }
        if (!this.isValidHexColor(theme.visual?.palette?.primary)) {
            errors.push('Theme primary color must be a valid hex color');
        }

        // Validate effects
        if (theme.visual?.effects?.glowIntensity !== undefined) {
            if (theme.visual.effects.glowIntensity < 0 || theme.visual.effects.glowIntensity > 1) {
                errors.push('Theme glowIntensity must be between 0 and 1');
            }
        }

        // Validate audio
        if (theme.audio?.volume !== undefined) {
            if (theme.audio.volume < 0 || theme.audio.volume > 1) {
                errors.push('Theme audio volume must be between 0 and 1');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Load a theme by name or ID
     */
    public loadTheme(themeName: string): ThemeSpec | null {
        // Check if it's a custom theme
        if (this.userConfig.customThemes[themeName]) {
            return this.userConfig.customThemes[themeName];
        }

        // Return null if theme not found (will be handled by caller)
        return null;
    }

    /**
     * Save a custom theme
     */
    public async saveCustomTheme(theme: ThemeSpec): Promise<void> {
        const validation = this.validateThemeSpec(theme);
        if (!validation.isValid) {
            throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
        }

        const customThemes = { ...this.userConfig.customThemes };
        customThemes[theme.metadata.id] = theme;

        await this.updateUserConfig({ customThemes });
    }

    /**
     * Delete a custom theme
     */
    public async deleteCustomTheme(themeId: string): Promise<void> {
        const customThemes = { ...this.userConfig.customThemes };
        delete customThemes[themeId];

        await this.updateUserConfig({ customThemes });
    }

    /**
     * Get all available themes (presets + custom)
     */
    public getAvailableThemes(): { id: string; name: string; isCustom: boolean }[] {
        const themes: { id: string; name: string; isCustom: boolean }[] = [
            { id: ThemePreset.HALLOWEEN, name: 'Halloween', isCustom: false },
            { id: ThemePreset.RAINY_FOREST, name: 'Rainy Forest', isCustom: false },
            { id: ThemePreset.CAFE, name: 'Café', isCustom: false },
            { id: ThemePreset.CAVE, name: 'Cave', isCustom: false },
            { id: ThemePreset.NEON_CITY, name: 'Neon City', isCustom: false },
        ];

        // Add custom themes
        Object.values(this.userConfig.customThemes).forEach(theme => {
            themes.push({
                id: theme.metadata.id,
                name: theme.metadata.name,
                isCustom: true,
            });
        });

        return themes;
    }

    /**
     * Helper to validate hex color format
     */
    private isValidHexColor(color: string): boolean {
        if (!color) return false;
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.configChangeEmitter.dispose();
    }
}