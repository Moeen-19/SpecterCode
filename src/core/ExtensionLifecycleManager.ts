import * as vscode from 'vscode';

/**
 * Manages extension lifecycle including activation, deactivation,
 * resource cleanup, and migration handling
 */
export class ExtensionLifecycleManager {
    private context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];
    private isInitialized: boolean = false;
    private resourceCleanupHandlers: Array<() => Promise<void>> = [];
    private stateVersion: string = '1.0.0';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Initialize lifecycle management
     */
    public initialize(): void {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing extension lifecycle management...');

        // Register workspace change listeners
        this.registerWorkspaceListeners();

        // Check for extension updates and run migrations
        this.checkForUpdates();

        // Setup graceful shutdown
        this.setupGracefulShutdown();

        this.isInitialized = true;
        console.log('Extension lifecycle management initialized');
    }

    /**
     * Register handlers for workspace changes
     */
    private registerWorkspaceListeners(): void {
        // Listen for configuration changes
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(
            (event) => this.handleConfigurationChange(event)
        );

        this.disposables.push(configChangeListener);

        // Listen for workspace folder changes (if available)
        if (vscode.workspace.onDidChangeWorkspaceFolders) {
            const folderChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
                (event) => this.handleWorkspaceFolderChange(event)
            );
            this.disposables.push(folderChangeListener);
        }
    }

    /**
     * Handle configuration changes
     */
    private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('mirrorCanvas')) {
            console.log('MirrorCanvas configuration changed');
            // Configuration changes will be handled by individual components
        }
    }

    /**
     * Handle workspace folder changes
     */
    private handleWorkspaceFolderChange(
        event: vscode.WorkspaceFoldersChangeEvent
    ): void {
        if (event.added.length > 0) {
            console.log(`Workspace folders added: ${event.added.length}`);
        }
        if (event.removed.length > 0) {
            console.log(`Workspace folders removed: ${event.removed.length}`);
        }
    }

    /**
     * Check for extension updates and run migrations
     */
    private checkForUpdates(): void {
        const storedVersion = this.context.globalState.get<string>('extensionVersion');
        const currentVersion = this.getExtensionVersion();

        if (!storedVersion) {
            console.log('First time activation - running initial setup');
            this.runInitialSetup();
        } else if (storedVersion !== currentVersion) {
            console.log(`Extension updated from ${storedVersion} to ${currentVersion}`);
            this.runMigrations(storedVersion, currentVersion);
        }

        // Update stored version
        this.context.globalState.update('extensionVersion', currentVersion);
    }

    /**
     * Get current extension version
     */
    private getExtensionVersion(): string {
        const extension = vscode.extensions.getExtension('MoeenGulammohammadShaikh.mirror-canvas');
        return extension?.packageJSON.version || this.stateVersion;
    }

    /**
     * Run initial setup for first-time activation
     */
    private runInitialSetup(): void {
        console.log('Running initial setup...');

        // Initialize default configuration
        const config = vscode.workspace.getConfiguration('mirrorCanvas');
        
        // Set default values if not already set
        if (!config.has('enabled')) {
            config.update('enabled', true, vscode.ConfigurationTarget.Global);
        }
        if (!config.has('theme')) {
            config.update('theme', 'halloween', vscode.ConfigurationTarget.Global);
        }

        // Show welcome message
        vscode.window.showInformationMessage(
            'Welcome to MirrorCanvas! Your workspace is now emotionally aware. Use Ctrl+Shift+M to switch themes.',
            'Learn More'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/Moeen-19/mirror-canvas'));
            }
        });
    }

    /**
     * Run migrations for extension updates
     */
    private runMigrations(fromVersion: string, toVersion: string): void {
        console.log(`Running migrations from ${fromVersion} to ${toVersion}`);

        // Parse versions
        const fromParts = fromVersion.split('.').map(Number);
        const toParts = toVersion.split('.').map(Number);

        // Example migration logic
        if (fromParts[0] < toParts[0]) {
            console.log('Major version update - running major migrations');
            this.runMajorMigration();
        }

        if (fromParts[1] < toParts[1]) {
            console.log('Minor version update - running minor migrations');
            this.runMinorMigration();
        }

        vscode.window.showInformationMessage(
            `MirrorCanvas updated to version ${toVersion}. Your settings have been preserved.`
        );
    }

    /**
     * Run major version migrations
     */
    private runMajorMigration(): void {
        // Backup current state
        const currentState = this.context.globalState.get('mirrorCanvasState');
        this.context.globalState.update('mirrorCanvasState.backup', currentState);

        console.log('Major migration completed');
    }

    /**
     * Run minor version migrations
     */
    private runMinorMigration(): void {
        console.log('Minor migration completed');
    }

    /**
     * Setup graceful shutdown
     */
    private setupGracefulShutdown(): void {
        // Register cleanup handlers that will be called on deactivation
        process.on('exit', () => {
            this.performCleanup();
        });
    }

    /**
     * Register a resource cleanup handler
     */
    public registerCleanupHandler(handler: () => Promise<void>): void {
        this.resourceCleanupHandlers.push(handler);
    }

    /**
     * Perform all registered cleanup operations
     */
    public async performCleanup(): Promise<void> {
        console.log('Performing extension cleanup...');

        try {
            // Execute all cleanup handlers
            for (const handler of this.resourceCleanupHandlers) {
                try {
                    await handler();
                } catch (error) {
                    console.error('Error during cleanup:', error);
                }
            }

            // Save final state
            await this.saveFinalState();

            console.log('Extension cleanup completed');
        } catch (error) {
            console.error('Fatal error during cleanup:', error);
        }
    }

    /**
     * Save final state before deactivation
     */
    private async saveFinalState(): Promise<void> {
        try {
            const currentState = {
                timestamp: new Date().toISOString(),
                version: this.getExtensionVersion()
            };

            await this.context.globalState.update('mirrorCanvasState', currentState);
            console.log('Final state saved');
        } catch (error) {
            console.error('Error saving final state:', error);
        }
    }

    /**
     * Get saved state from previous session
     */
    public getSavedState(): any {
        return this.context.globalState.get('mirrorCanvasState');
    }

    /**
     * Dispose of all lifecycle management resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.resourceCleanupHandlers = [];
    }

    /**
     * Check if extension is properly initialized
     */
    public isReady(): boolean {
        return this.isInitialized;
    }
}
