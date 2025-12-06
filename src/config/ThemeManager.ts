/**
 * Theme Manager for MirrorCanvas
 * Handles theme management, sharing, and community theme support
 */

import * as vscode from 'vscode';
import { ThemeSpec, ThemeValidationResult, ThemePreset } from '../models/ThemeModels';
import { ConfigurationManager } from './ConfigurationManager';

/**
 * Community theme metadata for sharing and discovery
 */
export interface CommunityThemeMetadata {
    /** Theme ID */
    id: string;
    
    /** Theme name */
    name: string;
    
    /** Theme author */
    author: string;
    
    /** Theme description */
    description: string;
    
    /** Download count */
    downloads: number;
    
    /** Rating (0-5 stars) */
    rating: number;
    
    /** Number of ratings */
    ratingCount: number;
    
    /** Tags for categorization */
    tags: string[];
    
    /** Theme version */
    version: string;
    
    /** Last updated timestamp */
    lastUpdated: Date;
    
    /** Repository URL for the theme */
    repositoryUrl?: string;
    
    /** License type */
    license: string;
}

/**
 * Theme sharing options
 */
export interface ThemeSharingOptions {
    /** Include theme metadata */
    includeMetadata: boolean;
    
    /** Include preview image */
    includePreview: boolean;
    
    /** Compress theme data */
    compress: boolean;
    
    /** Add sharing metadata (author, timestamp) */
    addSharingMetadata: boolean;
}

/**
 * Theme Manager for handling theme operations
 */
