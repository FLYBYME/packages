import { IBrokerPlugin, IServiceBroker, MeshError, ILogger, SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';
import { MeshStream } from '../core/MeshStream';

/**
 * StreamInfo — Metadata for active streams tracked by the plugin.
 */
interface StreamInfo {
    stream: MeshStream;
    targetNodeID: string;
    lastActivity: number;
}

/**
 * StreamPlugin — Integrates distributed streams into the ServiceBroker.
 */
export class StreamPlugin implements IBrokerPlugin {
    public readonly name = 'stream-plugin';
    private streams = new Map<string, StreamInfo>();
    private broker!: IServiceBroker;
    private logger!: ILogger;
    
    private readonly HEARTBEAT_TIMEOUT = 30000;
    private readonly IDLE_TTL = 300000; // 5 minutes idle TTL
    private cleanupTimer?: TimerHandle;

    onRegister(broker: IServiceBroker): void {
        this.broker = broker;
        this.logger = broker.app.logger;
        
        // Register as provider for other modules to use
        broker.app.registerProvider('streams', this);
        
        // Register packet handlers for stream types
        this.broker.on('$stream.open', (_packet: unknown) => this.handleOpen(_packet));
        this.broker.on('$stream.data', (packet: unknown) => this.handleData(packet));
        this.broker.on('$stream.ack', (packet: unknown) => this.handleAck(packet));
        this.broker.on('$stream.close', (packet: unknown) => this.handleClose(packet));
        this.broker.on('$stream.error', (packet: unknown) => this.handleError(packet));

        // Start idle cleanup
        this.cleanupTimer = setInterval(() => this.cleanupIdleStreams(), 60000);
        SafeTimer.unref(this.cleanupTimer);
    }

    async onStart(): Promise<void> { }

    async onStop(): Promise<void> {
        if (this.cleanupTimer) {
            SafeTimer.clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        for (const info of this.streams.values()) {
            await info.stream.end();
        }
        this.streams.clear();
    }

    /**
     * Create a new stream handle for a local action.
     */
    public createStream<TResult = unknown>(options: { id?: string, targetNodeID: string }): MeshStream<TResult> {
        const stream = new MeshStream<TResult>({
            id: options.id,
            onWrite: async (data) => {
                await this.broker.emit('$stream.data', {
                    streamID: stream.id,
                    data, // Per policy: treat as Uint8Array if binary
                    targetNodeID: options.targetNodeID,
                    type: 'STREAM_DATA'
                });
                this.updateActivity(stream.id);
            },
            onEnd: async () => {
                await this.broker.emit('$stream.close', {
                    streamID: stream.id,
                    targetNodeID: options.targetNodeID,
                    type: 'STREAM_CLOSE'
                });
                this.removeStream(stream.id);
            },
            onError: async (err) => {
                const errorCode = (err as unknown as Record<string, unknown>).code as string || 'STREAM_ERROR';
                await this.broker.emit('$stream.error', {
                    streamID: stream.id,
                    error: { message: err.message, code: errorCode },
                    targetNodeID: options.targetNodeID,
                    type: 'STREAM_ERROR'
                });
                this.removeStream(stream.id);
            }
        });

        this.registerStream(stream as unknown as MeshStream, options.targetNodeID);
        return stream;
    }

    private registerStream(stream: MeshStream, targetNodeID: string): void {
        this.streams.set(stream.id, {
            stream,
            targetNodeID,
            lastActivity: Date.now()
        });
    }

    private removeStream(id: string): void {
        this.streams.delete(id);
    }

    private updateActivity(id: string): void {
        const info = this.streams.get(id);
        if (info) {
            info.lastActivity = Date.now();
        }
    }

    private cleanupIdleStreams(): void {
        const now = Date.now();
        for (const [id, info] of this.streams.entries()) {
            if (now - info.lastActivity > this.IDLE_TTL) {
                this.logger.warn(`[StreamPlugin] Closing idle stream ${id} (last activity: ${new Date(info.lastActivity).toISOString()})`);
                info.stream.error(new MeshError({ 
                    message: 'Stream closed due to inactivity', 
                    code: 'STREAM_IDLE_TIMEOUT', 
                    status: 408 
                }));
                this.removeStream(id);
            }
        }
    }

    private handleOpen(_packet: unknown): void {
        // Handled by the specific service action that returns a stream
    }

    private handleData(packet: unknown): void {
        const p = packet as { streamID: string, data: unknown, senderNodeID: string };
        const info = this.streams.get(p.streamID);
        
        if (info) {
            // Task: Implement Stream Security (Validate sender)
            if (info.targetNodeID !== p.senderNodeID) {
                this.logger.error(`[StreamPlugin] Security Violation: Node ${p.senderNodeID} tried to inject data into stream ${p.streamID} owned by ${info.targetNodeID}`);
                return;
            }

            info.stream.push(p.data);
            this.updateActivity(p.streamID);
            
            // Auto-ACK for now
            this.broker.emit('$stream.ack', {
                streamID: p.streamID,
                targetNodeID: p.senderNodeID,
                type: 'STREAM_ACK'
            });
        }
    }

    private handleAck(packet: unknown): void {
        const p = packet as { streamID: string, senderNodeID: string };
        const info = this.streams.get(p.streamID);
        if (info) {
            if (info.targetNodeID !== p.senderNodeID) return;
            info.stream.resume();
            this.updateActivity(p.streamID);
        }
    }

    private handleClose(packet: unknown): void {
        const p = packet as { streamID: string, senderNodeID: string };
        const info = this.streams.get(p.streamID);
        if (info) {
            if (info.targetNodeID !== p.senderNodeID) return;
            info.stream.end();
        }
    }

    private handleError(packet: unknown): void {
        const p = packet as { streamID: string, senderNodeID: string, error: { message: string, code: string } };
        const info = this.streams.get(p.streamID);
        if (info) {
            if (info.targetNodeID !== p.senderNodeID) return;
            info.stream.error(new MeshError({ message: p.error.message, code: p.error.code, status: 500 }));
        }
    }
}
