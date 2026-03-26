import { createMeshApp, IServiceBroker, ServiceBroker } from '@flybyme/isomorphic-core';
import { MeshNetwork } from '../src/core/MeshNetwork';
import { NetworkPlugin } from '../src/NetworkPlugin';
import { RoutingInterceptor } from '../src/interceptors/RoutingInterceptor';
import { MockTransport } from '../src/transports/MockTransport';
import { JSONSerializer } from '../src/serializers/JSONSerializer';
import { TaskWorkerService } from '../../mesh-tasker/src/services/TaskWorker.service';

describe('Advanced Routing & Deduplication', () => {

    let gatewayNetwork: MeshNetwork | undefined;
    let workerNetwork: MeshNetwork | undefined;
    let browserNetwork: MeshNetwork | undefined;

    const createDummyRegistry = (nodeId: string) => ({
        on: jest.fn(), 
        emit: jest.fn(), 
        getNode: jest.fn().mockReturnValue({ nodeID: nodeId, addresses: [], services: [] }), 
        getNodes: () => [], 
        getAvailableNodes: jest.fn().mockReturnValue([]),
        registerNode: jest.fn(), 
        unregisterNode: jest.fn(), 
        heartbeat: jest.fn(),
        registerService: jest.fn(), 
        unregisterService: jest.fn(), 
        listServices: () => [], 
        findService: jest.fn(),
        selectNode: jest.fn(), 
        hasLocalAction: jest.fn()
    } as any);

    const createDummyLogger = () => ({
        debug: jest.fn(), 
        info: jest.fn(), 
        warn: jest.fn(), 
        error: jest.fn(), 
        child: jest.fn().mockReturnThis()
    } as any);

    afterEach(async () => {
        if (gatewayNetwork) await gatewayNetwork.stop();
        if (workerNetwork) await workerNetwork.stop();
        if (browserNetwork) await browserNetwork.stop();
        gatewayNetwork = undefined;
        workerNetwork = undefined;
        browserNetwork = undefined;
        jest.useRealTimers();
    });

    test('Phase 1: LRU Packet Deduplication with TTL and Expiration', async () => {
        jest.useFakeTimers();
        let now = 1000000;
        const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

        const logger = createDummyLogger();
        const registry = createDummyRegistry('test-node');
        const network = new MeshNetwork({
            nodeId: 'test-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, logger, registry);

        await network.start();

        const handlePacket = jest.fn();
        network.onMessage('test.topic', handlePacket);

        const packet = { 
            topic: 'test.topic', 
            data: {}, 
            id: 'pk-1', 
            type: 'EVENT', 
            senderNodeID: 'sender',
            timestamp: now,
            version: 1,
            priority: 1,
            meta: {}
        };

        // 1. Initial Receive
        network.transport.emit('packet', packet);
        await Promise.resolve();
        expect(handlePacket).toHaveBeenCalledTimes(1);

        // 2. Immediate Duplicate (Dropped)
        network.transport.emit('packet', packet);
        await Promise.resolve();
        expect(handlePacket).toHaveBeenCalledTimes(1);

        // 3. Wait for TTL (10s)
        now += 11000;
        jest.advanceTimersByTime(11000);
        
        // 4. Receive again after expiration (Accepted)
        network.transport.emit('packet', { ...packet, timestamp: now });
        await Promise.resolve();
        expect(handlePacket).toHaveBeenCalledTimes(2);

        await network.stop();
        dateSpy.mockRestore();
    });

    test('Phase 2: Standardized Event Flooding (Cycle Detection & Bounce Prevention)', async () => {
        const logger = createDummyLogger();
        
        // Node A, B, C in a triangle
        const registryA = createDummyRegistry('node-A');
        const registryB = createDummyRegistry('node-B');
        
        registryA.getAvailableNodes.mockReturnValue([
            { nodeID: 'node-B' },
            { nodeID: 'node-C' }
        ]);

        const transportA = new MockTransport(new JSONSerializer());
        const sendSpy = jest.spyOn(transportA, 'send');

        const networkA = new MeshNetwork({
            nodeId: 'node-A',
            transports: [transportA]
        }, logger, registryA);

        await networkA.start();

        // Simulate receiving an event from B
        const packetFromB = {
            topic: 'event.broadcast',
            data: {},
            id: 'evt-1',
            type: 'EVENT',
            senderNodeID: 'node-B',
            timestamp: Date.now(),
            version: 1,
            priority: 1,
            meta: { ttl: 5, path: ['node-B'] }
        };

        networkA.transport.emit('packet', packetFromB);
        await Promise.resolve();

        // Should forward to C, but NOT back to B, and NOT to itself.
        expect(sendSpy).toHaveBeenCalledWith('node-C', expect.objectContaining({
            meta: expect.objectContaining({
                ttl: 4,
                path: ['node-B', 'node-A']
            })
        }));

        const targetNodes = sendSpy.mock.calls.map(call => call[0]);
        expect(targetNodes).not.toContain('node-B');
        expect(targetNodes).not.toContain('node-A');

        await networkA.stop();
    });

    test('Phase 3: RPC Proxying - ID Reuse and Response Correlation', async () => {
        const gwLogger = createDummyLogger();
        const gwRegistry = createDummyRegistry('gateway-node');
        gatewayNetwork = new MeshNetwork({
            nodeId: 'gateway-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, gwLogger, gwRegistry);

        const gwApp = { nodeID: 'gateway-node', logger: gwLogger, config: { rpcTimeout: 5000 }, getProvider: (k: string) => k === 'registry' ? gwRegistry : undefined } as any;
        const gatewayBroker = new ServiceBroker(gwApp);
        const gwPlugin = new NetworkPlugin(gatewayNetwork);
        gwPlugin.onRegister(gatewayBroker);

        const wkLogger = createDummyLogger();
        const wkRegistry = createDummyRegistry('worker-node');
        workerNetwork = new MeshNetwork({
            nodeId: 'worker-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, wkLogger, wkRegistry);

        await gatewayNetwork.start();
        await workerNetwork.start();

        const gatewaySendSpy = jest.spyOn(gatewayNetwork.transport, 'send');

        const browserRequestId = 'browser-req-123';
        const browserPacket = {
            topic: 'tasks.get',
            data: { id: 'task-1' },
            id: browserRequestId,
            type: 'REQUEST',
            senderNodeID: 'browser-node',
            timestamp: Date.now(),
            meta: { finalDestinationID: 'worker-node' }
        };

        gatewayNetwork.transport.emit('packet', browserPacket);
        await new Promise(r => setTimeout(r, 50));

        // Verify Gateway proxied to Worker reusing the browserRequestId
        expect(gatewaySendSpy).toHaveBeenCalledWith('worker-node', expect.objectContaining({
            id: browserRequestId,
            meta: expect.objectContaining({ correlationID: browserRequestId })
        }));

        const workerResponse = {
            topic: '$rpc.response',
            data: { title: 'Test Task' },
            id: browserRequestId,
            type: 'RESPONSE',
            senderNodeID: 'worker-node',
            timestamp: Date.now(),
            meta: { correlationID: browserRequestId }
        };

        gatewayNetwork.transport.emit('packet', workerResponse);
        await new Promise(r => setTimeout(r, 50));

        // Verify Gateway sent response back to Browser with original ID
        expect(gatewaySendSpy).toHaveBeenCalledWith('browser-node', expect.objectContaining({
            id: browserRequestId,
            type: 'RESPONSE',
            data: { title: 'Test Task' }
        }));
    });

    test('Phase 4: Backend Idempotency in TaskWorkerService', async () => {
        const logger = createDummyLogger();
        const service = new TaskWorkerService(logger);
        
        const mockTask = { id: 't1', status: 'active', title: 'Task 1' };
        (service as any).db = {
            findById: jest.fn().mockResolvedValue(mockTask),
            update: jest.fn().mockResolvedValue(true)
        };

        const ctx = {
            params: { id: 't1', expectedStatus: 'active' },
            emit: jest.fn()
        } as any;

        await service.toggleStatus(ctx);
        expect((service as any).db.update).toHaveBeenCalled();
        expect(ctx.emit).toHaveBeenCalledWith('tasks.updated', expect.anything());

        jest.clearAllMocks();
        const ctx2 = {
            params: { id: 't1', expectedStatus: 'active' },
            emit: jest.fn()
        } as any;
        
        (service as any).db.findById.mockResolvedValue({ id: 't1', status: 'completed' });
        
        const result = await service.toggleStatus(ctx2);
        expect((service as any).db.update).not.toHaveBeenCalled();
        expect(ctx2.emit).not.toHaveBeenCalled();
        expect(result.status).toBe('completed');
    });
});
