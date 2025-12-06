/**
 * Performance metric data structure
 */
interface PerformanceMetric {
    name: string;
    values: number[];
    unit: string;
    threshold?: number;
    createdAt: Date;
}

/**
 * Performance report data structure
 */
interface PerformanceReport {
    timestamp: Date;
    metrics: Record<string, {
        unit: string;
        average: number | null;
        max: number | null;
        min: number | null;
        threshold?: number;
        isHealthy: boolean;
    }>;
}

/**
 * Diagnostic information data structure
 */
interface DiagnosticInfo {
    timestamp: Date;
    overallHealth: 'healthy' | 'warning' | 'critical';
    issues: Array<{
        metric: string;
        current: number | null;
        threshold: number | undefined;
        severity: number;
    }>;
    recommendations: string[];
}

/**
 * Monitors extension performance metrics and provides diagnostics
 */
export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private isMonitoring: boolean = false;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private performanceThresholds = {
        frameTime: 16.67, // 60fps target
        memoryUsage: 100 * 1024 * 1024, // 100MB
        cpuUsage: 80 // percentage
    };

    constructor() {
        this.initializeMetrics();
    }

    /**
     * Initialize performance metrics
     */
    private initializeMetrics(): void {
        this.registerMetric('frameTime', 'ms', this.performanceThresholds.frameTime);
        this.registerMetric('memoryUsage', 'bytes', this.performanceThresholds.memoryUsage);
        this.registerMetric('cpuUsage', '%', this.performanceThresholds.cpuUsage);
        this.registerMetric('animationFrameCount', 'frames');
        this.registerMetric('eventProcessingTime', 'ms');
    }

    /**
     * Register a new performance metric
     */
    public registerMetric(name: string, unit: string, threshold?: number): void {
        this.metrics.set(name, {
            name,
            values: [],
            unit,
            threshold,
            createdAt: new Date()
        });
    }

    /**
     * Record a metric value
     */
    public recordMetric(name: string, value: number): void {
        const metric = this.metrics.get(name);
        if (metric) {
            metric.values.push(value);
            // Keep only last 100 values
            if (metric.values.length > 100) {
                metric.values.shift();
            }

            // Check if threshold is exceeded
            if (metric.threshold && value > metric.threshold) {
                console.warn(`Performance warning: ${name} exceeded threshold (${value} > ${metric.threshold})`);
            }
        }
    }

    /**
     * Start performance monitoring
     */
    public startMonitoring(intervalMs: number = 1000): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);

        console.log('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    public stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('Performance monitoring stopped');
    }

    /**
     * Collect current performance metrics
     */
    private collectMetrics(): void {
        // Collect memory usage
        if (global.gc) {
            global.gc();
        }

        const memUsage = process.memoryUsage();
        this.recordMetric('memoryUsage', memUsage.heapUsed);

        // Collect CPU usage (simplified)
        const cpuUsage = process.cpuUsage();
        const totalCpuTime = cpuUsage.user + cpuUsage.system;
        this.recordMetric('cpuUsage', Math.min(totalCpuTime / 1000000, 100));
    }

    /**
     * Get average value for a metric
     */
    public getAverageMetric(name: string): number | null {
        const metric = this.metrics.get(name);
        if (!metric || metric.values.length === 0) {
            return null;
        }

        const sum = metric.values.reduce((a, b) => a + b, 0);
        return sum / metric.values.length;
    }

    /**
     * Get maximum value for a metric
     */
    public getMaxMetric(name: string): number | null {
        const metric = this.metrics.get(name);
        if (!metric || metric.values.length === 0) {
            return null;
        }

        return Math.max(...metric.values);
    }

    /**
     * Get minimum value for a metric
     */
    public getMinMetric(name: string): number | null {
        const metric = this.metrics.get(name);
        if (!metric || metric.values.length === 0) {
            return null;
        }

        return Math.min(...metric.values);
    }

    /**
     * Get performance report
     */
    public getPerformanceReport(): PerformanceReport {
        const report: PerformanceReport = {
            timestamp: new Date(),
            metrics: {}
        };

        this.metrics.forEach((metric, name) => {
            report.metrics[name] = {
                unit: metric.unit,
                average: this.getAverageMetric(name),
                max: this.getMaxMetric(name),
                min: this.getMinMetric(name),
                threshold: metric.threshold,
                isHealthy: this.isMetricHealthy(name)
            };
        });

        return report;
    }

    /**
     * Check if a metric is within healthy bounds
     */
    private isMetricHealthy(name: string): boolean {
        const metric = this.metrics.get(name);
        if (!metric || !metric.threshold) {
            return true;
        }

        const average = this.getAverageMetric(name);
        return average !== null && average <= metric.threshold;
    }

    /**
     * Get diagnostic information
     */
    public getDiagnostics(): DiagnosticInfo {
        const report = this.getPerformanceReport();
        const diagnostics: DiagnosticInfo = {
            timestamp: new Date(),
            overallHealth: 'healthy',
            issues: [],
            recommendations: []
        };

        // Check for issues
        Object.entries(report.metrics).forEach(([name, metric]) => {
            if (!metric.isHealthy) {
                diagnostics.issues.push({
                    metric: name,
                    current: metric.average,
                    threshold: metric.threshold,
                    severity: this.calculateSeverity(metric.average, metric.threshold)
                });
            }
        });

        // Determine overall health
        if (diagnostics.issues.length > 0) {
            const maxSeverity = Math.max(...diagnostics.issues.map(i => i.severity));
            diagnostics.overallHealth = maxSeverity > 0.8 ? 'critical' : maxSeverity > 0.5 ? 'warning' : 'healthy';
        }

        // Generate recommendations
        diagnostics.recommendations = this.generateRecommendations(diagnostics.issues);

        return diagnostics;
    }

    /**
     * Calculate severity score (0-1)
     */
    private calculateSeverity(current: number | null, threshold: number | undefined): number {
        if (current === null || !threshold) {
            return 0;
        }

        return Math.min(current / threshold, 1);
    }

    /**
     * Generate recommendations based on issues
     */
    private generateRecommendations(issues: any[]): string[] {
        const recommendations: string[] = [];

        issues.forEach(issue => {
            if (issue.metric === 'memoryUsage') {
                recommendations.push('Consider disabling some visual effects to reduce memory usage');
                recommendations.push('Try enabling Performance Mode in settings');
            }
            if (issue.metric === 'cpuUsage') {
                recommendations.push('Reduce animation intensity in settings');
                recommendations.push('Disable audio effects to reduce CPU load');
            }
            if (issue.metric === 'frameTime') {
                recommendations.push('Reduce particle density in theme settings');
                recommendations.push('Enable Performance Mode for smoother animations');
            }
        });

        return recommendations;
    }

    /**
     * Reset all metrics
     */
    public resetMetrics(): void {
        this.metrics.forEach(metric => {
            metric.values = [];
        });
        console.log('Performance metrics reset');
    }

    /**
     * Dispose of performance monitor
     */
    public dispose(): void {
        this.stopMonitoring();
        this.metrics.clear();
    }
}
