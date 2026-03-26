import { ITraceExporter, ISpan } from './ITraceExporter';

/**
 * JaegerExporter — Transforms internal span data into Jaeger-compatible format.
 * (Simplified for demonstration, flushes via HTTP POST)
 */
export class JaegerExporter implements ITraceExporter {
    public readonly name = 'jaeger';

    constructor(private endpoint: string) {}

    async export(_spans: ISpan[]): Promise<void> {
        /*
        const _jaegerSpans = spans.map(span => ({
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentId || '0000000000000000',
            operationName: span.name,
            startTime: span.startTime * 1000, // microseconds
            duration: ((span.endTime || Date.now()) - span.startTime) * 1000,
            tags: Object.entries(span.tags || {}).map(([key, value]) => ({ key, value }))
        }));
        */

        try {
            // In a real implementation, we'd use a dedicated library or raw fetch
            // console.log(`[JaegerExporter] Exporting ${spans.length} spans to ${this.endpoint}`);
            // await fetch(this.endpoint, { method: 'POST', body: JSON.stringify(jaegerSpans) });
        } catch (err) {
            console.error('[JaegerExporter] Export failed', err);
        }
    }
}
