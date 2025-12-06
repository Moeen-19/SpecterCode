/**
 * Preference Persistence for MirrorCanvas
 * Handles configuration backup, restore, and migration across extension versions
 */

import * as vscode from 'vscode';
import { UserConfig, PerformanceMode } from '../models/SystemModels';
import { ThemePreset } from '../models/ThemeModels';

/**
 * Backup metadata
 */
export interface BackupMetadata {
    /** Backup timestamp */
    timestamp: Date;
    
    /** Extension version when backup was created */
    extensionVersion: string;
    
    /** Backup description */
    description?: string;
    
    /** Backup ID for identification */
    id: string;
}

/**
 * Backup data structure
 */
export interface BackupData {
    /** Backup metadata */
    metadata: BackupMetadata;
    
    /** User configuration data */
    config: UserConfig;
    
    /** Custom themes data */
    customThemes: Record<string, any>;
    
    /** Shortcuts data */
    shortcuts: Record<string, string>;
}

/**
 * Migration result
 */
export interface MigrationResult {
    /** Whether migration was successful */
    success: boolean;
    
    /** Migration messages */
    messages: string[];
    
    /** Migrated configuration */
    config?: UserConfig;
    
    /** Errors if migration failed */
    errors?: string[];
}

/**
 * Preference Persistence Manager
 */
