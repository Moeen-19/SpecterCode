/**
 * StatePersistence - Handles state persistence and recovery across extension restarts
 * Implements state validation and consistency checking
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SystemState } from '../models/SystemModels';
import { StateValidationResult } from './StateManager';

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
    /** Storage directory */
    storageDir: string;
    
    /** State file name */
    stateFileName?: string;
    
    /** Whether to enable auto-save */
    autoSave?: boolean;
    
    /** Auto-save interval in ms */
    autoSaveInterval?: number;
    
    /** Whether to enable backup */
    enableBackup?: boolean;
    
    /** Number of backups to keep */
    maxBackups?: number;
    
    /** Whether to enable compression */
    enableCompression?: boolean;
    
    /** Whether to enable encryption */
    enableEncryption?: boolean;
}

/**
 * Persisted state metadata
 */
export interface PersistedStateMetadata {
    /** Version of the state format */
    version: string;
    
    /** Timestamp when state was saved */
    savedAt: Date;
    
    /** Extension version */
    extensionVersion: string;
    
    /** Checksum for validation */
    checksum: string;
    
    /** Whether state is compressed */
    compressed: boolean;
    
    /** Whether state is encrypted */
    encrypted: boolean;
}

/**
 * Persisted state wrapper
 */
export interface PersistedState {
    /** Metadata */
    metadata: PersistedStateMetadata;
    
    /** Actual state data */
    state: SystemState;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
    /** Whether recovery was successful */
    success: boolean;
    
    /** Recovered state (if successful) */
    state?: SystemState;
    
    /** Error message (if failed) */
    error?: string;
    
    /** Validation result */
    validation?: StateValidationResult;
    
    /** Whether state was migrated */
    migrated: boolean;
}

/**
 * StatePersistence for saving and loading state
 */
export class StatePersistence {
    private config: Required<PersistenceConfig>;
    private autoSaveTimer: NodeJS.Timeout | null = null;
    private stateFilePath: string;
    private backupDir: string;
    
