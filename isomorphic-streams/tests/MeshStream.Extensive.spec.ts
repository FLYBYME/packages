import { MeshStream } from '../src/core/MeshStream';
import { MeshError, ContextStack, IContext } from '@flybyme/isomorphic-core';
import { z } from 'zod';
import { jest, describe, it, expect } from '@jest/globals';

describe('MeshStream Extensive', () => {
    it('should propagate context in fromAsyncGenerator', async () => {
        const traceId = 'test-trace-id';
        const ctx: Partial<IContext> = { 
            id: '1', 
            traceId, 
            actionName: 'test', 
            params: {}, 
            meta: {}, 
            nodeID: 'node1', 
            spanId: 'span1',
            correlationID: 'c1',
            callerID: 'c2'
        };

        const chunks: string[] = [];
        const stream = new MeshStream<string>({
            onWrite: async (chunk) => {
                const currentCtx = ContextStack.getContext();
                expect(currentCtx?.traceId).toBe(traceId);
                chunks.push(chunk as string);
            }
        });

        async function* producer() {
            yield 'a';
            yield 'b';
        }

        await ContextStack.run(ctx as IContext, () => stream.fromAsyncGenerator(producer()));
        expect(chunks).toEqual(['a', 'b']);
    });

    it('should propagate context in fromObservable', async () => {
        const traceId = 'obs-trace-id';
        const ctx: Partial<IContext> = { 
            id: '2', 
            traceId, 
            actionName: 'test-obs', 
            params: {}, 
            meta: {}, 
            nodeID: 'node1', 
            spanId: 'span2',
            correlationID: 'c3',
            callerID: 'c4'
        };

        const chunks: string[] = [];
        const stream = new MeshStream<string>({
            onWrite: async (chunk) => {
                const currentCtx = ContextStack.getContext();
                expect(currentCtx?.traceId).toBe(traceId);
                chunks.push(chunk as string);
            }
        });

        const obs = {
            subscribe: (next: (val: string) => void, _error: (e: unknown) => void, complete: () => void) => {
                next('obs1');
                next('obs2');
                complete();
            }
        };

        await ContextStack.run(ctx as IContext, () => stream.fromObservable(obs));
        expect(chunks).toEqual(['obs1', 'obs2']);
    });

    it('should enforce writeTimeout', async () => {
        const stream = new MeshStream<string>({
            writeTimeout: 100 
        });

        stream.pause(); 

        const start = Date.now();
        await expect(stream.write('timeout-me')).rejects.toThrow(/write timeout/i);
        const duration = Date.now() - start;
        
        expect(duration).toBeGreaterThanOrEqual(100);
        expect(stream.status).toBe('ERROR');
    });

    it('should validate chunks against Zod schema', async () => {
        const schema = z.object({
            id: z.number(),
            val: z.string()
        });

        const onWrite = jest.fn() as unknown as (data: unknown) => Promise<void>;
        const stream = new MeshStream({ schema, onWrite });

        const validData = { id: 1, val: 'ok' };
        await stream.write(validData as any);
        expect(onWrite).toHaveBeenCalledWith(validData);

        const invalidData = { id: 'wrong', val: 123 };
        await expect(stream.write(invalidData as any)).rejects.toThrow();
    });

    it('should handle pause/resume correctly with multiple writes', async () => {
        const chunks: string[] = [];
        const stream = new MeshStream<string>({
            onWrite: async (c) => { chunks.push(c as string); }
        });

        stream.pause();
        const p1 = stream.write('1');
        const p2 = stream.write('2');

        expect(chunks).toEqual([]);
        stream.resume();
        await Promise.all([p1, p2]);
        expect(chunks).toEqual(['1', '2']);
    });

    it('should propagate errors from async generator to stream', async () => {
        const stream = new MeshStream<string>({});
        const streamErrorSpy = jest.fn();
        stream.on('error', (e) => streamErrorSpy(e));

        async function* failingProducer() {
            yield 'ok';
            throw new Error('generator-failure');
        }

        await expect(stream.fromAsyncGenerator(failingProducer())).rejects.toThrow('generator-failure');
        expect(stream.status).toBe('ERROR');
        expect(streamErrorSpy).toHaveBeenCalled();
    });

    it('should handle immediate end correctly', async () => {
        const onEnd = jest.fn() as unknown as () => Promise<void>;
        const stream = new MeshStream({ onEnd });
        await stream.end();
        expect(stream.status).toBe('CLOSED');
        expect(onEnd).toHaveBeenCalled();
    });

    it('should throw if writing to an error-state stream', async () => {
        const stream = new MeshStream({});
        await stream.error(new MeshError({ message: 'failed', code: 'FAIL', status: 500 }));
        await expect(stream.write('data')).rejects.toThrow('Cannot write to stream in ERROR state');
    });

    it('should support multiple concurrent writes when resumed', async () => {
        const writes: string[] = [];
        const stream = new MeshStream<string>({ onWrite: async (d) => { 
            await new Promise(r => setTimeout(r, 10));
            writes.push(d as string); 
        }});

        stream.pause();
        const p1 = stream.write('a');
        const p2 = stream.write('b');
        const p3 = stream.write('c');

        stream.resume();
        await Promise.all([p1, p2, p3]);
        expect(writes).toEqual(['a', 'b', 'c']);
    });

    it('should propagate context to subscribers in fromObservable', async () => {
        const traceId = 'sub-trace';
        const ctx: Partial<IContext> = { id: '3', traceId, meta: {} };
        const chunks: string[] = [];

        const stream = new MeshStream<string>({
            onWrite: async (c) => {
                expect(ContextStack.getContext()?.traceId).toBe(traceId);
                chunks.push(c as string);
            }
        });

        const obs = {
            subscribe: (next: (val: string) => void) => {
                next('val');
            }
        };

        await ContextStack.run(ctx as IContext, () => stream.fromObservable(obs));
        expect(chunks).toEqual(['val']);
    });
});
