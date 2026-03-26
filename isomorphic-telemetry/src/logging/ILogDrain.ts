import { LogEntry } from './LogDrainer';

/**
 * ILogDrain — Interface for entities that consume and persist/output logs.
 * Examples: Console, Disk, Mesh Network, ElasticSearch.
 */
export interface ILogDrain {
    /**
     * Unique identifier for the drain.
     */
    readonly name: string;

    /**
     * Consume a log entry.
     */
    push(entry: LogEntry): void;

    /**
     * Start background processes (timers, etc.).
     */
    start?(): void;

    /**
     * Force immediate flush of buffered logs.
     */
    flush?(): Promise<void>;

    /**
     * Stop background processes and cleanup.
     */
    stop?(): Promise<void>;
}
