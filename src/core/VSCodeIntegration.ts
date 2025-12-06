import * as vscode from 'vscode';
import { EmotionalState } from '../models/EmotionalModels';

/**
 * Handles all VS Code API integration points including command palette,
 * status bar, and keyboard shortcuts
 */
export class VSCodeIntegration {
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];
    private currentEmotionalState: EmotionalState | null = null;

    constructor() {
        // Create status bar item for emotional state display
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'mirrorCanvas.showEmotionalJourney';
        this.statusBarItem.tooltip = 'Click to view your emotional journey';
        this.disposables.push(this.statusBarItem);
    }

    /**
     * Initialize VS Code integration
     */
    public initialize(): void {
        this.showStatusBar();
    }

    /**
     * Update the status bar with current emotional state
     */
    public updateEmotionalStateDisplay(emotionalState: EmotionalState): void {
        this.currentEmotionalState = emotionalState;
        
        const emotionEmoji = this.getEmotionEmoji(emotionalState.primary);
        const intensityBar = this.getIntensityBar(emotionalState.intensity);
        
        this.statusBarItem.text = `${emotionEmoji} ${emotionalState.primary} ${intensityBar}`;
        this.statusBarItem.show();
    }

    /**
     * Show the status bar item
     */
    public showStatusBar(): void {
        this.statusBarItem.text = '$(smiley) MirrorCanvas Ready';
        this.statusBarItem.show();
    }

    /**
     * Hide the status bar item
     */
    public hideStatusBar(): void {
        this.statusBarItem.hide();
    }

    /**
     * Get emoji representation for emotion type
     */
    private getEmotionEmoji(emotion: string): string {
        const emojiMap: Record<string, string> = {
            'calm': '😌',
            'tense': '😰',
            'curious': '🤔',
            'excited': '🤩',
            'frustrated': '😤',
            'neutral': '😐'
        };
        return emojiMap[emotion.toLowerCase()] || '😐';
    }

    /**
     * Get visual intensity bar representation
     */
    private getIntensityBar(intensity: number): string {
        const filledBlocks = Math.round(intensity * 5);
        const emptyBlocks = 5 - filledBlocks;
        return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    }

    /**
     * Register keyboard shortcuts for quick theme switching
     */
    public registerKeyboardShortcuts(
        onThemeSwitch: (themeName: string) => Promise<void>
    ): void {
        // Ctrl+Shift+T (Cmd+Shift+T on Mac) - Switch theme
        const switchThemeCommand = vscode.commands.registerCommand(
            'mirrorCanvas.switchThemeQuick',
            async () => {
                const themes = [
                    { label: '🎃 Halloween', value: 'halloween' },
                    { label: '🌧️ Rainy Forest', value: 'rainy-forest' },
                    { label: '☕ Café', value: 'cafe' },
                    { label: '🕳️ Cave', value: 'cave' },
                    { label: '🌃 Neon City', value: 'neon-city' }
                ];

                const selected = await vscode.window.showQuickPick(themes, {
                    placeHolder: 'Select a theme...'
                });

                if (selected) {
                    await onThemeSwitch(selected.value);
                }
            }
        );

        this.disposables.push(switchThemeCommand);
    }

    /**
     * Show notification with emotional context
     */
    public showNotification(
        message: string,
        type: 'info' | 'warning' | 'error' = 'info'
    ): void {
        switch (type) {
            case 'error':
                vscode.window.showErrorMessage(message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(message);
                break;
            case 'info':
            default:
                vscode.window.showInformationMessage(message);
                break;
        }
    }

    /**
     * Show quick pick for command selection
     */
    public async showCommandPalette(
        commands: Array<{ label: string; description?: string; value: string }>
    ): Promise<string | undefined> {
        const selected = await vscode.window.showQuickPick(commands, {
            placeHolder: 'Select a MirrorCanvas command...',
            matchOnDescription: true
        });

        return selected?.value;
    }

    /**
     * Dispose of all VS Code integration resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }

    /**
     * Get current emotional state
     */
    public getCurrentEmotionalState(): EmotionalState | null {
        return this.currentEmotionalState;
    }
}
