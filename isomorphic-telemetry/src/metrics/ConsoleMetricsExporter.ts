import { IMetricsRegistry } from './IMetricsRegistry';
import { SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';

/**
 * ConsoleMetricsExporter — Periodically logs application metrics to the console.
 */
export class ConsoleMetricsExporter {
    private timer?: TimerHandle;

    constructor(
        private registry: IMetricsRegistry,
        private options: { intervalMs?: number } = {}
    ) {}

    public start(): void {
        if (this.timer) return;
        this.timer = setInterval(() => this.logMetrics(), this.options.intervalMs || 10000);
        SafeTimer.unref(this.timer);
    }

    public stop(): void {
        if (this.timer) {
            SafeTimer.clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    private logMetrics(): void {
        const snapshots = this.registry.getMetrics();
        if (snapshots.length === 0) return;

        console.log(`\x1b[32m[Metrics] --- Snapshot at ${new Date().toISOString()} ---\x1b[0m`);
        
        // Group by name for cleaner output
        const grouped = new Map<string, unknown[]>();
        for (const s of snapshots) {
            if (!grouped.has(s.name)) grouped.set(s.name, []);
            grouped.get(s.name)!.push(s);
        }

        for (const [name, items] of grouped.entries()) {
            for (const item of items) {
                const metric = item as { name: string; value: number | string; labels?: Record<string, string> };
                const labels = metric.labels ? ` {${JSON.stringify(metric.labels)}}` : '';
                console.log(`  \x1b[1m${name}\x1b[0m${labels}: \x1b[33m${metric.value}\x1b[0m`);
            }
        }
        console.log(`\x1b[32m[Metrics] ------------------------------------------\x1b[0m`);
    }
}
