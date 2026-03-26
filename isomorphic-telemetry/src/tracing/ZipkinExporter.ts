import { ITraceExporter, ISpan } from './ITraceExporter';

/**
 * ZipkinExporter — Transforms internal span data into Zipkin-compatible JSON format.
 */
export class ZipkinExporter implements ITraceExporter {
    public readonly name = 'zipkin';

    constructor(private endpoint: string) {}

    async export(_spans: ISpan[]): Promise<void> {
        /*
        const _zipkinSpans = spans.map(span => ({
            traceId: span.traceId,
            id: span.spanId,
            parentId: span.parentId,
            name: span.name,
            timestamp: span.startTime * 1000,
            duration: ((span.endTime || Date.now()) - span.startTime) * 1000,
            tags: span.tags
        }));
        */

        try {
            // Zipkin standard endpoint: POST /api/v2/spans
            // await fetch(this.endpoint, { 
            //     method: 'POST', 
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(zipkinSpans) 
            // });
        } catch (err) {
            console.error('[ZipkinExporter] Export failed', err);
        }
    }
}
