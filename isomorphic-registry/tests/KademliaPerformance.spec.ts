import { KademliaRoutingTable } from '../src/core/KademliaRoutingTable';

describe('Kademlia Performance', () => {
    let dht: KademliaRoutingTable;

    beforeEach(() => {
        dht = new KademliaRoutingTable('local');
        // Add 1000 nodes
        for (let i = 0; i < 1000; i++) {
            dht.addNode({
                nodeID: `node_${i}`,
                type: 'node',
                trustLevel: 'internal',
                namespace: 'default',
                addresses: [],
                services: [],
                available: true,
                timestamp: Date.now(),
                nodeSeq: 0,
                hostname: 'test',
                metadata: {},
                capabilities: {},
                pid: 0
            });
        }
    });

    it('findClosestNodes should be fast enough', () => {
        const start = Date.now();
        for (let i = 0; i < 1000; i++) {
            dht.findClosestNodes(`target_${i}`, 20);
        }
        const duration = Date.now() - start;
        console.log(`Duration for 1000 lookups: ${duration}ms`);
        expect(duration).toBeLessThan(1000); // 1ms per lookup is a reasonable threshold
    });
});
