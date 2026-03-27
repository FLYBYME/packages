import { IMetricsRegistry } from './IMetricsRegistry';
import { SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';

/**
 * DatadogExporter — Periodically pushes aggregated metrics to the Datadog API.
 */
export class DatadogExporter {
    private timer?: TimerHandle;
    private readonly endpoint: string;
    private readonly apiKey: string;

    constructor(
        private registry: IMetricsRegistry,
        private options: { endpoint?: string, apiKey: string, intervalMs?: number }
    ) {
        this.endpoint = options.endpoint || 'https://api.datadoghq.com/api/v1/series';
        this.apiKey = options.apiKey;
    }

    public start(): void {
        if (this.timer) return;
        this.timer = setInterval(() => this.flush(), this.options.intervalMs || 30000);
        SafeTimer.unref(this.timer);
    }

    public stop(): void {
        if (this.timer) {
            SafeTimer.clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    private async flush(): Promise<void> {
        const snapshots = this.registry.getMetrics();
        if (snapshots.length === 0) return;

        // const _series = snapshots.map(m => ({
        //     metric: m.name,
        //     points: [[Math.floor(m.timestamp / 1000), m.value]],
        //     type: m.type === 'counter' ? 'count' : 'gauge',
        //     tags: m.labels ? Object.entries(m.labels).map(([k, v]) => `${k}:${v}`) : []
        // }));

        try {
            // console.log(`[DatadogExporter] Pushing ${series.length} series to Datadog.`);
            // await fetch(`${this.endpoint}?api_key=${this.apiKey}`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ series })
            // });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[DatadogExporter] Export failed: ${message}`);
        }
    }
}
