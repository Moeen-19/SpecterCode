import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { SettingsPanel } from '../config/SettingsPanel';
import { VSCodeIntegration } from './VSCodeIntegration';
import { ExtensionLifecycleManager } from './ExtensionLifecycleManager';
import { ResourceManager } from './ResourceManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { DiagnosticTool } from './DiagnosticTool';

/**
 * Main extension class that coordinates all MirrorCanvas components
 */
export class MirrorCanvasExtension {
    private context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];
    private isActive: boolean = false;
    private configManager: ConfigurationManager | undefined;
    private settingsPanel: SettingsPanel | undefined;
    private vsCodeIntegration: VSCodeIntegration | undefined;
    private lifecycleManager: ExtensionLifecycleManager | undefined;
    private resourceManager: ResourceManager | undefined;
    private performanceMonitor: PerformanceMonitor | undefined;
    private diagnosticTool: DiagnosticTool | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Activate the MirrorCanvas extension
     */
    public activate(): void {
        if (this.isActive) {
            return;
        }

        console.log('Initializing MirrorCanvas components...');

        // Initialize Performance Monitor
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceMonitor.startMonitoring();

        // Initialize Diagnostic Tool
        this.diagnosticTool = new DiagnosticTool(this.performanceMonitor);

        // Initialize Resource Manager
        this.resourceManager = new ResourceManager();
        this.resourceManager.startMemoryMonitoring();

        // Initialize Lifecycle Manager
        this.lifecycleManager = new ExtensionLifecycleManager(this.context);
        this.lifecycleManager.initialize();

        // Register cleanup handler
        if (this.lifecycleManager) {
            this.lifecycleManager.registerCleanupHandler(async () => {
                if (this.resourceManager) {
                    this.resourceManager.dispose();
                }
                if (this.performanceMonitor) {
                    this.performanceMonitor.dispose();
                }
                if (this.diagnosticTool) {
                    this.diagnosticTool.dispose();
                }
            });
        }

        // Initialize Configuration Manager
        this.configManager = new ConfigurationManager(this.context);

        // Initialize Settings Panel
        this.settingsPanel = new SettingsPanel(this.context, this.configManager);

        // Initialize VS Code Integration
        this.vsCodeIntegration = new VSCodeIntegration();
        this.vsCodeIntegration.initialize();

        // Register commands
        this.registerCommands();

        // Initialize core components (will be implemented in later tasks)
        // TODO: Initialize Emotion Engine
        // TODO: Initialize Vibe Coding Layer
        // TODO: Initialize Memory Canvas
        // TODO: Initialize Specter Personas
        // TODO: Initialize MCP Orchestrator

        this.isActive = true;
        console.log('MirrorCanvas extension fully activated');
    }

    /**
     * Deactivate the extension and clean up resources
     */
    public async deactivate(): Promise<void> {
        if (!this.isActive) {
            return;
        }

        console.log('Deactivating MirrorCanvas extension...');

        // Perform lifecycle cleanup
        if (this.lifecycleManager) {
            await this.lifecycleManager.performCleanup();
        }

        // Dispose of all registered disposables
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];

        // Cleanup VS Code Integration
        if (this.vsCodeIntegration) {
            this.vsCodeIntegration.dispose();
            this.vsCodeIntegration = undefined;
        }

        // Cleanup components
        if (this.settingsPanel) {
            this.settingsPanel.dispose();
            this.settingsPanel = undefined;
        }

        if (this.configManager) {
            this.configManager.dispose();
            this.configManager = undefined;
        }

        // Cleanup diagnostic tool
        if (this.diagnosticTool) {
            this.diagnosticTool.dispose();
            this.diagnosticTool = undefined;
        }

        // Cleanup performance monitor
        if (this.performanceMonitor) {
            this.performanceMonitor.dispose();
            this.performanceMonitor = undefined;
        }

        // Cleanup lifecycle manager
        if (this.lifecycleManager) {
            this.lifecycleManager.dispose();
            this.lifecycleManager = undefined;
        }

        // Cleanup resource manager
        if (this.resourceManager) {
            this.resourceManager.dispose();
            this.resourceManager = undefined;
        }

        // TODO: Cleanup core components
        // TODO: Stop all animations and audio

        this.isActive = false;
        console.log('MirrorCanvas extension deactivated');
    }

    /**
     * Register VS Code commands for MirrorCanvas
     */
    private registerCommands(): void {
        // Activate command
        const activateCommand = vscode.commands.registerCommand('mirrorCanvas.activate', () => {
            this.handleActivateCommand();
        });

        // Deactivate command
        const deactivateCommand = vscode.commands.registerCommand('mirrorCanvas.deactivate', () => {
            this.handleDeactivateCommand();
        });

        // Switch theme command
        const switchThemeCommand = vscode.commands.registerCommand('mirrorCanvas.switchTheme', () => {
            this.handleSwitchThemeCommand();
        });

        // Quick theme switch command
        const switchThemeQuickCommand = vscode.commands.registerCommand('mirrorCanvas.switchThemeQuick', () => {
            this.handleSwitchThemeCommand();
        });

        // Show settings command
        const showSettingsCommand = vscode.commands.registerCommand('mirrorCanvas.showSettings', () => {
            this.handleShowSettingsCommand();
        });

        // Show emotional journey command
        const showEmotionalJourneyCommand = vscode.commands.registerCommand('mirrorCanvas.showEmotionalJourney', () => {
            this.handleShowEmotionalJourneyCommand();
        });

        // Show diagnostics command
        const showDiagnosticsCommand = vscode.commands.registerCommand('mirrorCanvas.showDiagnostics', async () => {
            await this.handleShowDiagnosticsCommand();
        });

        // Show performance report command
        const showPerformanceCommand = vscode.commands.registerCommand('mirrorCanvas.showPerformance', () => {
            this.handleShowPerformanceCommand();
        });

        // Add all commands to disposables
        this.disposables.push(
            activateCommand,
            deactivateCommand,
            switchThemeCommand,
            switchThemeQuickCommand,
            showSettingsCommand,
            showEmotionalJourneyCommand,
            showDiagnosticsCommand,
            showPerformanceCommand
        );

        // Add to extension context
        this.context.subscriptions.push(...this.disposables);

        // Register keyboard shortcuts with VSCodeIntegration
        if (this.vsCodeIntegration) {
            this.vsCodeIntegration.registerKeyboardShortcuts(
                async (themeName: string) => {
                    const config = vscode.workspace.getConfiguration('mirrorCanvas');
                    await config.update('theme', themeName, vscode.ConfigurationTarget.Global);
                    this.vsCodeIntegration?.showNotification(`Switched to ${themeName} theme`);
                }
            );
        }
    }

    private handleActivateCommand(): void {
        if (this.isActive) {
            vscode.window.showInformationMessage('MirrorCanvas is already active');
            return;
        }

        this.activate();
        vscode.window.showInformationMessage('MirrorCanvas activated - Your workspace is now alive!');
    }

    private handleDeactivateCommand(): void {
        if (!this.isActive) {
            vscode.window.showInformationMessage('MirrorCanvas is not active');
            return;
        }

        this.deactivate();
        vscode.window.showInformationMessage('MirrorCanvas deactivated');
    }

    private async handleSwitchThemeCommand(): Promise<void> {
        const themes = [
            { label: 'Halloween', value: 'halloween', description: 'Spooky ambient experience with fog and spectral effects' },
            { label: 'Rainy Forest', value: 'rainy-forest', description: 'Peaceful nature sounds with green palette' },
            { label: 'Café', value: 'cafe', description: 'Warm coffee shop ambiance with jazz undertones' },
            { label: 'Cave', value: 'cave', description: 'Mysterious bioluminescent cave environment' },
            { label: 'Neon City', value: 'neon-city', description: 'Cyberpunk synthwave aesthetics' }
        ];

        const selected = await vscode.window.showQuickPick(themes, {
            placeHolder: 'Select a MirrorCanvas theme',
            matchOnDescription: true
        });

        if (selected) {
            // TODO: Implement theme switching logic
            const config = vscode.workspace.getConfiguration('mirrorCanvas');
            await config.update('theme', selected.value, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Switched to ${selected.label} theme`);
        }
    }

    private handleShowSettingsCommand(): void {
        if (!this.settingsPanel) {
            vscode.window.showErrorMessage('Settings panel is not available');
            return;
        }

        this.settingsPanel.show();
    }

    private handleShowEmotionalJourneyCommand(): void {
        // TODO: Implement emotional journey visualization
        vscode.window.showInformationMessage('Emotional journey visualization will be implemented in a later task');
    }

    private async handleShowDiagnosticsCommand(): Promise<void> {
        if (!this.diagnosticTool) {
            vscode.window.showErrorMessage('Diagnostic tool is not available');
            return;
        }

        await this.diagnosticTool.showDiagnosticsInOutput();
    }

    private handleShowPerformanceCommand(): void {
        if (!this.performanceMonitor) {
            vscode.window.showErrorMessage('Performance monitor is not available');
            return;
        }

        const report = this.performanceMonitor.getPerformanceReport();
        const diagnostics = this.performanceMonitor.getDiagnostics();

        let message = `Performance Report\n\n`;
        message += `Overall Health: ${diagnostics.overallHealth}\n\n`;
        message += `Metrics:\n`;

        Object.entries(report.metrics).forEach(([name, metric]) => {
            message += `  ${name}: ${metric.average?.toFixed(2)} ${metric.unit} (avg)\n`;
        });

        if (diagnostics.recommendations.length > 0) {
            message += `\nRecommendations:\n`;
            diagnostics.recommendations.forEach(rec => {
                message += `  - ${rec}\n`;
            });
        }

        vscode.window.showInformationMessage(message);
    }
}