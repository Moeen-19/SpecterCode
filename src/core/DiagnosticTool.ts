import * as vscode from 'vscode';
import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * Provides diagnostic tools for troubleshooting extension issues
 */
export class DiagnosticTool {
    private performanceMonitor: PerformanceMonitor;
    private diagnosticLog: DiagnosticEntry[] = [];
    private maxLogEntries: number = 1000;

    constructor(performanceMonitor: PerformanceMonitor) {
        this.performanceMonitor = performanceMonitor;
    }

    /**
     * Run full system diagnostics
     */
    public async runDiagnostics(): Promise<DiagnosticResult> {
        console.log('Running system diagnostics...');

        const result: DiagnosticResult = {
            timestamp: new Date(),
            checks: [],
            overallStatus: 'healthy'
        };

        // Check VS Code version
        result.checks.push(this.checkVSCodeVersion());

        // Check extension configuration
        result.checks.push(await this.checkConfiguration());

        // Check performance
        result.checks.push(this.checkPerformance());

        // Check system resources
        result.checks.push(this.checkSystemResources());

        // Determine overall status
        const failedChecks = result.checks.filter(c => c.status === 'failed');
        const warningChecks = result.checks.filter(c => c.status === 'warning');

        if (failedChecks.length > 0) {
            result.overallStatus = 'failed';
        } else if (warningChecks.length > 0) {
            result.overallStatus = 'warning';
        }

        this.logDiagnostic('Diagnostics completed', result.overallStatus);

        return result;
    }

    /**
     * Check VS Code version compatibility
     */
    private checkVSCodeVersion(): DiagnosticCheck {
        const version = vscode.version || '1.74.0';
        const minVersion = '1.74.0';

        return {
            name: 'VS Code Version',
            status: this.compareVersions(version, minVersion) >= 0 ? 'passed' : 'failed',
            details: `Current: ${version}, Required: ${minVersion}`,
            timestamp: new Date()
        };
    }

    /**
     * Check extension configuration
     */
    private async checkConfiguration(): Promise<DiagnosticCheck> {
        try {
            const config = vscode.workspace.getConfiguration('mirrorCanvas');
            const enabled = config.get('enabled');
            const theme = config.get('theme');

            const isValid = enabled !== undefined && theme !== undefined;

            return {
                name: 'Configuration',
                status: isValid ? 'passed' : 'warning',
                details: `Enabled: ${enabled}, Theme: ${theme}`,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                name: 'Configuration',
                status: 'failed',
                details: `Error reading configuration: ${error}`,
                timestamp: new Date()
            };
        }
    }

    /**
     * Check performance metrics
     */
    private checkPerformance(): DiagnosticCheck {
        const diagnostics = this.performanceMonitor.getDiagnostics();

        return {
            name: 'Performance',
            status: diagnostics.overallHealth === 'healthy' ? 'passed' : 
                    diagnostics.overallHealth === 'warning' ? 'warning' : 'failed',
            details: `Health: ${diagnostics.overallHealth}, Issues: ${diagnostics.issues.length}`,
            recommendations: diagnostics.recommendations,
            timestamp: new Date()
        };
    }

    /**
     * Check system resources
     */
    private checkSystemResources(): DiagnosticCheck {
        const memUsage = process.memoryUsage();
        const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        const status = heapUsedPercent > 90 ? 'failed' : 
                      heapUsedPercent > 70 ? 'warning' : 'passed';

        return {
            name: 'System Resources',
            status,
            details: `Heap Usage: ${heapUsedPercent.toFixed(2)}%, Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            timestamp: new Date()
        };
    }

    /**
     * Compare semantic versions
     */
    private compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;

            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }

        return 0;
    }

    /**
     * Log a diagnostic entry
     */
    private logDiagnostic(message: string, status: string): void {
        const entry: DiagnosticEntry = {
            timestamp: new Date(),
            message,
            status
        };

        this.diagnosticLog.push(entry);

        // Keep log size manageable
        if (this.diagnosticLog.length > this.maxLogEntries) {
            this.diagnosticLog.shift();
        }
    }

    /**
     * Get diagnostic log
     */
    public getDiagnosticLog(): DiagnosticEntry[] {
        return [...this.diagnosticLog];
    }

    /**
     * Export diagnostics as JSON
     */
    public async exportDiagnostics(): Promise<string> {
        const diagnostics = await this.runDiagnostics();
        const log = this.getDiagnosticLog();

        return JSON.stringify({
            diagnostics,
            log,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Show diagnostics in output channel
     */
    public async showDiagnosticsInOutput(): Promise<void> {
        const outputChannel = vscode.window.createOutputChannel('MirrorCanvas Diagnostics');
        outputChannel.show();

        const diagnostics = await this.runDiagnostics();

        outputChannel.appendLine('=== MirrorCanvas Diagnostics ===');
        outputChannel.appendLine(`Timestamp: ${diagnostics.timestamp.toISOString()}`);
        outputChannel.appendLine(`Overall Status: ${diagnostics.overallStatus}`);
        outputChannel.appendLine('');

        diagnostics.checks.forEach(check => {
            outputChannel.appendLine(`[${check.status.toUpperCase()}] ${check.name}`);
            outputChannel.appendLine(`  Details: ${check.details}`);
            if (check.recommendations && check.recommendations.length > 0) {
                outputChannel.appendLine('  Recommendations:');
                check.recommendations.forEach(rec => {
                    outputChannel.appendLine(`    - ${rec}`);
                });
            }
            outputChannel.appendLine('');
        });

        outputChannel.appendLine('=== Recent Log Entries ===');
        const recentLog = this.diagnosticLog.slice(-20);
        recentLog.forEach(entry => {
            outputChannel.appendLine(`[${entry.timestamp.toISOString()}] ${entry.status}: ${entry.message}`);
        });
    }

    /**
     * Clear diagnostic log
     */
    public clearLog(): void {
        this.diagnosticLog = [];
        console.log('Diagnostic log cleared');
    }

    /**
     * Dispose of diagnostic tool
     */
    public dispose(): void {
        this.diagnosticLog = [];
    }
}

interface DiagnosticResult {
    timestamp: Date;
    checks: DiagnosticCheck[];
    overallStatus: 'healthy' | 'warning' | 'failed';
}

interface DiagnosticCheck {
    name: string;
    status: 'passed' | 'warning' | 'failed';
    details: string;
    recommendations?: string[];
    timestamp: Date;
}

interface DiagnosticEntry {
    timestamp: Date;
    message: string;
    status: string;
}
