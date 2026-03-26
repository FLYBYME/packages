import { bootstrapMeshTasker } from '../src/index';
import { ILogger } from '@flybyme/isomorphic-core';
import { TaskWorkerService } from '../src/services/TaskWorker.service';

describe('MeshTasker Kitchen Sink Chaos', () => {
    let gatewayApp: any;
    let workerApp: any;
    let logger: ILogger;

    beforeEach(async () => {
        logger = { 
            debug: jest.fn(), 
            info: jest.fn(), 
            warn: jest.fn(), 
            error: jest.fn(),
            child: jest.fn().mockReturnThis()
        } as any;
        
        try {
            // Setup nodes - use mock transport to avoid EADDRINUSE, and :memory: for DB
            gatewayApp = await bootstrapMeshTasker({ 
                nodeID: 'node-a', 
                role: 'gateway', 
                customLogger: logger, 
                transportType: 'mock',
                dbPath: ':memory:' 
            });
            workerApp = await bootstrapMeshTasker({ 
                nodeID: 'node-c', 
                role: 'worker', 
                customLogger: logger, 
                transportType: 'mock',
                dbPath: ':memory:'
            });

            // Register service on worker
            const taskWorker = new TaskWorkerService(workerApp.logger);
            await workerApp.registerService(taskWorker);

            // Manually register node-c in node-a's registry
            const registry = gatewayApp.getProvider('registry');
            registry.registerNode({
                nodeID: 'node-c',
                type: 'worker',
                namespace: 'meshtasker',
                addresses: [],
                available: true,
                services: [
                    { name: 'tasks', actions: { create: {}, get: {}, list: {}, toggleStatus: {} } }
                ]
            });

            // Wait for registry to settle and async events to propagate
            await new Promise(r => setTimeout(r, 200));

        } catch (err) {
            console.error('FAILED TO BOOTSTRAP APPS IN TEST:', err);
            if (gatewayApp) await gatewayApp.stop();
            if (workerApp) await workerApp.stop();
            throw err;
        }
    });

    afterEach(async () => {
        if (gatewayApp) await gatewayApp.stop();
        if (workerApp) await workerApp.stop();
        gatewayApp = null;
        workerApp = null;
        // Small delay to let network close cleanly
        await new Promise(r => setTimeout(r, 50));
    });

    test('should allow custom action toggleStatus through the mesh', async () => {
        const broker = gatewayApp.getProvider('broker');
        // Use a truly unique ID for every single test run to avoid persistence side effects
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 1. Create a task via RPC
        const task = await broker.call('tasks.create', {
            id: taskId,
            title: 'Refactor to Mixin',
            status: 'pending',
            assignedTo: 'engineer-1'
        });

        expect(task).toBeDefined();
        expect(task.title).toBe('Refactor to Mixin');
        expect(task.status).toBe('pending');

        // 2. Toggle status via custom action
        const updated = await broker.call('tasks.toggleStatus', { id: taskId });
        expect(updated).toBeDefined();
        // It's a toggle: pending -> active
        expect(updated.status).toBe('active');
    });

    test('should enforce rate limits on task creation', async () => {
        const network = gatewayApp.getProvider('network');
        const rateLimiter = (network as any).interceptors.find((i: any) => i.name === 'rate-limit');

        const req = {
            id: 'spam-1', topic: 'tasks.create', type: 'REQUEST', senderNodeID: 'attacker', timestamp: Date.now(),
            data: {}
        } as any;

        // Our limit is 10 per minute in bootstrap. Let's do 11 to trigger it.
        for (let i = 0; i < 11; i++) {
            await rateLimiter.onInbound({ ...req, id: `req-${i}` });
        }

        await expect(rateLimiter.onInbound({ ...req, id: 'req-fail' }))
            .rejects.toThrow('Rate limit exceeded');
    });
});
