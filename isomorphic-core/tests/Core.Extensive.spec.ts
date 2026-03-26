import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { ServiceBroker } from '../src/core/ServiceBroker';
import { ContextStack } from '../src/core/ContextStack';
import { MeshApp } from '../src/core/MeshApp';
import { IContext, IMiddleware, IMeshApp } from '../src/interfaces';

declare module '../src/interfaces' {
    export interface IServiceActionRegistry {
        'test.hello': { params: any, returns: any };
    }
    export interface IServiceEventRegistry {
        'test-event': any;
    }
}

describe('@flybyme/isomorphic-core Extensive', () => {
    describe('ServiceBroker Pipeline', () => {
        let broker: ServiceBroker;
        let mockApp: Partial<IMeshApp>;

        beforeEach(() => {
            mockApp = {
                nodeID: 'node1',
                getProvider: jest.fn().mockImplementation(p => {
                    if (p === 'logger') return { warn: jest.fn(), error: jest.fn(), info: jest.fn() };
                    return null;
                }) as any,
                config: { rpcTimeout: 1000 } as any
            };
            broker = new ServiceBroker(mockApp as IMeshApp);
        });

        it('should execute Global and Local middleware in order', async () => {
            const executionOrder: string[] = [];
            const mw1: IMiddleware = async (ctx, next) => {
                executionOrder.push('global-start');
                const res = await next();
                executionOrder.push('global-end');
                return res;
            };
            const mw2: IMiddleware = async (ctx, next) => {
                executionOrder.push('local');
                return await next();
            };

            broker.use(mw1);
            broker.useLocal(mw2);

            broker.registerService({
                name: 'test',
                actions: {
                    hello: {
                        handler: async () => 'world',
                        params: z.any(),
                        returns: z.any()
                    }
                }
            });

            await broker.call('test.hello', {});

            expect(executionOrder).toEqual(['global-start', 'local', 'global-end']);
        });

        it('should bypass Local middleware for remote calls', async () => {
            const localMwCalled = jest.fn();
            broker.useLocal(async (ctx, next) => {
                localMwCalled();
                return await next();
            });

            // Mock remote execution
            (broker as any).executeRemote = jest.fn<() => Promise<any>>().mockResolvedValue('remote-res');

            const ctx: Partial<IContext<any, any>> = {
                actionName: 'other.action',
                targetNodeID: 'node2',
                params: {},
                meta: {}
            };

            await (broker as any).handlePipeline(ctx as IContext<any, any>);
            expect(localMwCalled).not.toHaveBeenCalled();
            expect((broker as any).executeRemote).toHaveBeenCalled();
        });
    });

    describe('ContextStack', () => {
        it('should inherit properties from parent context', async () => {
            const parent: Partial<IContext<any, any>> = { traceId: 't1', meta: { uid: 'u1' } };
            
            await ContextStack.run(parent as IContext<any, any>, async () => {
                const child: Partial<IContext<any, any>> = { spanId: 's2', meta: { extra: 'true' } };
                
                await ContextStack.run(child as IContext<any, any>, () => {
                    const current = ContextStack.getContext();
                    expect(current?.spanId).toBe('s2');
                });
            });
        });
    });

    describe('MeshApp DI', () => {
        it('should resolve providers and trigger onInit', async () => {
            const app = new MeshApp({ nodeID: 'test-app' });
            const mockModule = {
                onInit: jest.fn()
            };

            app.use(mockModule as any);
            await app.start();

            expect(mockModule.onInit).toHaveBeenCalledWith(app);
        });

        it('should throw for non-existent providers', () => {
            const app = new MeshApp({ nodeID: 'test-app' });
            expect(() => app.getProvider('ghost')).toThrow();
        });
    });

    describe('ServiceBroker Communication', () => {
        let broker: ServiceBroker;
        let mockApp: Partial<IMeshApp>;

        beforeEach(() => {
            mockApp = {
                nodeID: 'node1',
                getProvider: jest.fn() as any,
                config: { rpcTimeout: 50 } as any
            };
            broker = new ServiceBroker(mockApp as IMeshApp);
        });

        it('should handle RPC timeouts correctly', async () => {
            broker.setNetwork({
                send: jest.fn<() => Promise<any>>().mockResolvedValue(undefined as any),
                onMessage: jest.fn()
            } as any);

            await expect(broker.executeRemote('node2', 'action', {})).rejects.toThrow(/RPC Timeout/i);
        });

        it('should emit and receive events via network', async () => {
            const mockNetwork = {
                send: jest.fn(),
                onMessage: jest.fn()
            };
            broker.setNetwork(mockNetwork as any);

            const handler = jest.fn();
            broker.on('test-event', handler);

            expect(mockNetwork.onMessage).toHaveBeenCalledWith('test-event', expect.any(Function));
            
            broker.emit('test-event', { hello: 'world' });
            expect(mockNetwork.send).toHaveBeenCalledWith('*', 'test-event', { hello: 'world' });
        });
    });
});
