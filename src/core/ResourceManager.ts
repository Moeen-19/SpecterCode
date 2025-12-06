/**
 * Manages system resources including memory, animations, and audio
 * Provides cleanup and optimization utilities
 */
export class ResourceManager {
    private allocatedResources: Map<string, any> = new Map();
    private memoryThreshold: number = 100 * 1024 * 1024; // 100MB
    private isMonitoring: boolean = false;
    private monitoringInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeResourceTracking();
    }

    /**
     * Initialize resource tracking
     */
    private initializeResourceTracking(): void {
        console.log('Initializing resource tracking...');
    }

    /**
     * Register a resource for tracking
     */
    public registerResource(id: string, resource: any): void {
        this.allocatedResources.set(id, {
            resource,
            createdAt: Date.now(),
            size: this.estimateSize(resource)
        });

        console.log(`Resource registered: ${id}`);
    }

    /**
     * Unregister and cleanup a resource
     */
    public unregisterResource(id: string): void {
        const resourceInfo = this.allocatedResources.get(id);
        
        if (resourceInfo) {
            // Cleanup resource if it has a dispose method
            if (resourceInfo.resource && typeof resourceInfo.resource.dispose === 'function') {
                resourceInfo.resource.dispose();
            }

            this.allocatedResources.delete(id);
            console.log(`Resource unregistered: ${id}`);
        }
    }

    /**
     * Estimate size of a resource in bytes
     */
    private estimateSize(resource: any): number {
        if (typeof resource === 'string') {
            return resource.length * 2; // UTF-16 encoding
        }
        if (typeof resource === 'object' && resource !== null) {
            return JSON.stringify(resource).length;
        }
        return 0;
    }

    /**
     * Get total memory used by tracked resources
     */
    public getTotalMemoryUsage(): number {
        let total = 0;
        this.allocatedResources.forEach(info => {
            total += info.size;
        });
        return total;
    }

    /**
     * Start monitoring memory usage
     */
    public startMemoryMonitoring(intervalMs: number = 5000): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, intervalMs);

        console.log('Memory monitoring started');
    }

    /**
     * Stop monitoring memory usage
     */
    public stopMemoryMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('Memory monitoring stopped');
    }

    /**
     * Check current memory usage and trigger cleanup if needed
     */
    private checkMemoryUsage(): void {
        const usage = this.getTotalMemoryUsage();

        if (usage > this.memoryThreshold) {
            console.warn(`Memory usage exceeds threshold: ${usage} bytes`);
            this.performMemoryCleanup();
        }
    }

    /**
     * Perform memory cleanup by removing old resources
     */
    private performMemoryCleanup(): void {
        console.log('Performing memory cleanup...');

        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        const resourcesToClean: string[] = [];

        this.allocatedResources.forEach((info, id) => {
            if (now - info.createdAt > maxAge) {
                resourcesToClean.push(id);
            }
        });

        resourcesToClean.forEach(id => {
            this.unregisterResource(id);
        });

        console.log(`Cleaned up ${resourcesToClean.length} old resources`);
    }

    /**
     * Get list of all tracked resources
     */
    public getTrackedResources(): string[] {
        return Array.from(this.allocatedResources.keys());
    }

    /**
     * Get information about a specific resource
     */
    public getResourceInfo(id: string): any {
        return this.allocatedResources.get(id);
    }

    /**
     * Clear all resources
     */
    public clearAllResources(): void {
        console.log('Clearing all resources...');

        this.allocatedResources.forEach((info, id) => {
            if (info.resource && typeof info.resource.dispose === 'function') {
                info.resource.dispose();
            }
        });

        this.allocatedResources.clear();
        console.log('All resources cleared');
    }

    /**
     * Get memory usage statistics
     */
    public getMemoryStats(): {
        totalUsage: number;
        resourceCount: number;
        threshold: number;
        percentageUsed: number;
    } {
        const totalUsage = this.getTotalMemoryUsage();
        const resourceCount = this.allocatedResources.size;
        const percentageUsed = (totalUsage / this.memoryThreshold) * 100;

        return {
            totalUsage,
            resourceCount,
            threshold: this.memoryThreshold,
            percentageUsed
        };
    }

    /**
     * Dispose of resource manager
     */
    public dispose(): void {
        this.stopMemoryMonitoring();
        this.clearAllResources();
    }
}