export class ThemeManager {
    private configManager: ConfigurationManager;
    private communityThemes: Map<string, CommunityThemeMetadata> = new Map();
    private themeCache: Map<string, ThemeSpec> = new Map();

    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        this.initializeCommunityThemes();
    }

    /**
     * Initialize community themes registry
     */
    private initializeCommunityThemes(): void {
        // In a real implementation, this would fetch from a remote registry
        // For now, we'll initialize with empty registry
        this.communityThemes.clear();
    }

    /**
     * Export theme for sharing
     */
    public async exportThemeForSharing(
        themeId: string,
        options: ThemeSharingOptions = {
            includeMetadata: true,
            includePreview: true,
            compress: false,
            addSharingMetadata: true,
        }
    ): Promise<string> {
        const theme = this.configManager.loadTheme(themeId);
        if (!theme) {
            throw new Error(`Theme "${themeId}" not found`);
        }

        // Validate theme before sharing
        const validation = this.configManager.validateThemeSpec(theme);
        if (!validation.isValid) {
            throw new Error(`Cannot share invalid theme: ${validation.errors.join(', ')}`);
        }

        // Create shareable theme object
        const shareableTheme = { ...theme };

        // Add sharing metadata if requested
        if (options.addSharingMetadata) {
            shareableTheme.metadata = {
                ...shareableTheme.metadata,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        // Convert to JSON
        let themeJson = JSON.stringify(shareableTheme, null, 2);

        // Compress if requested
        if (options.compress) {
            themeJson = JSON.stringify(shareableTheme);
        }

        return themeJson;
    }

    /**
     * Import theme from shared data
     */
    public async importThemeFromSharing(themeData: string): Promise<ThemeSpec> {
        try {
            const theme = JSON.parse(themeData) as ThemeSpec;

            // Validate imported theme
            const validation = this.configManager.validateThemeSpec(theme);
            if (!validation.isValid) {
                throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
            }

            return theme;
        } catch (error) {
            throw new Error(`Failed to import theme: ${(error as Error).message}`);
        }
    }

    /**
     * Search community themes
     */
    public searchCommunityThemes(query: string, tags?: string[]): CommunityThemeMetadata[] {
        const results: CommunityThemeMetadata[] = [];

        this.communityThemes.forEach((theme) => {
            const matchesQuery =
                query === '' ||
                theme.name.toLowerCase().includes(query.toLowerCase()) ||
                theme.description.toLowerCase().includes(query.toLowerCase()) ||
                theme.author.toLowerCase().includes(query.toLowerCase());

            const matchesTags =
                !tags || tags.length === 0 || tags.some((tag) => theme.tags.includes(tag));

            if (matchesQuery && matchesTags) {
                results.push(theme);
            }
        });

        // Sort by rating and downloads
        results.sort((a, b) => {
            const ratingDiff = b.rating - a.rating;
            if (ratingDiff !== 0) return ratingDiff;
            return b.downloads - a.downloads;
        });

        return results;
    }

    /**
     * Get community theme by ID
     */
    public getCommunityTheme(themeId: string): CommunityThemeMetadata | undefined {
        return this.communityThemes.get(themeId);
    }

    /**
     * Get all community themes
     */
    public getAllCommunityThemes(): CommunityThemeMetadata[] {
        return Array.from(this.communityThemes.values());
    }

    /**
     * Register a community theme
     */
    public registerCommunityTheme(metadata: CommunityThemeMetadata): void {
        this.communityThemes.set(metadata.id, metadata);
    }

    /**
     * Rate a community theme
     */
    public rateTheme(themeId: string, rating: number): void {
        const theme = this.communityThemes.get(themeId);
        if (!theme) {
            throw new Error(`Theme "${themeId}" not found`);
        }

        if (rating < 0 || rating > 5) {
            throw new Error('Rating must be between 0 and 5');
        }

        // Update rating (simple average)
        const totalRating = theme.rating * theme.ratingCount + rating;
        theme.ratingCount += 1;
        theme.rating = totalRating / theme.ratingCount;
    }

    /**
     * Download community theme
     */
    public async downloadCommunityTheme(themeId: string): Promise<ThemeSpec> {
        const metadata = this.communityThemes.get(themeId);
        if (!metadata) {
            throw new Error(`Theme "${themeId}" not found in community registry`);
        }

        // In a real implementation, this would fetch from a remote repository
        // For now, we'll throw an error indicating this is a placeholder
        throw new Error(
            `Community theme download not yet implemented. Repository: ${metadata.repositoryUrl}`
        );
    }

    /**
     * Get theme statistics
     */
    public getThemeStatistics(): {
        totalThemes: number;
        customThemes: number;
        communityThemes: number;
        averageRating: number;
    } {
        const config = this.configManager.getUserConfig();
        const customThemeCount = Object.keys(config.customThemes).length;
        const communityThemeCount = this.communityThemes.size;

        let totalRating = 0;
        let ratingCount = 0;

        this.communityThemes.forEach((theme) => {
            totalRating += theme.rating * theme.ratingCount;
            ratingCount += theme.ratingCount;
        });

        return {
            totalThemes: customThemeCount + communityThemeCount,
            customThemes: customThemeCount,
            communityThemes: communityThemeCount,
            averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        };
    }

    /**
     * Validate theme compatibility
     */
    public validateThemeCompatibility(theme: ThemeSpec): {
        compatible: boolean;
        issues: string[];
    } {
        const issues: string[] = [];

        // Check required fields
        if (!theme.metadata?.id) {
            issues.push('Theme must have a metadata.id');
        }
        if (!theme.metadata?.name) {
            issues.push('Theme must have a metadata.name');
        }
        if (!theme.visual?.palette?.primary) {
            issues.push('Theme must have a visual.palette.primary color');
        }

        // Check version compatibility
        if (theme.metadata?.version) {
            const versionParts = theme.metadata.version.split('.');
            if (versionParts.length !== 3) {
                issues.push('Theme version must follow semver format (e.g., 1.0.0)');
            }
        }

        return {
            compatible: issues.length === 0,
            issues,
        };
    }

    /**
     * Merge theme with defaults
     */
    public mergeThemeWithDefaults(theme: Partial<ThemeSpec>): ThemeSpec {
        // This would merge with default theme structure
        // For now, return as-is (would need default theme implementation)
        return theme as ThemeSpec;
    }

    /**
     * Clone theme with new ID
     */
    public async cloneTheme(sourceThemeId: string, newThemeId: string, newName: string): Promise<ThemeSpec> {
        const sourceTheme = this.configManager.loadTheme(sourceThemeId);
        if (!sourceTheme) {
            throw new Error(`Source theme "${sourceThemeId}" not found`);
        }

        // Create cloned theme
        const clonedTheme: ThemeSpec = JSON.parse(JSON.stringify(sourceTheme));
        clonedTheme.metadata.id = newThemeId;
        clonedTheme.metadata.name = newName;
        clonedTheme.metadata.createdAt = new Date();
        clonedTheme.metadata.updatedAt = new Date();

        // Save cloned theme
        await this.configManager.saveCustomTheme(clonedTheme);

        return clonedTheme;
    }

    /**
     * Get theme preview
     */
    public getThemePreview(themeId: string): {
        colors: string[];
        name: string;
        description: string;
    } | null {
        const theme = this.configManager.loadTheme(themeId);
        if (!theme) {
            return null;
        }

        return {
            colors: [
                theme.visual.palette.primary,
                theme.visual.palette.secondary,
                theme.visual.palette.accent,
            ],
            name: theme.metadata.name,
            description: theme.metadata.description,
        };
    }

    /**
     * Export theme as JSON file
     */
    public async exportThemeAsFile(themeId: string, filePath: string): Promise<void> {
        const themeJson = await this.exportThemeForSharing(themeId, {
            includeMetadata: true,
            includePreview: true,
            compress: false,
            addSharingMetadata: true,
        });

        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(filePath),
            encoder.encode(themeJson)
        );
    }

    /**
     * Import theme from file
     */
    public async importThemeFromFile(filePath: string): Promise<ThemeSpec> {
        const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
        const themeData = new TextDecoder().decode(fileContent);
        return this.importThemeFromSharing(themeData);
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.communityThemes.clear();
        this.themeCache.clear();
    }
}