export class PreferencePersistence {
    private context: vscode.ExtensionContext;
    private backups: Map<string, BackupData> = new Map();
    private readonly BACKUP_STORAGE_KEY = 'mirrorCanvas.backups';
    private readonly CONFIG_VERSION_KEY = 'mirrorCanvas.configVersion';
    private readonly CURRENT_VERSION = '0.1.0';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadBackupsFromStorage();
    }

    /**
     * Create a backup of current configuration
     */
    public async createBackup(
        config: UserConfig,
        customThemes: Record<string, any>,
        shortcuts: Record<string, string>,
        description?: string
    ): Promise<BackupData> {
        const backupId = this.generateBackupId();
        const backup: BackupData = {
            metadata: {
                timestamp: new Date(),
                extensionVersion: this.CURRENT_VERSION,
                description,
                id: backupId,
            },
            config,
            customThemes,
            shortcuts,
        };

        this.backups.set(backupId, backup);
        await this.saveBackupsToStorage();

        return backup;
    }

    /**
     * Restore configuration from backup
     */
    public async restoreBackup(backupId: string): Promise<BackupData> {
        const backup = this.backups.get(backupId);
        if (!backup) {
            throw new Error(`Backup "${backupId}" not found`);
        }

        return backup;
    }

    /**
     * List all available backups
     */
    public listBackups(): BackupData[] {
        return Array.from(this.backups.values()).sort(
            (a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
        );
    }

    /**
     * Delete a backup
     */
    public async deleteBackup(backupId: string): Promise<void> {
        if (!this.backups.has(backupId)) {
            throw new Error(`Backup "${backupId}" not found`);
        }

        this.backups.delete(backupId);
        await this.saveBackupsToStorage();
    }

    /**
     * Delete all backups
     */
    public async deleteAllBackups(): Promise<void> {
        this.backups.clear();
        await this.saveBackupsToStorage();
    }

    /**
     * Export backup as JSON
     */
    public exportBackupAsJson(backupId: string): string {
        const backup = this.backups.get(backupId);
        if (!backup) {
            throw new Error(`Backup "${backupId}" not found`);
        }

        return JSON.stringify(backup, null, 2);
    }

    /**
     * Import backup from JSON
     */
    public async importBackupFromJson(backupJson: string): Promise<BackupData> {
        try {
            const backup = JSON.parse(backupJson) as BackupData;

            // Validate backup structure
            if (!backup.metadata || !backup.config) {
                throw new Error('Invalid backup structure');
            }

            // Generate new ID for imported backup
            backup.metadata.id = this.generateBackupId();

            this.backups.set(backup.metadata.id, backup);
            await this.saveBackupsToStorage();

            return backup;
        } catch (error) {
            throw new Error(`Failed to import backup: ${(error as Error).message}`);
        }
    }

    /**
     * Migrate configuration from older version
     */
    public async migrateConfiguration(
        oldConfig: Partial<UserConfig>,
        fromVersion: string
    ): Promise<MigrationResult> {
        const messages: string[] = [];
        const errors: string[] = [];

        try {
            // Create default config
            const migratedConfig: UserConfig = {
                enabled: oldConfig.enabled ?? true,
                theme: oldConfig.theme ?? ThemePreset.HALLOWEEN,
                emotionSensitivity: oldConfig.emotionSensitivity ?? 0.7,
                animationIntensity: oldConfig.animationIntensity ?? 0.8,
                audioEnabled: oldConfig.audioEnabled ?? true,
                audioVolume: oldConfig.audioVolume ?? 0.3,
                particlesEnabled: oldConfig.particlesEnabled ?? true,
                particleDensity: oldConfig.particleDensity ?? 50,
                personasEnabled: oldConfig.personasEnabled ?? true,
                performanceMode: oldConfig.performanceMode ?? PerformanceMode.BALANCED,
                collectHistory: oldConfig.collectHistory ?? true,
                customThemes: oldConfig.customThemes ?? {},
                shortcuts: oldConfig.shortcuts ?? {},
                privacy: oldConfig.privacy ?? {
                    allowEmotionalTracking: true,
                    allowAnalytics: true,
                    allowCrashReports: true,
                    anonymizeData: false,
                },
            };

            // Version-specific migrations
            if (this.compareVersions(fromVersion, '0.1.0') < 0) {
                messages.push('Migrated from pre-0.1.0 version');
                // Add any 0.1.0 specific migrations here
            }

            messages.push(`Successfully migrated from version ${fromVersion} to ${this.CURRENT_VERSION}`);

            return {
                success: true,
                messages,
                config: migratedConfig,
            };
        } catch (error) {
            errors.push((error as Error).message);
            return {
                success: false,
                messages,
                errors,
            };
        }
    }

    /**
     * Auto-migrate on extension startup
     */
    public async autoMigrateIfNeeded(currentConfig: UserConfig): Promise<MigrationResult> {
        const storedVersion = this.context.globalState.get<string>(this.CONFIG_VERSION_KEY);

        if (!storedVersion || this.compareVersions(storedVersion, this.CURRENT_VERSION) < 0) {
            const result = await this.migrateConfiguration(currentConfig, storedVersion || '0.0.0');

            if (result.success) {
                await this.context.globalState.update(this.CONFIG_VERSION_KEY, this.CURRENT_VERSION);
            }

            return result;
        }

        return {
            success: true,
            messages: ['No migration needed'],
        };
    }

    /**
     * Get backup statistics
     */
    public getBackupStatistics(): {
        totalBackups: number;
        oldestBackup?: Date;
        newestBackup?: Date;
        totalSize: number;
    } {
        const backups = Array.from(this.backups.values());

        if (backups.length === 0) {
            return {
                totalBackups: 0,
                totalSize: 0,
            };
        }

        const timestamps = backups.map((b) => new Date(b.metadata.timestamp).getTime());
        const totalSize = backups.reduce((sum, b) => sum + JSON.stringify(b).length, 0);

        return {
            totalBackups: backups.length,
            oldestBackup: new Date(Math.min(...timestamps)),
            newestBackup: new Date(Math.max(...timestamps)),
            totalSize,
        };
    }

    /**
     * Clean up old backups (keep only N most recent)
     */
    public async cleanupOldBackups(keepCount: number = 5): Promise<number> {
        const backups = this.listBackups();
        const toDelete = backups.slice(keepCount);
        let deletedCount = 0;

        for (const backup of toDelete) {
            await this.deleteBackup(backup.metadata.id);
            deletedCount++;
        }

        return deletedCount;
    }

    /**
     * Export all backups as archive
     */
    public exportAllBackupsAsJson(): string {
        const backups = this.listBackups();
        return JSON.stringify(backups, null, 2);
    }

    /**
     * Import all backups from archive
     */
    public async importAllBackupsFromJson(backupsJson: string): Promise<number> {
        try {
            const backups = JSON.parse(backupsJson) as BackupData[];

            if (!Array.isArray(backups)) {
                throw new Error('Invalid backup archive format');
            }

            let importedCount = 0;
            for (const backup of backups) {
                try {
                    backup.metadata.id = this.generateBackupId();
                    this.backups.set(backup.metadata.id, backup);
                    importedCount++;
                } catch (error) {
                    console.warn(`Failed to import backup: ${(error as Error).message}`);
                }
            }

            await this.saveBackupsToStorage();
            return importedCount;
        } catch (error) {
            throw new Error(`Failed to import backup archive: ${(error as Error).message}`);
        }
    }

    /**
     * Load backups from storage
     */
    private loadBackupsFromStorage(): void {
        try {
            const backupsJson = this.context.globalState.get<string>(this.BACKUP_STORAGE_KEY);
            if (backupsJson) {
                const backups = JSON.parse(backupsJson) as BackupData[];
                backups.forEach((backup) => {
                    this.backups.set(backup.metadata.id, backup);
                });
            }
        } catch (error) {
            console.warn(`Failed to load backups from storage: ${(error as Error).message}`);
        }
    }

    /**
     * Save backups to storage
     */
    private async saveBackupsToStorage(): Promise<void> {
        try {
            const backups = Array.from(this.backups.values());
            const backupsJson = JSON.stringify(backups);
            await this.context.globalState.update(this.BACKUP_STORAGE_KEY, backupsJson);
        } catch (error) {
            console.warn(`Failed to save backups to storage: ${(error as Error).message}`);
        }
    }

    /**
     * Generate unique backup ID
     */
    private generateBackupId(): string {
        return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Compare semantic versions
     * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
     */
    private compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;

            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }

        return 0;
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.backups.clear();
    }
}
