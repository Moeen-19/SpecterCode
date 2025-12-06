/**
 * Theme Asset Manager for MirrorCanvas
 * Handles asset loading, caching, validation, and optimization
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ThemeSpec } from '../models/ThemeModels';

/**
 * Asset type enumeration
 */
export enum AssetType {
    AUDIO = 'audio',
    IMAGE = 'image',
    TEXTURE = 'texture',
    FONT = 'font'
}

/**
 * Asset metadata
 */
export interface AssetMetadata {
    /** Asset path relative to extension root */
    path: string;
    
    /** Asset type */
    type: AssetType;
    
    /** File size in bytes */
    size: number;
    
    /** Asset format/extension */
    format: string;
    
    /** Whether asset is cached */
    cached: boolean;
    
    /** Cache timestamp */
    cacheTime?: Date;
    
    /** Asset hash for validation */
    hash?: string;
}

/**
 * Asset cache entry
 */
export interface CacheEntry {
    /** Asset data (buffer or data URL) */
    data: Buffer | string;
    
    /** Cache timestamp */
    timestamp: Date;
    
    /** Asset metadata */
    metadata: AssetMetadata;
}

/**
 * Asset validation result
 */
export interface AssetValidationResult {
    /** Whether asset is valid */
    isValid: boolean;
    
    /** Validation errors */
    errors: string[];
    
    /** Validation warnings */
    warnings: string[];
}

/**
 * Asset optimization options
 */
export interface AssetOptimizationOptions {
    /** Compress audio files */
    compressAudio: boolean;
    
    /** Compress image files */
    compressImages: boolean;
    
    /** Maximum cache size in MB */
    maxCacheSize: number;
    
    /** Enable lazy loading */
    lazyLoad: boolean;
    
    /** Preload critical assets */
    preloadCritical: boolean;
}

/**
 * Theme Asset Manager
 */
export class ThemeAssetManager {
    private assetCache: Map<string, CacheEntry> = new Map();
    private assetMetadata: Map<string, AssetMetadata> = new Map();
    private extensionPath: string;
    private maxCacheSize: number = 50 * 1024 * 1024; // 50MB default
    private currentCacheSize: number = 0;
    private validAssetFormats: Map<AssetType, string[]> = new Map([
        [AssetType.AUDIO, ['mp3', 'wav', 'ogg', 'webm']],
        [AssetType.IMAGE, ['png', 'jpg', 'jpeg', 'webp', 'gif']],
        [AssetType.TEXTURE, ['png', 'jpg', 'jpeg', 'webp']],
        [AssetType.FONT, ['woff', 'woff2', 'ttf', 'otf']]
    ]);

    constructor(extensionPath: string, options?: Partial<AssetOptimizationOptions>) {
        this.extensionPath = extensionPath;
        if (options?.maxCacheSize) {
            this.maxCacheSize = options.maxCacheSize * 1024 * 1024;
        }
    }

    /**
     * Load asset from file system
     */
    public async loadAsset(assetPath: string, type: AssetType): Promise<Buffer | string> {
        // Check cache first
        const cached = this.assetCache.get(assetPath);
        if (cached) {
            return cached.data;
        }

        try {
            const fullPath = path.join(this.extensionPath, assetPath);
            const uri = vscode.Uri.file(fullPath);
            const uint8Data = await vscode.workspace.fs.readFile(uri);
            const data = Buffer.from(uint8Data);

            // Validate asset
            const validation = this.validateAsset(assetPath, type, data);
            if (!validation.isValid) {
                throw new Error(`Asset validation failed: ${validation.errors.join(', ')}`);
            }

            // Cache the asset
            await this.cacheAsset(assetPath, data, type);

            return data;
        } catch (error) {
            throw new Error(`Failed to load asset "${assetPath}": ${(error as Error).message}`);
        }
    }

