import { KademliaRoutingTable } from '../src/core/KademliaRoutingTable';
import { NodeInfo } from '../src/types/registry.schema';

describe('KademliaRoutingTable', () => {
    let dht: KademliaRoutingTable;

    beforeEach(() => {
        dht = new KademliaRoutingTable('local');
    });

    const createNode = (id: string): NodeInfo => ({
        nodeID: id,
        type: 'worker',
        namespace: 'default',
        addresses: [],
        services: [],
        nodeSeq: 1,
        hostname: 'h',
        timestamp: Date.now(),
        available: true,
        trustLevel: 'public',
        metadata: {},
        capabilities: {},
        pid: 0
    });

    test('should add and find closest nodes', () => {
        const n1 = createNode('node1');
        const n2 = createNode('node2');
        const n3 = createNode('node3');

        dht.addNode(n1);
        dht.addNode(n2);
        dht.addNode(n3);

        const closest = dht.findClosestNodes('target', 2);
        expect(closest).toHaveLength(2);
    });

    test('should remove nodes', () => {
        const n1 = createNode('n1');
        dht.addNode(n1);
        expect(dht.findClosestNodes('n1', 1)).toHaveLength(1);
        
        dht.removeNode('n1');
        expect(dht.findClosestNodes('n1', 1)).toHaveLength(0);
    });
});
