import { CircuitBreakerInterceptor } from '../src/interceptors/CircuitBreakerInterceptor';
import { RateLimitInterceptor } from '../src/interceptors/RateLimitInterceptor';
import { LocalResiliencyAdapter } from '../src/adapters/LocalResiliencyAdapter';
import { MeshPacket } from '@flybyme/isomorphic-mesh';
import { ResiliencyError } from '@flybyme/isomorphic-core';

describe('Resiliency Interceptors (Refined)', () => {
    let adapter: LocalResiliencyAdapter;

    beforeEach(() => {
        adapter = new LocalResiliencyAdapter();
    });

    describe('CircuitBreakerInterceptor', () => {
        let cb: CircuitBreakerInterceptor;

        beforeEach(() => {
            cb = new CircuitBreakerInterceptor({
                threshold: 2,
                resetTimeout: 100, // Short timeout for testing
                adapter
            });
        });

        test('should trip circuit and allow only one probe during HALF_OPEN', async () => {
            const errorPacket: MeshPacket = {
                type: 'RESPONSE_ERROR',
                senderNodeID: 'node-b',
                id: '1', topic: 't', timestamp: Date.now(), error: { message: 'fail' }
            } as unknown as MeshPacket;

            const requestPacket: MeshPacket = {
                type: 'REQUEST',
                id: 'req-1', topic: 't', timestamp: Date.now(), data: {},
                meta: { targetNodeID: 'node-b' }
            } as unknown as MeshPacket;

            // Trip it
            await cb.onInbound(errorPacket);
            await cb.onInbound(errorPacket);
            
            await expect(cb.onOutbound(requestPacket)).rejects.toThrow(ResiliencyError);

            // Wait for reset timeout
            await new Promise(r => setTimeout(r, 150));

            // First request should become the probe (HALF_OPEN)
            const probeReq = { ...requestPacket, id: 'probe-req' };
            await expect(cb.onOutbound(probeReq)).resolves.toBe(probeReq);

            // Second request during probing should be rejected
            const secondReq = { ...requestPacket, id: 'second-req' };
            await expect(cb.onOutbound(secondReq)).rejects.toThrow('probing in progress');

            // If probe fails, it should go back to OPEN
            await cb.onInbound({ ...errorPacket, id: 'probe-fail' });
            await expect(cb.onOutbound(requestPacket)).rejects.toThrow('Circuit is OPEN');
        });

        test('should close circuit if probe succeeds', async () => {
            const errorPacket: MeshPacket = {
                type: 'RESPONSE_ERROR',
                senderNodeID: 'node-b',
                id: '1', topic: 't', timestamp: Date.now(), error: { message: 'fail' }
            } as unknown as MeshPacket;

            // Trip it
            await cb.onInbound(errorPacket);
            await cb.onInbound(errorPacket);

            // Wait for reset
            await new Promise(r => setTimeout(r, 150));

            // Probe request
            const probeReq: MeshPacket = {
                type: 'REQUEST', id: 'probe', topic: 't', timestamp: Date.now(), data: {},
                meta: { targetNodeID: 'node-b' }
            } as unknown as MeshPacket;
            await cb.onOutbound(probeReq);

            // Probe success
            const successPacket: MeshPacket = {
                type: 'RESPONSE', senderNodeID: 'node-b', id: 'probe', topic: 't', timestamp: Date.now(), data: {}
            } as unknown as MeshPacket;
            await cb.onInbound(successPacket);

            // Now it should be CLOSED and allow multiple requests
            await expect(cb.onOutbound(probeReq)).resolves.toBeDefined();
            await expect(cb.onOutbound({ ...probeReq, id: 'another' })).resolves.toBeDefined();
        });
    });

    describe('RateLimitInterceptor', () => {
        let rl: RateLimitInterceptor;

        beforeEach(() => {
            rl = new RateLimitInterceptor({
                windowMs: 1000,
                limit: 1,
                adapter
            });
        });

        test('should throw ResiliencyError with 429 status', async () => {
            const req: MeshPacket = {
                type: 'REQUEST',
                senderNodeID: 'user-1',
                id: '1', topic: 't', timestamp: Date.now(), data: {}
            } as unknown as MeshPacket;

            await rl.onInbound(req);
            
            try {
                await rl.onInbound(req);
                fail('Should have thrown');
            } catch (e: any) {
                expect(e).toBeInstanceOf(ResiliencyError);
                expect(e.status).toBe(429);
                expect(e.code).toBe('TOO_MANY_REQUESTS');
            }
        });
    });
});
