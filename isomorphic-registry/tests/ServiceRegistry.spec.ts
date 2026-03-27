import { ServiceRegistry } from '../src/core/ServiceRegistry';
import { RoundRobinBalancer } from '../src/balancers/RoundRobinBalancer';
import { ILogger } from '../src/types/registry.types';
import { NodeInfo } from '../src/types/registry.schema';

describe('ServiceRegistry', () => {
    let registry: ServiceRegistry;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        const mockLogger: any = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1),
            child: jest.fn().mockReturnThis()
        };
        registry = new ServiceRegistry(mockLogger, { localNodeID: 'local-node' });
    });

    const createNode = (id: string, services: string[] = []): NodeInfo => ({
        nodeID: id,
        type: 'worker',
        namespace: 'default',
        addresses: [],
        nodeSeq: 1,
        hostname: 'localhost',
        timestamp: Date.now(),
        available: true,
        trustLevel: 'public',
        metadata: {},
        capabilities: {},
        pid: 0,
        services: services.map(s => ({ 
            name: s, 
            actions: { 
                'find': { visibility: 'public' } 
            } 
        }))
    });

    test('should register and find nodes', () => {
        const node = createNode('node-1', ['users']);
        registry.registerNode(node);
        
        expect(registry.getNode('node-1')).toBeDefined();
        expect(registry.findNodesForAction('users.find')).toHaveLength(1);
    });

    test('should select node using round robin', () => {
        registry.registerNode(createNode('n1', ['test']));
        registry.registerNode(createNode('n2', ['test']));
        
        const first = registry.selectNode('test.find');
        const second = registry.selectNode('test.find');
        const third = registry.selectNode('test.find');
        
        expect(first?.nodeID).toBe('n1');
        expect(second?.nodeID).toBe('n2');
        expect(third?.nodeID).toBe('n1');
    });

    test('should prefer local node', () => {
        const local = createNode('local-node', ['test']);
        local.nodeSeq = Date.now() + 1000;
        registry.registerNode(local);
        registry.registerNode(createNode('remote-node', ['test']));
        
        const selected = registry.selectNode('test.find');
        expect(selected?.nodeID).toBe('local-node');
    });

    test('should handle heartbeats and availability', () => {
        const node = createNode('n1');
        registry.registerNode(node);
        
        registry.heartbeat('n1', { cpu: 50 });
        expect(registry.getNode('n1')?.cpu).toBe(50);
        expect(registry.getNode('n1')?.healthScore).toBeLessThan(1.0);
    });
});
