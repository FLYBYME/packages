import { createMeshApp, IServiceBroker, ServiceBroker, ILogger } from '@flybyme/isomorphic-core';
import { MeshNetwork } from '../src/core/MeshNetwork';
import { NetworkPlugin } from '../src/NetworkPlugin';
import { RoutingInterceptor } from '../src/interceptors/RoutingInterceptor';
import { WorkerProxyInterceptor } from '../src/interceptors/WorkerProxyInterceptor';
import { MockTransport } from '../src/transports/MockTransport';
import { JSONSerializer } from '../src/serializers/JSONSerializer';

describe('Routing Deduplication', () => {

    let gatewayApp: any;
    let gatewayBroker: IServiceBroker;
    let gatewayNetwork: MeshNetwork;

    let browserApp: any;
    let browserBroker: IServiceBroker;
    let browserNetwork: MeshNetwork;

    let workerApp: any;
    let workerBroker: IServiceBroker;
    let workerNetwork: MeshNetwork;

    afterEach(async () => {
        if (browserApp) await browserApp.stop();
        if (workerApp) await workerApp.stop();
        if (gatewayApp) await gatewayApp.stop();
    });

    test('Unit Test: Packet "Seen" Cache in MeshNetwork', async () => {
        const dummyLogger: ILogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1),
            child: jest.fn().mockReturnThis()
        };

        const dummyRegistry = {
            getNode: jest.fn(),
            getNodes: jest.fn().mockReturnValue([]),
            getAvailableNodes: jest.fn().mockReturnValue([]),
            registerNode: jest.fn(),
            unregisterNode: jest.fn(),
            heartbeat: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            registerService: jest.fn(),
            unregisterService: jest.fn(),
            listServices: jest.fn(),
            findService: jest.fn()
        } as any;

        const network = new MeshNetwork({
            nodeId: 'test-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, dummyLogger, dummyRegistry);

        await network.start();

        const handlePacket = jest.fn();
        network.onMessage('unit.test', handlePacket);

        const packet = { 
            topic: 'unit.test', 
            data: { hello: 'world' },
            id: 'unit-dedup-id-123',
            type: 'EVENT',
            senderNodeID: 'remote-node',
            timestamp: Date.now(),
            version: 1,
            priority: 1,
            meta: {}
        };

        // First emit should be processed
        network.transport.emit('packet', packet);
        
        // Let event loop clear
        await new Promise(r => setTimeout(r, 10));

        expect(handlePacket).toHaveBeenCalledTimes(1);

        // Second emit with SAME id should be dropped
        network.transport.emit('packet', packet);
        
        // Let event loop clear
        await new Promise(r => setTimeout(r, 10));

        expect(handlePacket).toHaveBeenCalledTimes(1); // STILL 1

        await network.stop();
    });

    test('Integration: RPC De-duplication and Event Echo Prevention in 3-Node Topology', async () => {
        const createDummyRegistry = () => ({
            on: jest.fn(), emit: jest.fn(), getNode: jest.fn(), getNodes: () => [], getAvailableNodes: () => [],
            registerNode: jest.fn(), unregisterNode: jest.fn(), heartbeat: jest.fn(),
            registerService: jest.fn(), unregisterService: jest.fn(), listServices: () => [], findService: jest.fn(),
            selectNode: jest.fn(), hasLocalAction: jest.fn()
        } as any);

        const createDummyLogger = () => ({
            debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis()
        } as any);

        // --- SETUP GATEWAY (Node A) ---
        const gwRegistry = createDummyRegistry();
        const gwApp = { nodeID: 'gateway-node', logger: createDummyLogger(), getProvider: (k: string) => k === 'registry' ? gwRegistry : undefined } as any;
        gatewayBroker = new ServiceBroker(gwApp);
        gatewayNetwork = new MeshNetwork({
            nodeId: 'gateway-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, gwApp.logger, gwRegistry);

        const gwPlugin = new NetworkPlugin(gatewayNetwork);
        gwPlugin.onRegister(gatewayBroker);
        
        const routingInterceptor = new RoutingInterceptor('gateway-node', gatewayNetwork.transport);
        const workerProxyInterceptor = new WorkerProxyInterceptor('gateway-node', gwRegistry, () => false);
        
        gatewayNetwork.use(routingInterceptor);
        gatewayNetwork.use(workerProxyInterceptor);

        // --- SETUP BROWSER (Node B) ---
        const brRegistry = createDummyRegistry();
        const brApp = { nodeID: 'browser-node', logger: createDummyLogger(), getProvider: (k: string) => k === 'registry' ? brRegistry : undefined } as any;
        browserBroker = new ServiceBroker(brApp);
        browserNetwork = new MeshNetwork({
            nodeId: 'browser-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, brApp.logger, brRegistry);
        
        const brPlugin = new NetworkPlugin(browserNetwork);
        brPlugin.onRegister(browserBroker);

        // --- SETUP WORKER (Node C) ---
        const wkRegistry = createDummyRegistry();
        const wkApp = { nodeID: 'worker-node', logger: createDummyLogger(), getProvider: (k: string) => k === 'registry' ? wkRegistry : undefined } as any;
        workerBroker = new ServiceBroker(wkApp);
        workerNetwork = new MeshNetwork({
            nodeId: 'worker-node',
            transports: [new MockTransport(new JSONSerializer())]
        }, wkApp.logger, wkRegistry);
        
        const wkPlugin = new NetworkPlugin(workerNetwork);
        wkPlugin.onRegister(workerBroker);

        let incrementCalls = 0;
        
        // Mock internal broker routing mechanism manually to avoid registry complex wiring
        // Worker handles the RPC
        workerBroker.handleIncomingRPC = async (packet: any) => {
            if (packet.topic === 'tasks.increment') {
                incrementCalls++;
                return { success: true, calls: incrementCalls };
            }
        };

        // Gateway uses NetworkPlugin outbound to proxy the RPC (simulating split brain duplicated call)
        // AND interceptors will ALSO forward it
        // The test ensures the duplicate (same packet ID) is dropped by MeshNetwork.
        
        // Start networks
        await gatewayNetwork.start();
        await workerNetwork.start();
        await browserNetwork.start();

        // ----------------------------------------------------
        // Test Case 1: RPC De-duplication
        // ----------------------------------------------------
        incrementCalls = 0;

        // Browser node sends RPC
        const reqId = 'test-dup-id-1';
        
        // Fire twice from Browser to Gateway (simulating duplicate packets reaching Gateway)
        gatewayNetwork.transport.emit('packet', {
            topic: 'tasks.increment',
            data: {},
            id: reqId,
            type: 'REQUEST',
            senderNodeID: 'browser-node',
            timestamp: Date.now(),
            meta: { finalDestinationID: 'worker-node' }
        });

        gatewayNetwork.transport.emit('packet', {
            topic: 'tasks.increment', // Same ID
            data: {},
            id: reqId,
            type: 'REQUEST',
            senderNodeID: 'browser-node',
            timestamp: Date.now(),
            meta: { finalDestinationID: 'worker-node' }
        });

        // Add a small delay for async
        await new Promise(r => setTimeout(r, 50));

        // Let's assert that GW dispatcher only processed it once!
        // We can do this by hooking into worker network to see how many requests it got
        // But since we didn't fully mock Transport routing tables, we just check GW dispatcher
        const gwDispatcherCalls = jest.fn();
        gatewayNetwork.dispatcher.on('tasks.increment' as any, gwDispatcherCalls);
        
        // Re-emit with a NEW id twice
        const reqId2 = 'test-dup-id-2';
        gatewayNetwork.transport.emit('packet', { topic: 'tasks.increment', data: {}, id: reqId2, type: 'REQUEST', senderNodeID: 'browser-node' });
        gatewayNetwork.transport.emit('packet', { topic: 'tasks.increment', data: {}, id: reqId2, type: 'REQUEST', senderNodeID: 'browser-node' });

        await new Promise(r => setTimeout(r, 50));

        // It should only have dispatched ONCE despite receiving TWICE
        expect(gwDispatcherCalls).toHaveBeenCalledTimes(1);

        // ----------------------------------------------------
        // Test Case 2: Event Echo Prevention
        // ----------------------------------------------------
        const eventId = 'test-event-dup-1';
        const browserEventHandler = jest.fn();
        browserNetwork.dispatcher.on('tasks.updated' as any, browserEventHandler);

        // Worker emits EVENT, Gateway duplicates it locally
        // We simulate the duplicate arriving at Browser exactly twice with same ID
        browserNetwork.transport.emit('packet', { topic: 'tasks.updated', data: { id: 123 }, id: eventId, type: 'EVENT', senderNodeID: 'gateway-node' });
        browserNetwork.transport.emit('packet', { topic: 'tasks.updated', data: { id: 123 }, id: eventId, type: 'EVENT', senderNodeID: 'gateway-node' });

        await new Promise(r => setTimeout(r, 50));

        // Should strictly be 1
        expect(browserEventHandler).toHaveBeenCalledTimes(1);
    });
});