    /**
     * Load asset as data URL
     */
    public async loadAssetAsDataUrl(assetPath: string, type: AssetType): Promise<string> {
        const data = await this.loadAsset(assetPath, type);
        
        if (typeof data === 'string') {
            return data;
        }

        const mimeType = this.getMimeType(assetPath, type);
        const base64 = data.toString('base64');
        return `data:${mimeType};base64,${base64}`;
    }

    /**
     * Load all assets for a theme
     */
    public async loadThemeAssets(theme: ThemeSpec): Promise<Map<string, Buffer | string>> {
        const assets = new Map<string, Buffer | string>();

        try {
            // Load ambient audio
            if (theme.audio.ambient?.audioPath) {
                const audioData = await this.loadAsset(theme.audio.ambient.audioPath, AssetType.AUDIO);
                assets.set(theme.audio.ambient.audioPath, audioData);
            }

            // Load action sounds
            for (const [, soundPath] of Object.entries(theme.audio.actionSounds || {})) {
                if (soundPath) {
                    const audioData = await this.loadAsset(soundPath, AssetType.AUDIO);
                    assets.set(soundPath, audioData);
                }
            }

            // Load emotional sounds
            for (const [, soundPath] of Object.entries(theme.audio.emotionalSounds || {})) {
                if (soundPath) {
                    const audioData = await this.loadAsset(soundPath, AssetType.AUDIO);
                    assets.set(soundPath, audioData);
                }
            }

            // Load background texture if specified
            if (theme.visual.background.texturePath) {
                const textureData = await this.loadAsset(
                    theme.visual.background.texturePath,
                    AssetType.TEXTURE
                );
                assets.set(theme.visual.background.texturePath, textureData);
            }

            // Load preview image if specified
            if (theme.metadata.previewImage) {
                const imageData = await this.loadAsset(theme.metadata.previewImage, AssetType.IMAGE);
                assets.set(theme.metadata.previewImage, imageData);
            }

            return assets;
        } catch (error) {
            throw new Error(`Failed to load theme assets: ${(error as Error).message}`);
        }
    }

    /**
     * Validate asset
     */
    public validateAsset(assetPath: string, type: AssetType, data: Buffer): AssetValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check file extension
        const ext = path.extname(assetPath).toLowerCase().slice(1);
        const validFormats = this.validAssetFormats.get(type) || [];

        if (!validFormats.includes(ext)) {
            errors.push(
                `Invalid asset format "${ext}" for type "${type}". Valid formats: ${validFormats.join(', ')}`
            );
        }

        // Check file size
        const maxSizes: Record<AssetType, number> = {
            [AssetType.AUDIO]: 10 * 1024 * 1024, // 10MB
            [AssetType.IMAGE]: 5 * 1024 * 1024,  // 5MB
            [AssetType.TEXTURE]: 5 * 1024 * 1024, // 5MB
            [AssetType.FONT]: 2 * 1024 * 1024    // 2MB
        };

