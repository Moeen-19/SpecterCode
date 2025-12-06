/**
 * ActionCapture - Captures all VS Code editor interactions
 * Converts VS Code events into UserAction objects for processing
 */

import * as vscode from 'vscode';
import { UserAction, UserActionType, ActionContext } from '../models/SystemModels';

/**
 * Action capture configuration
 */
export interface ActionCaptureConfig {
    /** Whether to capture typing actions */
    captureTyping?: boolean;
    
    /** Whether to capture file operations */
    captureFileOps?: boolean;
    
    /** Whether to capture diagnostics/errors */
    captureDiagnostics?: boolean;
    
    /** Whether to capture selection changes */
    captureSelection?: boolean;
    
    /** Minimum time between typing actions (ms) */
    typingThrottle?: number;
    
    /** Whether to enable action logging */
    enableLogging?: boolean;
}

/**
 * Action capture statistics
 */
export interface CaptureStatistics {
    totalActionsCaptured: number;
    actionsByType: Map<UserActionType, number>;
    averageTypingSpeed: number;
    lastActionTime: Date | null;
}

/**
 * Action callback function
 */
export type ActionCallback = (action: UserAction) => void | Promise<void>;

/**
 * ActionCapture system for VS Code interactions
 */
export class ActionCapture {
    private disposables: vscode.Disposable[] = [];
    private config: Required<ActionCaptureConfig>;
    private callbacks: ActionCallback[] = [];
    private statistics: CaptureStatistics;
    private lastTypingTime: number = 0;
    private typingBuffer: { time: number; chars: number }[] = [];
    private sessionStartTime: Date;
    private actionCounter: number = 0;
    
    constructor(config: ActionCaptureConfig = {}) {
        this.config = {
            captureTyping: config.captureTyping ?? true,
            captureFileOps: config.captureFileOps ?? true,
            captureDiagnostics: config.captureDiagnostics ?? true,
            captureSelection: config.captureSelection ?? false,
            typingThrottle: config.typingThrottle ?? 500,
            enableLogging: config.enableLogging ?? false
        };
        
        this.statistics = {
            totalActionsCaptured: 0,
            actionsByType: new Map(),
            averageTypingSpeed: 0,
            lastActionTime: null
        };
        
        this.sessionStartTime = new Date();
    }
    
