import { ILogDrain } from './ILogDrain';

export interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
    context?: Record<string, unknown>;
    nodeID?: string;
    traceId?: string;
    spanId?: string;
    timestamp: number;
    internal?: boolean;
}

/**
 * LogDrainer — Orchestrator that manages multiple log drains.
 * Decouples log emission from specific output implementations (Console, Mesh, Disk).
 */
export class LogDrainer {
    private drains = new Map<string, ILogDrain>();

    constructor() {}

    /**
     * Register a new log drain.
     */
    public addDrain(drain: ILogDrain): void {
        this.drains.set(drain.name, drain);
    }

    /**
     * Remove a registered drain.
     */
    public removeDrain(name: string): void {
        this.drains.delete(name);
    }

    /**
     * Start all registered drains.
     */
    public start(): void {
        for (const drain of this.drains.values()) {
            if (drain.start) drain.start();
        }
    }

    /**
     * Stop all registered drains.
     */
    public async stop(): Promise<void> {
        await Promise.all(
            Array.from(this.drains.values()).map(drain => drain.stop ? drain.stop() : Promise.resolve())
        );
    }

    /**
     * Forward a log entry to all registered drains.
     */
    public drain(log: LogEntry): void {
        for (const drain of this.drains.values()) {
            drain.push(log);
        }
    }

    /**
     * Force all drains to flush their buffers.
     */
    public async flush(): Promise<void> {
        await Promise.all(
            Array.from(this.drains.values()).map(drain => drain.flush ? drain.flush() : Promise.resolve())
        );
    }
}
