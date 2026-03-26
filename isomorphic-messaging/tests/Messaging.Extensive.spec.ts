import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MessagingPlugin } from '../src/MessagingPlugin';
import { TopicRouter } from '../src/core/TopicRouter';

describe('Messaging Extensive', () => {
    let broker: any;
    let plugin: MessagingPlugin;
    let registry: any;

    beforeEach(() => {
        registry = {
            getNode: jest.fn().mockReturnValue({ nodeID: 'node1', metadata: {} }),
            getNodes: jest.fn().mockReturnValue([{ nodeID: 'node1', metadata: { subscriptions: ['test.topic'] } }]),
            registerNode: jest.fn()
        };

        broker = {
            app: { 
                nodeID: 'node1', 
                getProvider: jest.fn().mockReturnValue(null) 
            },
            registry,
            logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
            on: jest.fn(),
            emit: jest.fn(),
            call: jest.fn<() => Promise<any>>(),
            executeRemote: jest.fn<() => Promise<any>>().mockResolvedValue({ success: true }),
            registerService: jest.fn()
        };

        plugin = new MessagingPlugin();
        plugin.onRegister(broker);

        // Wire up broker.call to TopicRouter.handleInbound for messaging.dispatch
        const router = (plugin as any).router as TopicRouter;
        broker.call.mockImplementation(async (action: string, params: any) => {
            if (action === 'messaging.dispatch') {
                return router.handleInbound(params);
            }
            return { success: true };
        });
    });

    it('should inject publish and subscribe into broker', () => {
        expect(broker.publish).toBeDefined();
        expect(broker.subscribe).toBeDefined();
        expect(broker.subscribeStream).toBeDefined();
    });

    it('should route message to subscribers in the mesh', async () => {
        registry.getNodes.mockReturnValue([{ nodeID: 'node2', metadata: { subscriptions: ['test.topic'] } }]);
        await broker.publish('test.topic', { foo: 'bar' });
        
        // TopicRouter should have queried registry and called remote dispatch
        expect(registry.getNodes).toHaveBeenCalled();
        expect(broker.executeRemote).toHaveBeenCalledWith(
            'node2', 
            'messaging.dispatch', 
            expect.objectContaining({ topic: 'test.topic', payload: { foo: 'bar' } })
        );
    });

    it('should handle local subscriptions via gossip', async () => {
        const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
        await broker.subscribe('local.topic', handler);
        
        // Should update registry with new metadata
        expect(registry.registerNode).toHaveBeenCalledWith(expect.objectContaining({
            metadata: expect.objectContaining({
                subscriptions: expect.arrayContaining(['local.topic'])
            })
        }));
    });

    it('should deduplicate messages using KV if available', async () => {
        const kvMock = {
            get: jest.fn<() => Promise<any>>().mockResolvedValue(null),
            set: jest.fn<() => Promise<any>>().mockResolvedValue({ success: true })
        };
        broker.app.getProvider.mockReturnValue(kvMock);

        const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
        await broker.subscribe('dedup.topic', handler);

        const envelope = {
            messageId: 'duplicate-1',
            topic: 'dedup.topic',
            payload: { data: 1 },
            producerId: 'node2',
            timestamp: Date.now()
        };

        // First delivery
        await broker.call('messaging.dispatch', envelope);
        expect(handler).toHaveBeenCalledTimes(1);

        // Second delivery (duplicate)
        kvMock.get.mockResolvedValueOnce({ value: true });
        await broker.call('messaging.dispatch', envelope);
        expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should support stream-based subscriptions', async () => {
        const stream = broker.subscribeStream('stream.topic');
        const dataPromise = new Promise(resolve => {
            stream.on('data', resolve);
        });

        await broker.call('messaging.dispatch', {
            messageId: 'msg-1',
            topic: 'stream.topic',
            payload: { hello: 'stream' },
            producerId: 'node2',
            timestamp: Date.now()
        });

        const received = await dataPromise;
        expect(received).toEqual({ hello: 'stream' });
    });
});