    /**
     * Start capturing actions
     */
    public start(context: vscode.ExtensionContext): void {
        // Capture text document changes (typing)
        if (this.config.captureTyping) {
            this.disposables.push(
                vscode.workspace.onDidChangeTextDocument(e => this.handleTextChange(e))
            );
        }
        
        // Capture file save
        if (this.config.captureFileOps) {
            this.disposables.push(
                vscode.workspace.onDidSaveTextDocument(doc => this.handleFileSave(doc))
            );
            
            this.disposables.push(
                vscode.workspace.onDidOpenTextDocument(doc => this.handleFileOpen(doc))
            );
            
            this.disposables.push(
                vscode.workspace.onDidCloseTextDocument(doc => this.handleFileClose(doc))
            );
        }
        
        // Capture diagnostics (errors/warnings)
        if (this.config.captureDiagnostics) {
            this.disposables.push(
                vscode.languages.onDidChangeDiagnostics(e => this.handleDiagnosticsChange(e))
            );
        }
        
        // Capture selection changes
        if (this.config.captureSelection) {
            this.disposables.push(
                vscode.window.onDidChangeTextEditorSelection(e => this.handleSelectionChange(e))
            );
        }
        
        // Capture active editor changes (tab switching)
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => this.handleEditorChange(editor))
        );
        
        // Add disposables to context
        context.subscriptions.push(...this.disposables);
        
        if (this.config.enableLogging) {
            console.log('[ActionCapture] Started capturing actions');
        }
    }
    
    /**
     * Stop capturing actions
     */
    public stop(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.config.enableLogging) {
            console.log('[ActionCapture] Stopped capturing actions');
        }
    }
    
    /**
     * Register a callback for captured actions
     */
    public onAction(callback: ActionCallback): void {
        this.callbacks.push(callback);
    }
    
    /**
     * Handle text document changes (typing)
     */
    private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
        const now = Date.now();
        
        // Throttle typing events
        if (now - this.lastTypingTime < this.config.typingThrottle) {
            return;
        }
        
        this.lastTypingTime = now;
        
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
            return;
        }
        
        // Calculate typing metrics
        const totalChars = event.contentChanges.reduce((sum, change) => sum + change.text.length, 0);
        this.typingBuffer.push({ time: now, chars: totalChars });
        
        // Keep only last 10 typing events for speed calculation
        if (this.typingBuffer.length > 10) {
            this.typingBuffer.shift();
        }
        
        const typingSpeed = this.calculateTypingSpeed();
        
        const action: UserAction = {
            id: this.generateActionId(),
            type: UserActionType.TYPING,
            timestamp: new Date(),
            context: {
                fileType: this.getFileExtension(event.document.fileName),
                language: event.document.languageId,
                lineNumber: editor.selection.active.line,
                columnNumber: editor.selection.active.character,
                characterCount: totalChars,
                typingSpeed,
                sessionDuration: now - this.sessionStartTime.getTime(),
                filePath: event.document.fileName,
                projectName: this.getProjectName()
            },
            success: true
        };
        
        this.emitAction(action);
    }
    
    /**
     * Handle file save
     */
    private handleFileSave(document: vscode.TextDocument): void {
        const action: UserAction = {
            id: this.generateActionId(),
            type: UserActionType.SAVE,
            timestamp: new Date(),
            context: {
                fileType: this.getFileExtension(document.fileName),
                language: document.languageId,
                filePath: document.fileName,
                projectName: this.getProjectName(),
                sessionDuration: Date.now() - this.sessionStartTime.getTime()
            },
            success: true
        };
        
        this.emitAction(action);
    }
    
    /**
     * Handle file open
     */
    private handleFileOpen(document: vscode.TextDocument): void {
        const action: UserAction = {
            id: this.generateActionId(),
            type: UserActionType.OPEN_FILE,
            timestamp: new Date(),
            context: {
                fileType: this.getFileExtension(document.fileName),
                language: document.languageId,
                filePath: document.fileName,
                projectName: this.getProjectName()
            },
            success: true
        };
        
        this.emitAction(action);
    }
    
    /**
     * Handle file close
     */
    private handleFileClose(document: vscode.TextDocument): void {
        const action: UserAction = {
            id: this.generateActionId(),
            type: UserActionType.CLOSE_FILE,
            timestamp: new Date(),
            context: {
                fileType: this.getFileExtension(document.fileName),
                language: document.languageId,
                filePath: document.fileName,
                projectName: this.getProjectName()
            },
            success: true
        };
        
        this.emitAction(action);
    }
    
    /**
     * Handle diagnostics changes (errors/warnings)
     */
    private handleDiagnosticsChange(event: vscode.DiagnosticChangeEvent): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        // Check if diagnostics changed for active document
        const activeUri = editor.document.uri;
        if (!event.uris.some(uri => uri.toString() === activeUri.toString())) {
            return;
        }
        
        const diagnostics = vscode.languages.getDiagnostics(activeUri);
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        
        if (errors.length > 0) {
            const action: UserAction = {
                id: this.generateActionId(),
                type: UserActionType.ERROR,
                timestamp: new Date(),
                context: {
                    fileType: this.getFileExtension(editor.document.fileName),
                    language: editor.document.languageId,
                    errorCount: errors.length,
                    errorSeverity: 'error',
                    filePath: editor.document.fileName,
                    projectName: this.getProjectName()
                },
                success: false,
                errorMessage: errors[0]?.message
            };
            
            this.emitAction(action);
        }
    }
    
    /**
     * Handle selection changes
     */
    private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        const action: UserAction = {
            id: this.generateActionId(),
            type: UserActionType.SELECT,
            timestamp: new Date(),
            context: {
                fileType: this.getFileExtension(event.textEditor.document.fileName),
                language: event.textEditor.document.languageId,
                lineNumber: event.selections[0]?.active.line,
                columnNumber: event.selections[0]?.active.character,
                filePath: event.textEditor.document.fileName,
                projectName: this.getProjectName()
            },
            success: true
        };
        
        this.emitAction(action);
    }
    
    /**
     * Handle active editor changes (tab switching)
     */
    private handleEditorChange(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            return;
        }
        
        const action: UserAction = {
            id: this.generateActionId(),
            type: UserActionType.SWITCH_TAB,
            timestamp: new Date(),
            context: {
                fileType: this.getFileExtension(editor.document.fileName),
                language: editor.document.languageId,
                filePath: editor.document.fileName,
                projectName: this.getProjectName()
            },
            success: true
        };
        
        this.emitAction(action);
    }
    
    /**
     * Emit an action to all callbacks
     */
    private emitAction(action: UserAction): void {
        // Update statistics
        this.statistics.totalActionsCaptured++;
        const typeCount = this.statistics.actionsByType.get(action.type) ?? 0;
        this.statistics.actionsByType.set(action.type, typeCount + 1);
        this.statistics.lastActionTime = action.timestamp;
        
        if (action.context.typingSpeed) {
            this.statistics.averageTypingSpeed = action.context.typingSpeed;
        }
        
        if (this.config.enableLogging) {
            console.log(`[ActionCapture] Captured ${action.type} action`, action);
        }
        
        // Call all callbacks
        for (const callback of this.callbacks) {
            try {
                callback(action);
            } catch (error) {
                console.error('[ActionCapture] Error in action callback:', error);
            }
        }
    }
    
    /**
     * Calculate typing speed in characters per minute
     */
    private calculateTypingSpeed(): number {
        if (this.typingBuffer.length < 2) {
            return 0;
        }
        
        const first = this.typingBuffer[0];
        const last = this.typingBuffer[this.typingBuffer.length - 1];
        const timeSpan = (last.time - first.time) / 1000 / 60; // minutes
        
        if (timeSpan === 0) {
            return 0;
        }
        
        const totalChars = this.typingBuffer.reduce((sum, entry) => sum + entry.chars, 0);
        return Math.round(totalChars / timeSpan);
    }
    
    /**
     * Get file extension from path
     */
    private getFileExtension(filePath: string): string {
        const parts = filePath.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }
    
    /**
     * Get project name from workspace
     */
    private getProjectName(): string {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        return workspaceFolder?.name ?? 'Unknown';
    }
    
    /**
     * Generate unique action ID
     */
    private generateActionId(): string {
        return `action_${Date.now()}_${++this.actionCounter}`;
    }
    
    /**
     * Get capture statistics
     */
    public getStatistics(): CaptureStatistics {
        return {
            ...this.statistics,
            actionsByType: new Map(this.statistics.actionsByType)
        };
    }
    
    /**
     * Reset statistics
     */
    public resetStatistics(): void {
        this.statistics = {
            totalActionsCaptured: 0,
            actionsByType: new Map(),
            averageTypingSpeed: 0,
            lastActionTime: null
        };
    }
}
