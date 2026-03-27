import { ServiceRegistry } from '../src/core/ServiceRegistry';
import { ServiceLifecycle } from '../src/core/ServiceLifecycle';
import { ServiceInitializer } from '../src/core/ServiceInitializer';
import { ILogger, ServiceSchema } from '../src/types/registry.types';
import { NodeInfo } from '../src/types/registry.schema';
import { IServiceBroker, IMeshApp } from '@flybyme/isomorphic-core';

describe('ServiceLifecycle', () => {
    let registry: ServiceRegistry;
    let lifecycle: ServiceLifecycle;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1),
            child: jest.fn().mockReturnThis()
        } as unknown as jest.Mocked<ILogger>;
        registry = new ServiceRegistry(mockLogger, { localNodeID: 'local' });
        lifecycle = new ServiceLifecycle(registry, mockLogger);
    });

    const createNode = (id: string, services: string[] = []): NodeInfo => ({
        nodeID: id,
        type: 'worker',
        namespace: 'default',
        addresses: [],
        services: services.map(s => ({ name: s })),
        nodeSeq: 1,
        hostname: 'h',
        timestamp: Date.now(),
        available: true,
        trustLevel: 'public',
        metadata: {},
        capabilities: {},
        pid: 0
    });

    test('should pause service when dependencies missing', async () => {
        const paused = jest.fn();
        const resumed = jest.fn();
        
        const schema: Partial<ServiceSchema> = {
            name: 's1',
            dependencies: ['dep1'],
            paused,
            resumed
        };

        const mockBroker: Partial<IServiceBroker> = {
            app: {} as IMeshApp,
            logger: mockLogger,
            use: jest.fn(),
            call: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn()
        };
        const mockApp: Partial<IMeshApp> = {
            nodeID: 'local',
            namespace: 'default',
            config: {
                nodeID: 'local'
            },
            logger: mockLogger,
            getProvider: jest.fn().mockReturnValue(mockBroker) as any
        };

        const instance = ServiceInitializer.createInstance(schema as ServiceSchema, mockLogger, mockBroker as IServiceBroker, mockApp as IMeshApp);
        lifecycle.registerService(instance);
        await instance.start();
        expect(instance.state).toBe('running');

        // Trigger evaluation by registering another node (without dep1)
        registry.registerNode(createNode('n2'));

        // Wait for potential async calls
        await new Promise(r => setTimeout(r, 50));

        expect(instance.state).toBe('paused');
        expect(paused).toHaveBeenCalled();

        // Restore dependency
        registry.registerNode(createNode('n3', ['dep1']));

        await new Promise(r => setTimeout(r, 50));
        expect(instance.state).toBe('running');
        expect(resumed).toHaveBeenCalled();
    });
});
