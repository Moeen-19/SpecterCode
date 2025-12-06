/**
 * Settings Panel for MirrorCanvas
 * Provides a webview-based UI for theme selection, customization, and configuration
 */

import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { UserConfig, PerformanceMode } from '../models/SystemModels';
import { ThemeSpec, ThemePreset } from '../models/ThemeModels';

/**
 * Settings panel webview for user configuration and theme management
 */
export class SettingsPanel {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private configManager: ConfigurationManager;
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager) {
        this.context = context;
        this.configManager = configManager;
    }

    /**
     * Show the settings panel
     */
    public show(): void {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'mirrorCanvasSettings',
            'MirrorCanvas Settings',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
            }
        );

        // Set webview content
        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message),
            undefined,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
                this.disposables.forEach(d => d.dispose());
                this.disposables = [];
            },
            undefined,
            this.disposables
        );

        // Listen for config changes
        const configChangeListener = this.configManager.onConfigChange(config => {
            this.updateWebviewConfig(config);
        });
        this.disposables.push(configChangeListener);
    }

    /**
     * Handle messages from the webview
     */
    private async handleWebviewMessage(message: Record<string, any>): Promise<void> {
        switch (message.command) {
            case 'getConfig':
                this.sendConfigToWebview();
                break;

            case 'updateTheme':
                await this.handleThemeChange(message.theme);
                break;

            case 'updateAnimationIntensity':
                await this.configManager.updateUserConfig({
                    animationIntensity: message.value
                });
                break;

            case 'updateEmotionSensitivity':
                await this.configManager.updateUserConfig({
                    emotionSensitivity: message.value
                });
                break;

            case 'updateAudioVolume':
                await this.configManager.updateUserConfig({
                    audioVolume: message.value
                });
                break;

            case 'updateParticleDensity':
                await this.configManager.updateUserConfig({
                    particleDensity: message.value
                });
                break;

            case 'toggleAudio':
                await this.configManager.updateUserConfig({
                    audioEnabled: message.enabled
                });
                break;

            case 'toggleParticles':
                await this.configManager.updateUserConfig({
                    particlesEnabled: message.enabled
                });
                break;

            case 'togglePersonas':
                await this.configManager.updateUserConfig({
                    personasEnabled: message.enabled
                });
                break;

            case 'updatePerformanceMode':
                await this.configManager.updateUserConfig({
                    performanceMode: message.mode
                });
                break;

            case 'previewTheme':
                await this.handleThemePreview(message.theme);
                break;

            case 'importTheme':
                await this.handleThemeImport();
                break;

            case 'exportTheme':
                await this.handleThemeExport();
                break;

            case 'resetToDefaults':
                await this.handleResetToDefaults();
                break;

            case 'validateTheme':
                this.handleThemeValidation(message.theme);
                break;

            default:
                console.warn('Unknown command from webview:', message.command);
        }
    }

    /**
     * Send current configuration to webview
     */
    private sendConfigToWebview(): void {
        if (!this.panel) return;

        const config = this.configManager.getUserConfig();
        const availableThemes = this.configManager.getAvailableThemes();

        this.panel.webview.postMessage({
            command: 'configUpdate',
            config,
            availableThemes
        });
    }

    /**
     * Update webview when config changes
     */
    private updateWebviewConfig(config: UserConfig): void {
        if (!this.panel) return;

        this.panel.webview.postMessage({
            command: 'configUpdate',
            config
        });
    }

    /**
     * Handle theme change
     */
    private async handleThemeChange(themeId: string): Promise<void> {
        try {
            // Validate theme exists
            const availableThemes = this.configManager.getAvailableThemes();
            const themeExists = availableThemes.some(t => t.id === themeId);

            if (!themeExists) {
                this.showError(`Theme "${themeId}" not found`);
                return;
            }

            // Update configuration
            await this.configManager.updateUserConfig({ theme: themeId });

            // Send success message to webview
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'themeChanged',
                    theme: themeId
                });
            }
        } catch (error) {
            this.showError(`Failed to change theme: ${(error as Error).message}`);
        }
    }

    /**
     * Handle theme preview
     */
    private async handleThemePreview(themeId: string): Promise<void> {
        try {
            const availableThemes = this.configManager.getAvailableThemes();
            const themeExists = availableThemes.some(t => t.id === themeId);

            if (!themeExists) {
                this.showError(`Theme "${themeId}" not found`);
                return;
            }

            // Send preview command to main extension
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'previewTheme',
                    theme: themeId
                });
            }
        } catch (error) {
            this.showError(`Failed to preview theme: ${(error as Error).message}`);
        }
    }

    /**
     * Handle theme import
     */
    private async handleThemeImport(): Promise<void> {
        try {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Theme Files': ['json'],
                    'All Files': ['*']
                }
            });

            if (!fileUri || fileUri.length === 0) {
                return;
            }

            const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
            const themeData = JSON.parse(fileContent.toString());

            // Validate theme
            const validation = this.configManager.validateThemeSpec(themeData);
            if (!validation.isValid) {
                this.showError(`Invalid theme file: ${validation.errors.join(', ')}`);
                return;
            }

            // Save custom theme
            await this.configManager.saveCustomTheme(themeData);

            // Show success message
            vscode.window.showInformationMessage(`Theme "${themeData.metadata.name}" imported successfully`);

            // Refresh webview
            this.sendConfigToWebview();
        } catch (error) {
            this.showError(`Failed to import theme: ${(error as Error).message}`);
        }
    }

    /**
     * Handle theme export
     */
    private async handleThemeExport(): Promise<void> {
        try {
            const config = this.configManager.getUserConfig();
            const currentThemeId = config.theme;

            // Get current theme
            let theme: ThemeSpec | null = null;
            if (typeof currentThemeId === 'string') {
                theme = this.configManager.loadTheme(currentThemeId);
            }

            if (!theme) {
                this.showError('Current theme cannot be exported');
                return;
            }

            // Show save dialog
            const fileUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`${theme.metadata.name}.json`),
                filters: {
                    'Theme Files': ['json'],
                    'All Files': ['*']
                }
            });

            if (!fileUri) {
                return;
            }

            // Write theme to file
            const themeJson = JSON.stringify(theme, null, 2);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(themeJson));

            vscode.window.showInformationMessage(`Theme exported to ${fileUri.fsPath}`);
        } catch (error) {
            this.showError(`Failed to export theme: ${(error as Error).message}`);
        }
    }

    /**
     * Handle reset to defaults
     */
    private async handleResetToDefaults(): Promise<void> {
        const confirmed = await vscode.window.showWarningMessage(
            'Reset all settings to defaults?',
            'Yes',
            'No'
        );

        if (confirmed !== 'Yes') {
            return;
        }

        try {
            await this.configManager.updateUserConfig({
                theme: ThemePreset.HALLOWEEN,
                emotionSensitivity: 0.7,
                animationIntensity: 0.8,
                audioEnabled: true,
                audioVolume: 0.3,
                particlesEnabled: true,
                particleDensity: 50,
                personasEnabled: true,
                performanceMode: PerformanceMode.BALANCED,
                collectHistory: true
            });

            vscode.window.showInformationMessage('Settings reset to defaults');
            this.sendConfigToWebview();
        } catch (error) {
            this.showError(`Failed to reset settings: ${(error as Error).message}`);
        }
    }

    /**
     * Handle theme validation
     */
    private handleThemeValidation(theme: ThemeSpec): void {
        if (!this.panel) return;

        const validation = this.configManager.validateThemeSpec(theme);

        this.panel.webview.postMessage({
            command: 'validationResult',
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings
        });
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        vscode.window.showErrorMessage(`MirrorCanvas: ${message}`);
    }

    /**
     * Generate webview HTML content
     */
    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MirrorCanvas Settings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        h1 {
            font-size: 24px;
            margin-bottom: 20px;
            color: var(--vscode-editor-foreground);
        }

        h2 {
            font-size: 16px;
            margin-top: 24px;
            margin-bottom: 12px;
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 8px;
        }

        .section {
            margin-bottom: 24px;
        }

        .setting-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        .label-with-value {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .label-with-value label {
            margin-bottom: 0;
        }

        .value-display {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }

        select, input[type="range"], input[type="number"] {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 13px;
        }

        select:focus, input[type="range"]:focus, input[type="number"]:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }

        input[type="range"] {
            padding: 0;
            height: 24px;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .checkbox-group label {
            margin-bottom: 0;
            cursor: pointer;
            flex: 1;
        }

        .button-group {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            flex-wrap: wrap;
        }

        button {
            flex: 1;
            min-width: 120px;
            padding: 8px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:active {
            background-color: var(--vscode-button-background);
        }

        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .theme-preview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 8px;
            margin-top: 8px;
        }

        .theme-option {
            padding: 12px;
            border: 2px solid var(--vscode-widget-border);
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            background-color: var(--vscode-editor-background);
        }

        .theme-option:hover {
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-editor-lineHighlightBackground);
        }

        .theme-option.active {
            border-color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-editor-lineHighlightBackground);
            font-weight: bold;
        }

        .theme-option-name {
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .theme-option-preview {
            width: 100%;
            height: 40px;
            border-radius: 2px;
            border: 1px solid var(--vscode-widget-border);
        }

        .info-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .error-message {
            padding: 8px 12px;
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 12px;
        }

        .success-message {
            padding: 8px 12px;
            background-color: var(--vscode-inputValidation-successBackground);
            color: var(--vscode-inputValidation-successForeground);
            border: 1px solid var(--vscode-inputValidation-successBorder);
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 12px;
        }

        .divider {
            height: 1px;
            background-color: var(--vscode-widget-border);
            margin: 20px 0;
        }

        .loading {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-top-color: var(--vscode-textLink-foreground);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 MirrorCanvas Settings</h1>

        <!-- Theme Selection -->
        <div class="section">
            <h2>Theme Selection</h2>
            <div class="setting-group">
                <label for="themeSelect">Current Theme:</label>
                <select id="themeSelect">
                    <option value="">Loading themes...</option>
                </select>
                <p class="info-text">Choose a theme to transform your workspace atmosphere</p>
            </div>

            <div class="theme-preview" id="themePreview"></div>

            <div class="button-group">
                <button class="secondary" id="importThemeBtn">Import Theme</button>
                <button class="secondary" id="exportThemeBtn">Export Theme</button>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Visual Effects -->
        <div class="section">
            <h2>Visual Effects</h2>

            <div class="setting-group">
                <div class="label-with-value">
                    <label for="animationIntensity">Animation Intensity</label>
                    <span class="value-display" id="animationIntensityValue">0.8</span>
                </div>
                <input type="range" id="animationIntensity" min="0" max="1" step="0.1" value="0.8">
                <p class="info-text">Control the intensity of visual animations and effects</p>
            </div>

            <div class="setting-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="particlesEnabled" checked>
                    <label for="particlesEnabled">Enable Particle Effects</label>
                </div>
                <p class="info-text">Atmospheric particles like fog, fireflies, and dust</p>
            </div>

            <div class="setting-group">
                <div class="label-with-value">
                    <label for="particleDensity">Particle Density</label>
                    <span class="value-display" id="particleDensityValue">50</span>
                </div>
                <input type="range" id="particleDensity" min="0" max="100" step="10" value="50">
                <p class="info-text">Adjust the number of particles in the atmosphere</p>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Audio Settings -->
        <div class="section">
            <h2>Audio</h2>

            <div class="setting-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="audioEnabled" checked>
                    <label for="audioEnabled">Enable Audio</label>
                </div>
                <p class="info-text">Ambient sounds and audio effects</p>
            </div>

            <div class="setting-group">
                <div class="label-with-value">
                    <label for="audioVolume">Volume</label>
                    <span class="value-display" id="audioVolumeValue">30%</span>
                </div>
                <input type="range" id="audioVolume" min="0" max="1" step="0.05" value="0.3">
                <p class="info-text">Master volume for all audio effects</p>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Emotion & Behavior -->
        <div class="section">
            <h2>Emotion & Behavior</h2>

            <div class="setting-group">
                <div class="label-with-value">
                    <label for="emotionSensitivity">Emotion Sensitivity</label>
                    <span class="value-display" id="emotionSensitivityValue">0.7</span>
                </div>
                <input type="range" id="emotionSensitivity" min="0.1" max="1" step="0.1" value="0.7">
                <p class="info-text">How responsive the system is to your emotional state</p>
            </div>

            <div class="setting-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="personasEnabled" checked>
                    <label for="personasEnabled">Enable Specter Personas</label>
                </div>
                <p class="info-text">AI companions that provide contextual suggestions</p>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Performance -->
        <div class="section">
            <h2>Performance</h2>

            <div class="setting-group">
                <label for="performanceMode">Performance Mode:</label>
                <select id="performanceMode">
                    <option value="high-quality">High Quality</option>
                    <option value="balanced" selected>Balanced</option>
                    <option value="performance">Performance</option>
                    <option value="minimal">Minimal</option>
                </select>
                <p class="info-text">Balance between visual quality and system performance</p>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Actions -->
        <div class="section">
            <div class="button-group">
                <button id="resetBtn" class="secondary">Reset to Defaults</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Elements
        const themeSelect = document.getElementById('themeSelect');
        const animationIntensity = document.getElementById('animationIntensity');
        const animationIntensityValue = document.getElementById('animationIntensityValue');
        const emotionSensitivity = document.getElementById('emotionSensitivity');
        const emotionSensitivityValue = document.getElementById('emotionSensitivityValue');
        const audioVolume = document.getElementById('audioVolume');
        const audioVolumeValue = document.getElementById('audioVolumeValue');
        const particleDensity = document.getElementById('particleDensity');
        const particleDensityValue = document.getElementById('particleDensityValue');
        const audioEnabled = document.getElementById('audioEnabled');
        const particlesEnabled = document.getElementById('particlesEnabled');
        const personasEnabled = document.getElementById('personasEnabled');
        const performanceMode = document.getElementById('performanceMode');
        const importThemeBtn = document.getElementById('importThemeBtn');
        const exportThemeBtn = document.getElementById('exportThemeBtn');
        const resetBtn = document.getElementById('resetBtn');

        // Request initial config
        vscode.postMessage({ command: 'getConfig' });

        // Handle slider updates
        animationIntensity.addEventListener('input', (e) => {
            animationIntensityValue.textContent = e.target.value;
            vscode.postMessage({ command: 'updateAnimationIntensity', value: parseFloat(e.target.value) });
        });

        emotionSensitivity.addEventListener('input', (e) => {
            emotionSensitivityValue.textContent = e.target.value;
            vscode.postMessage({ command: 'updateEmotionSensitivity', value: parseFloat(e.target.value) });
        });

        audioVolume.addEventListener('input', (e) => {
            const percentage = Math.round(parseFloat(e.target.value) * 100);
            audioVolumeValue.textContent = percentage + '%';
            vscode.postMessage({ command: 'updateAudioVolume', value: parseFloat(e.target.value) });
        });

        particleDensity.addEventListener('input', (e) => {
            particleDensityValue.textContent = e.target.value;
            vscode.postMessage({ command: 'updateParticleDensity', value: parseInt(e.target.value) });
        });

        // Handle checkboxes
        audioEnabled.addEventListener('change', (e) => {
            vscode.postMessage({ command: 'toggleAudio', enabled: e.target.checked });
        });

        particlesEnabled.addEventListener('change', (e) => {
            vscode.postMessage({ command: 'toggleParticles', enabled: e.target.checked });
        });

        personasEnabled.addEventListener('change', (e) => {
            vscode.postMessage({ command: 'togglePersonas', enabled: e.target.checked });
        });

        // Handle selects
        themeSelect.addEventListener('change', (e) => {
            vscode.postMessage({ command: 'updateTheme', theme: e.target.value });
        });

        performanceMode.addEventListener('change', (e) => {
            vscode.postMessage({ command: 'updatePerformanceMode', mode: e.target.value });
        });

        // Handle buttons
        importThemeBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'importTheme' });
        });

        exportThemeBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'exportTheme' });
        });

        resetBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'resetToDefaults' });
        });

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;

            if (message.command === 'configUpdate') {
                updateUI(message.config, message.availableThemes);
            } else if (message.command === 'validationResult') {
                handleValidationResult(message);
            }
        });

        function updateUI(config, availableThemes) {
            // Update theme select
            if (availableThemes) {
                themeSelect.innerHTML = '';
                availableThemes.forEach(theme => {
                    const option = document.createElement('option');
                    option.value = theme.id;
                    option.textContent = theme.name + (theme.isCustom ? ' (Custom)' : '');
                    themeSelect.appendChild(option);
                });
            }

            // Update current values
            themeSelect.value = config.theme || '';
            animationIntensity.value = config.animationIntensity || 0.8;
            animationIntensityValue.textContent = (config.animationIntensity || 0.8).toFixed(1);
            emotionSensitivity.value = config.emotionSensitivity || 0.7;
            emotionSensitivityValue.textContent = (config.emotionSensitivity || 0.7).toFixed(1);
            audioVolume.value = config.audioVolume || 0.3;
            audioVolumeValue.textContent = Math.round((config.audioVolume || 0.3) * 100) + '%';
            particleDensity.value = config.particleDensity || 50;
            particleDensityValue.textContent = config.particleDensity || 50;
            audioEnabled.checked = config.audioEnabled !== false;
            particlesEnabled.checked = config.particlesEnabled !== false;
            personasEnabled.checked = config.personasEnabled !== false;
            performanceMode.value = config.performanceMode || 'balanced';
        }

        function handleValidationResult(message) {
            if (message.isValid) {
                console.log('Theme is valid');
            } else {
                console.error('Theme validation errors:', message.errors);
            }
        }
    </script>
</body>
</html>`;
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
