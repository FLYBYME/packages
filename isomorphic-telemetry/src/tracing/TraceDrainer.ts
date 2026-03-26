import { ISpan, ITraceExporter } from './ITraceExporter';
import { SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';

/**
 * TraceDrainer — Periodically flushes buffered spans to configured exporters.
 */
export class TraceDrainer {
    private buffer: ISpan[] = [];
    private timer?: TimerHandle;
    private exporters: ITraceExporter[] = [];

    constructor(private options: { flushIntervalMs?: number } = {}) {}

    public addExporter(exporter: ITraceExporter): void {
        this.exporters.push(exporter);
    }

    public push(span: ISpan): void {
        this.buffer.push(span);
    }

    public start(): void {
        if (this.timer) return;
        this.timer = setInterval(() => this.flush(), this.options.flushIntervalMs || 5000);
        SafeTimer.unref(this.timer);
    }

    public async stop(): Promise<void> {
        if (this.timer) {
            SafeTimer.clearInterval(this.timer);
            this.timer = undefined;
        }
        await this.flush();
    }

    private async flush(): Promise<void> {
        if (this.buffer.length === 0 || this.exporters.length === 0) return;

        const spans = [...this.buffer];
        this.buffer = [];

        await Promise.all(this.exporters.map(e => {
            try {
                return e.export(spans);
            } catch (err) {
                console.error('[TraceDrainer] Export failed:', err);
                return Promise.resolve();
            }
        }));
    }
}
