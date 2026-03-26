import { IServiceBroker, IMeshApp, SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';
import { TelemetryPacket } from '@flybyme/isomorphic-mesh';
import { nanoid } from 'nanoid';
import { ILogDrain } from '../ILogDrain';
import { LogEntry } from '../LogDrainer';

/**
 * MeshLogDrain — Buffers sanitized logs and flushes them over the mesh in batches.
 * Sends logs to the Gateway or other telemetry sinks.
 */
export class MeshLogDrain implements ILogDrain {
    public readonly name = 'mesh';
    private buffer: LogEntry[] = [];
    private readonly batchSize: number;
    private readonly flushInterval: number;
    private timer?: TimerHandle;
    private broker: IServiceBroker | null = null;

    constructor(
        private app: IMeshApp,
        options: { batchSize?: number; flushIntervalMs?: number } = {}
    ) {
        this.batchSize = options.batchSize || 1;
        this.flushInterval = options.flushIntervalMs || 5000;
    }

    public start(): void {
        if (this.timer) return;
        this.timer = setInterval(() => this.flush(), this.flushInterval);
        SafeTimer.unref(this.timer);
        
        try {
            this.broker = this.app.getProvider<IServiceBroker>('broker');
        } catch {
            // Broker may be registered later.
        }
    }

    public async stop(): Promise<void> {
        if (this.timer) {
            SafeTimer.clearInterval(this.timer);
            this.timer = undefined;
        }
        await this.flush();
    }

    public push(log: LogEntry): void {
        if (log.internal) return;
        this.buffer.push(log);
        if (this.buffer.length >= this.batchSize) {
            this.flush();
        }
    }

    public async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        if (!this.broker || !this.broker.network) {
            try {
                this.broker = this.app.getProvider<IServiceBroker>('broker');
                if (!this.broker?.network) return;
            } catch {
                return; 
            }
        }

        const logsToFlush = [...this.buffer];
        this.buffer = [];

        const packet: TelemetryPacket = {
            id: nanoid(),
            nodeID: this.app.nodeID,
            timestamp: Date.now(),
            type: 'log_batch',
            payload: {
                type: 'log_batch',
                entries: logsToFlush
            }
        };

        try {
            this.app.logger.debug(`Flushing ${logsToFlush.length} logs to mesh`, { internal: true });
            await this.broker.network.publish('$telemetry.logs', packet);
        } catch (err: unknown) {
            // We log via console here because the main logger might be broken if the drain fails.
            // This also avoids infinite recursion.
            console.error('[MeshLogDrain] Failed to flush telemetry batch:', err);
        }
    }
}
