import { z } from 'zod';
import { IMeshStream, StreamStatus, MeshError, ContextStack } from '@flybyme/isomorphic-core';
import { nanoid } from 'nanoid';
import { EventEmitter } from 'eventemitter3';

export interface StreamOptions {
    id?: string;
    schema?: z.ZodTypeAny;
    writeTimeout?: number;
    onWrite?: (data: unknown) => Promise<void>;
    onEnd?: () => Promise<void>;
    onError?: (err: MeshError) => Promise<void>;
}

/**
 * MeshStream — implementation of backpressure-aware distributed streams.
 */
export class MeshStream<TResult = unknown> extends EventEmitter implements IMeshStream<TResult> {
    public readonly id: string;
    private _status: StreamStatus = 'OPEN';
    private deferredAck: { resolve: () => void, reject: (err: Error) => void, promise: Promise<void> } | null = null;
    private writeTimeout: number;

    constructor(private options: StreamOptions) {
        super();
        this.id = options.id || nanoid();
        this.writeTimeout = options.writeTimeout || 10000; // Default 10s
    }

    public get status(): StreamStatus {
        return this._status;
    }

    /**
     * Sends data down the stream.
     * Respects backpressure by awaiting the next STREAM_ACK.
     */
    public async write(data: TResult): Promise<void> {
        if (this._status === 'CLOSED' || this._status === 'ERROR') {
            throw new Error(`Cannot write to stream in ${this._status} state`);
        }

        // Task: Use stream.schema to validate every chunk
        if (this.options.schema) {
            data = this.options.schema.parse(data);
        }

        // 1. Wait for ACK if we are in PAUSED state (backpressure)
        if (this._status === 'PAUSED' || this.deferredAck) {
            if (!this.deferredAck) {
                let resolve!: () => void;
                let reject!: (err: Error) => void;
                const promise = new Promise<void>((res, rej) => {
                    resolve = res;
                    reject = rej;
                });
                this.deferredAck = { resolve, reject, promise };
            }

            const timeout = setTimeout(() => {
                if (this.deferredAck) {
                    const err = new MeshError({ 
                        message: `Stream write timeout after ${this.writeTimeout}ms`, 
                        code: 'STREAM_WRITE_TIMEOUT', 
                        status: 408 
                    });
                    this.deferredAck.reject(err);
                    this.error(err);
                }
            }, this.writeTimeout);

            try {
                await this.deferredAck.promise;
            } finally {
                clearTimeout(timeout);
            }
        }

        // 2. Trigger the actual network/handler write
        if (this.options.onWrite) {
            await this.options.onWrite(data);
        }
    }

    /**
     * fromAsyncGenerator — Bridges an async generator into the stream.
     * Task: Preserve ContextStack across iteration boundaries.
     */
    public async fromAsyncGenerator(generator: AsyncIterableIterator<TResult>): Promise<void> {
        const capturedCtx = ContextStack.getContext();
        try {
            for await (const chunk of generator) {
                if (capturedCtx) {
                    await ContextStack.run(capturedCtx, () => this.write(chunk));
                } else {
                    await this.write(chunk);
                }
            }
            await this.end();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const meshErr = new MeshError({ message, code: 'GENERATOR_ERROR', status: 500 });
            await this.error(meshErr);
            throw meshErr;
        }
    }

    /**
     * fromObservable — Bridges an observable-like object.
     */
    public fromObservable(observable: { subscribe: (cb: (val: TResult) => void, err: (e: unknown) => void, complete: () => void) => unknown }): void {
        const capturedCtx = ContextStack.getContext();
        observable.subscribe(
            (val) => {
                if (capturedCtx) {
                    ContextStack.run(capturedCtx, () => this.write(val));
                } else {
                    this.write(val);
                }
            },
            (err) => {
                const message = err instanceof Error ? err.message : String(err);
                this.error(new MeshError({ message, code: 'OBSERVABLE_ERROR', status: 500 }));
            },
            () => this.end()
        );
    }

    /**
     * Internal: Called when a STREAM_ACK is received from the consumer.
     */
    public resume(): void {
        this._status = 'OPEN';
        if (this.deferredAck) {
            this.deferredAck.resolve();
            this.deferredAck = null;
        }
        this.emit('resume');
    }

    /**
     * Internal: Called when consumer buffer is full.
     */
    public pause(): void {
        this._status = 'PAUSED';
        this.emit('pause');
    }

    public async end(): Promise<void> {
        this._status = 'CLOSED';
        if (this.options.onEnd) {
            await this.options.onEnd();
        }
        this.emit('end');
        this.removeAllListeners();
    }

    public async error(err: MeshError): Promise<void> {
        this._status = 'ERROR';
        if (this.deferredAck) {
            this.deferredAck.reject(err);
            this.deferredAck = null;
        }
        if (this.options.onError) {
            await this.options.onError(err);
        }
        this.emit('error', err);
        this.removeAllListeners();
    }

    /**
     * Internal: Triggered by incoming STREAM_DATA packets.
     */
    public push(data: TResult): void {
        this.emit('data', data);
    }
}
