import { ILogger } from '@flybyme/isomorphic-core';
import { TagSanitizer } from './TagSanitizer';
import { LogDrainer, LogEntry } from './LogDrainer';

/**
 * StructuredLogger — JSON-native logger that standardizes output across environments.
 */
export class StructuredLogger implements ILogger {
    private drainer: LogDrainer | null = null;

    constructor(
        private context: Record<string, unknown> = {},
        drainer?: LogDrainer,
        private level: number = 1 // Default to INFO
    ) {
        this.drainer = drainer || null;
    }

    public debug(msg: string, ...args: unknown[]): void {
        this.log('debug', msg, ...args);
    }

    public info(msg: string, ...args: unknown[]): void {
        this.log('info', msg, ...args);
    }

    public warn(msg: string, ...args: unknown[]): void {
        this.log('warn', msg, ...args);
    }

    public error(msg: string, ...args: unknown[]): void {
        this.log('error', msg, ...args);
    }

    public getLevel(): number {
        return this.level;
    }

    public child(context: Record<string, unknown>): ILogger {
        return new StructuredLogger({ ...this.context, ...context }, this.drainer || undefined, this.level);
    }

    /**
     * Internal log formatter and emitter.
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
        const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
        if (levels[level] < this.level) return;

        // Process variadic arguments into a single data object
        const mergedData: Record<string, unknown> = {};
        let _error: Error | undefined;
        let isInternal = false;

        for (const arg of args) {
            if (arg instanceof Error) {
                _error = arg;
                mergedData.error = arg.message;
                mergedData.stack = arg.stack;
            } else if (typeof arg === 'object' && arg !== null) {
                if ((arg as Record<string, unknown>).internal === true) isInternal = true;
                Object.assign(mergedData, arg);
            } else {
                // If it's a primitive, put it in an 'extra' array or just ignore if we want strict structured logs
                if (!mergedData.args) mergedData.args = [];
                (mergedData.args as unknown[]).push(arg);
            }
        }

        // Sanitize sensitive PII data before logging or draining.
        const sanitizedData = TagSanitizer.sanitize(mergedData);

        // Drain to registered drains (Console, Mesh, etc.)
        if (this.drainer) {
            const logEntry: LogEntry = {
                level,
                message,
                data: sanitizedData,
                context: this.context,
                timestamp: Date.now(),
                nodeID: this.context.nodeID as string | undefined,
                traceId: this.context.traceId as string | undefined,
                spanId: this.context.spanId as string | undefined,
                internal: isInternal
            };
            this.drainer.drain(logEntry);
        }
    }
}