        const maxSize = maxSizes[type];
        if (data.length > maxSize) {
            errors.push(
                `Asset size ${(data.length / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
            );
        }

        // Check for magic bytes (file signature validation)
        const magicBytes: Record<AssetType, Record<string, Buffer>> = {
            [AssetType.AUDIO]: {
                mp3: Buffer.from([0xFF, 0xFB]),
                wav: Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF
                ogg: Buffer.from([0x4F, 0x67, 0x67, 0x53]) // OggS
            },
            [AssetType.IMAGE]: {
                png: Buffer.from([0x89, 0x50, 0x4E, 0x47]), // PNG
                jpg: Buffer.from([0xFF, 0xD8, 0xFF]),
                webp: Buffer.from([0x52, 0x49, 0x46, 0x46]) // RIFF
            },
            [AssetType.TEXTURE]: {
                png: Buffer.from([0x89, 0x50, 0x4E, 0x47]),
                jpg: Buffer.from([0xFF, 0xD8, 0xFF]),
                webp: Buffer.from([0x52, 0x49, 0x46, 0x46])
            },
            [AssetType.FONT]: {}
        };

        // Validate magic bytes if available
        const typeMagic = magicBytes[type];
        if (typeMagic && typeMagic[ext]) {
            const expectedMagic = typeMagic[ext];
            const fileMagic = data.slice(0, expectedMagic.length);
            if (!fileMagic.equals(expectedMagic)) {
                warnings.push(`Asset file signature does not match expected format for ${ext}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Cache asset
     */
    private async cacheAsset(assetPath: string, data: Buffer, type: AssetType): Promise<void> {
        // Check if adding this asset would exceed cache size
        if (this.currentCacheSize + data.length > this.maxCacheSize) {
            // Evict oldest entries until there's space
            await this.evictOldestEntries(data.length);
        }

        const metadata: AssetMetadata = {
            path: assetPath,
            type,
            size: data.length,
            format: path.extname(assetPath).toLowerCase().slice(1),
            cached: true,
            cacheTime: new Date(),
            hash: this.calculateHash(data)
        };

        this.assetCache.set(assetPath, {
            data,
            timestamp: new Date(),
            metadata
        });

        this.assetMetadata.set(assetPath, metadata);
        this.currentCacheSize += data.length;
    }

    /**
     * Evict oldest cache entries
     */
    private async evictOldestEntries(requiredSpace: number): Promise<void> {
        const entries = Array.from(this.assetCache.entries())
            .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

        let freedSpace = 0;
        for (const [key, entry] of entries) {
            if (freedSpace >= requiredSpace) break;

            this.assetCache.delete(key);
            this.assetMetadata.delete(key);
            freedSpace += entry.metadata.size;
            this.currentCacheSize -= entry.metadata.size;
        }
    }

    /**
     * Get asset metadata
     */
    public getAssetMetadata(assetPath: string): AssetMetadata | undefined {
        return this.assetMetadata.get(assetPath);
    }

    /**
     * Get all cached assets
     */
    public getCachedAssets(): AssetMetadata[] {
        return Array.from(this.assetMetadata.values());
    }

    /**
     * Clear cache
     */
    public clearCache(): void {
        this.assetCache.clear();
        this.assetMetadata.clear();
        this.currentCacheSize = 0;
    }

    /**
     * Get cache statistics
     */
    public getCacheStatistics(): {
        totalAssets: number;
        cacheSize: number;
        maxCacheSize: number;
        cacheUtilization: number;
    } {
        return {
            totalAssets: this.assetCache.size,
            cacheSize: this.currentCacheSize,
            maxCacheSize: this.maxCacheSize,
            cacheUtilization: (this.currentCacheSize / this.maxCacheSize) * 100
        };
    }

    /**
     * Get fallback asset for missing asset
     */
    public getFallbackAsset(type: AssetType): Buffer | string {
        // Return minimal fallback data based on type
        switch (type) {
            case AssetType.AUDIO:
                // Return silent audio (WAV format)
                return Buffer.from([
                    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
                    0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
                    0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
                    0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
                    0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
                    0x00, 0x00, 0x00, 0x00
                ]);
            case AssetType.IMAGE:
            case AssetType.TEXTURE:
                // Return 1x1 transparent PNG
                return Buffer.from([
                    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
                    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
                    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
                    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
                    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
                    0x42, 0x60, 0x82
                ]);
            case AssetType.FONT:
                return Buffer.alloc(0);
            default:
                return Buffer.alloc(0);
        }
    }

    /**
     * Calculate simple hash for asset
     */
    private calculateHash(data: Buffer): string {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Get MIME type for asset
     */
    private getMimeType(assetPath: string, type: AssetType): string {
        const ext = path.extname(assetPath).toLowerCase().slice(1);

        const mimeTypes: Record<string, string> = {
            // Audio
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            webm: 'audio/webm',
            // Image
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            webp: 'image/webp',
            gif: 'image/gif',
            // Font
            woff: 'font/woff',
            woff2: 'font/woff2',
            ttf: 'font/ttf',
            otf: 'font/otf'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.clearCache();
    }
}
