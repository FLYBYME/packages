import { IServiceBroker, IMeshApp } from '@flybyme/isomorphic-core';
import { TelemetryPacketSchema } from '@flybyme/isomorphic-mesh';
import { LogEntry } from './LogDrainer';

/**
 * LogImporter — Listens to $telemetry.logs and ingests the validated payloads.
 * Configured on "Sink" nodes. Adheres to strict type safety and batch processing.
 */
export class LogImporter {
    private broker: IServiceBroker | null = null;

    constructor(private app: IMeshApp) {}

    /**
     * Start listening for remote logs.
     */
    public start(): void {
        const connect = () => {
            try {
                this.broker = this.app.getProvider<IServiceBroker>('broker');
                if (this.broker && this.broker.network) {
                    this.setupListener();
                } else {
                    setTimeout(connect, 1000);
                }
            } catch {
                setTimeout(connect, 1000);
            }
        };
        connect();
    }

    private setupListener(): void {
        if (!this.broker) return;

        this.app.logger.info('LogImporter listening for $telemetry.logs', { internal: true });

        // Subscribe to the reserved mesh topic for telemetry logs.
        this.broker.network.onMessage('$telemetry.logs', async (data: unknown) => {
            try {
                // Strictly validate the incoming telemetry packet via Zod.
                const packet = TelemetryPacketSchema.parse(data);
                
                if (packet.type === 'log') {
                    // Legacy single log support (if any)
                    this.ingest(packet.nodeID, packet.payload as unknown as LogEntry);
                } else if (packet.type === 'log_batch') {
                    // Batch processing as per the new strictly-typed plan.
                    const batch = packet.payload as unknown as { entries: LogEntry[] };
                    for (const entry of batch.entries) {
                        this.ingest(packet.nodeID, entry);
                    }
                }
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                this.app.logger.error('[LogImporter] Validation failed for telemetry packet', { 
                    error: error.message,
                    internal: true 
                });
            }
        });
    }

    /**
     * Write the validated log payload to cold storage.
     */
    private ingest(nodeID: string, log: LogEntry): void {
        // Skip internal logs in the telemetry dump too if they are just noise
        if (log.internal || log.data?.internal === true) return;

        // Extract metadata for pretty printing
        const ctx = log.context || {};
        const component = ctx.component || 'unknown';
        const level = log.level.toUpperCase().padEnd(5);
        
        // Formatted for immediate visibility in the Gateway terminal
        let dataStr = '';
        if (log.data && Object.keys(log.data).length > 0) {
            try {
                dataStr = ` \x1b[2m${JSON.stringify(log.data)}\x1b[0m`;
            } catch {
                dataStr = ' [Circular Data]';
            }
        }

        process.stdout.write(
            `\x1b[35m[TELEMETRY]\x1b[0m \x1b[32m[${nodeID}]\x1b[0m \x1b[36m[${component}]\x1b[0m ` +
            `${level} ${log.message}${dataStr}\n`
        );
    }
}