    constructor(config: PersistenceConfig) {
        this.config = {
            storageDir: config.storageDir,
            stateFileName: config.stateFileName ?? 'system-state.json',
            autoSave: config.autoSave ?? true,
            autoSaveInterval: config.autoSaveInterval ?? 30000,
            enableBackup: config.enableBackup ?? true,
            maxBackups: config.maxBackups ?? 5,
            enableCompression: config.enableCompression ?? false,
            enableEncryption: config.enableEncryption ?? false
        };
        
        // Ensure storage directory exists
        if (!fs.existsSync(this.config.storageDir)) {
            fs.mkdirSync(this.config.storageDir, { recursive: true });
        }
        
        this.stateFilePath = path.join(this.config.storageDir, this.config.stateFileName);
        this.backupDir = path.join(this.config.storageDir, 'backups');
        
        if (this.config.enableBackup && !fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    
    /**
     * Save state to disk
     */
    public async saveState(state: SystemState): Promise<void> {
        try {
            // Create backup if enabled
            if (this.config.enableBackup && fs.existsSync(this.stateFilePath)) {
                await this.createBackup();
            }
            
            // Create persisted state wrapper
            const persistedState: PersistedState = {
                metadata: {
                    version: '1.0.0',
                    savedAt: new Date(),
                    extensionVersion: this.getExtensionVersion(),
                    checksum: this.calculateChecksum(state),
                    compressed: this.config.enableCompression,
                    encrypted: this.config.enableEncryption
                },
                state
            };
            
            // Serialize state
            let data = JSON.stringify(persistedState, null, 2);
            
            // Compress if enabled
            if (this.config.enableCompression) {
                data = this.compress(data);
            }
            
            // Encrypt if enabled
            if (this.config.enableEncryption) {
                data = this.encrypt(data);
            }
            
            // Write to file
            fs.writeFileSync(this.stateFilePath, data, 'utf8');
            
            console.log('[StatePersistence] State saved successfully');
        } catch (error) {
            console.error('[StatePersistence] Failed to save state:', error);
            throw error;
        }
    }
    
    /**
     * Load state from disk
     */
    public async loadState(): Promise<RecoveryResult> {
        try {
            // Check if state file exists
            if (!fs.existsSync(this.stateFilePath)) {
                return {
                    success: false,
                    error: 'No saved state found',
                    migrated: false
                };
            }
            
            // Read file
            let data = fs.readFileSync(this.stateFilePath, 'utf8');
            
            // Decrypt if needed
            if (this.config.enableEncryption) {
                try {
                    data = this.decrypt(data);
                } catch (error) {
                    return {
                        success: false,
                        error: 'Failed to decrypt state',
                        migrated: false
                    };
                }
            }
            
            // Decompress if needed
            if (this.config.enableCompression) {
                try {
                    data = this.decompress(data);
                } catch (error) {
                    return {
                        success: false,
                        error: 'Failed to decompress state',
                        migrated: false
                    };
                }
            }
            
            // Parse JSON
            const persistedState: PersistedState = JSON.parse(data);
            
            // Validate checksum
            const calculatedChecksum = this.calculateChecksum(persistedState.state);
            if (calculatedChecksum !== persistedState.metadata.checksum) {
                console.warn('[StatePersistence] Checksum mismatch, state may be corrupted');
            }
            
            // Migrate if needed
            let state = persistedState.state;
            let migrated = false;
            
            if (persistedState.metadata.version !== '1.0.0') {
                state = this.migrateState(persistedState);
                migrated = true;
            }
            
            // Validate state
            const validation = this.validateState(state);
            
            if (!validation.valid) {
                return {
                    success: false,
                    error: `State validation failed: ${validation.errors.join(', ')}`,
                    validation,
                    migrated
                };
            }
            
            console.log('[StatePersistence] State loaded successfully');
            
            return {
                success: true,
                state,
                validation,
                migrated
            };
        } catch (error) {
            console.error('[StatePersistence] Failed to load state:', error);
            return {
                success: false,
                error: `Failed to load state: ${(error as Error).message}`,
                migrated: false
            };
        }
    }
    
    /**
     * Create a backup of the current state file
     */
    private async createBackup(): Promise<void> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `state-backup-${timestamp}.json`);
            
            fs.copyFileSync(this.stateFilePath, backupPath);
            
            // Clean up old backups
            await this.cleanupOldBackups();
            
            console.log('[StatePersistence] Backup created:', backupPath);
        } catch (error) {
            console.error('[StatePersistence] Failed to create backup:', error);
        }
    }
    
    /**
     * Clean up old backups
     */
    private async cleanupOldBackups(): Promise<void> {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('state-backup-'))
                .map(f => ({
                    name: f,
                    path: path.join(this.backupDir, f),
                    time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);
            
            // Remove old backups
            if (files.length > this.config.maxBackups) {
                const toRemove = files.slice(this.config.maxBackups);
                for (const file of toRemove) {
                    fs.unlinkSync(file.path);
                }
            }
        } catch (error) {
            console.error('[StatePersistence] Failed to cleanup backups:', error);
        }
    }
    
    /**
     * Restore from a backup
     */
    public async restoreFromBackup(backupName?: string): Promise<RecoveryResult> {
        try {
            let backupPath: string;
            
            if (backupName) {
                backupPath = path.join(this.backupDir, backupName);
            } else {
                // Get most recent backup
                const files = fs.readdirSync(this.backupDir)
                    .filter(f => f.startsWith('state-backup-'))
                    .map(f => ({
                        name: f,
                        path: path.join(this.backupDir, f),
                        time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
                    }))
                    .sort((a, b) => b.time - a.time);
                
                if (files.length === 0) {
                    return {
                        success: false,
                        error: 'No backups found',
                        migrated: false
                    };
                }
                
                backupPath = files[0].path;
            }
            
            // Copy backup to main state file
            fs.copyFileSync(backupPath, this.stateFilePath);
            
            // Load the restored state
            return await this.loadState();
        } catch (error) {
            return {
                success: false,
                error: `Failed to restore backup: ${(error as Error).message}`,
                migrated: false
            };
        }
    }
    
    /**
     * Start auto-save
     */
    public startAutoSave(getState: () => SystemState): void {
        if (!this.config.autoSave) {
            return;
        }
        
        this.stopAutoSave();
        
        this.autoSaveTimer = setInterval(async () => {
            try {
                const state = getState();
                await this.saveState(state);
            } catch (error) {
                console.error('[StatePersistence] Auto-save failed:', error);
            }
        }, this.config.autoSaveInterval);
        
        console.log('[StatePersistence] Auto-save started');
    }
    
    /**
     * Stop auto-save
     */
    public stopAutoSave(): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('[StatePersistence] Auto-save stopped');
        }
    }
    
    /**
     * Calculate checksum for state
     */
    private calculateChecksum(state: SystemState): string {
        const data = JSON.stringify(state);
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    
    /**
     * Validate state structure
     */
    private validateState(state: SystemState): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Basic structure validation
        if (!state.currentEmotion) {
            errors.push('Missing currentEmotion');
        }
        if (!state.activeTheme) {
            errors.push('Missing activeTheme');
        }
        if (!state.userPreferences) {
            errors.push('Missing userPreferences');
        }
        if (!state.components) {
            errors.push('Missing components');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Migrate state from old version
     */
    private migrateState(persistedState: PersistedState): SystemState {
        // Implement migration logic here
        console.log('[StatePersistence] Migrating state from version', persistedState.metadata.version);
        return persistedState.state;
    }
    
    /**
     * Get extension version
     */
    private getExtensionVersion(): string {
        return '0.1.0'; // Should be read from package.json
    }
    
    /**
     * Compress data (placeholder)
     */
    private compress(data: string): string {
        // Implement compression if needed
        return data;
    }
    
    /**
     * Decompress data (placeholder)
     */
    private decompress(data: string): string {
        // Implement decompression if needed
        return data;
    }
    
    /**
     * Encrypt data (placeholder)
     */
    private encrypt(data: string): string {
        // Implement encryption if needed
        return data;
    }
    
    /**
     * Decrypt data (placeholder)
     */
    private decrypt(data: string): string {
        // Implement decryption if needed
        return data;
    }
    
    /**
     * List available backups
     */
    public listBackups(): Array<{ name: string; date: Date; size: number }> {
        try {
            return fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('state-backup-'))
                .map(f => {
                    const filePath = path.join(this.backupDir, f);
                    const stats = fs.statSync(filePath);
                    return {
                        name: f,
                        date: stats.mtime,
                        size: stats.size
                    };
                })
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        } catch (error) {
            console.error('[StatePersistence] Failed to list backups:', error);
            return [];
        }
    }
    
    /**
     * Delete state file
     */
    public deleteState(): void {
        if (fs.existsSync(this.stateFilePath)) {
            fs.unlinkSync(this.stateFilePath);
            console.log('[StatePersistence] State file deleted');
        }
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stopAutoSave();
    }
}
