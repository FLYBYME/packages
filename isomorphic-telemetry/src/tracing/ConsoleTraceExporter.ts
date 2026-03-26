import { ITraceExporter, ISpan } from './ITraceExporter';

/**
 * ConsoleTraceExporter — Outputs distributed tracing spans to the console.
 */
export class ConsoleTraceExporter implements ITraceExporter {
    public readonly name = 'console';

    public async export(spans: ISpan[]): Promise<void> {
        for (const span of spans) {
            const endTime = span.endTime || Date.now();
            const duration = endTime - span.startTime;
            const traceId = span.traceId.substring(0, 8);
            const spanId = span.spanId.substring(0, 8);
            
            console.log(
                `\x1b[36m[Trace]\x1b[0m \x1b[2m${traceId}:${spanId}\x1b[0m ` +
                `\x1b[1m${span.name}\x1b[0m ` +
                `\x1b[33m${duration}ms\x1b[0m ` +
                `\x1b[2m(node: ${span.tags?.nodeID || 'unknown'})\x1b[0m`
            );
        }
    }
}
