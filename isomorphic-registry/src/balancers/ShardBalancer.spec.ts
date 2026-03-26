import { ShardBalancer } from './ShardBalancer';
import { NodeInfo } from '../types/registry.schema';
import { IMeshAuthMeta } from '../types/registry.types';

describe('ShardBalancer', () => {
    let balancer: ShardBalancer;
    const nodes: NodeInfo[] = [
        { nodeID: 'node-1', services: [], addresses: [], hostname: 'h1', nodeSeq: 1, type: 'node', timestamp: Date.now() } as unknown as NodeInfo,
        { nodeID: 'node-2', services: [], addresses: [], hostname: 'h2', nodeSeq: 1, type: 'node', timestamp: Date.now() } as unknown as NodeInfo,
        { nodeID: 'node-3', services: [], addresses: [], hostname: 'h3', nodeSeq: 1, type: 'node', timestamp: Date.now() } as unknown as NodeInfo,
    ];

    beforeEach(() => {
        balancer = new ShardBalancer();
    });

    it('should select the same node for the same shardKey', () => {
        const ctx: IMeshAuthMeta = { shardKey: 'user-123' };
        const selected1 = balancer.select(nodes, ctx);
        const selected2 = balancer.select(nodes, ctx);
        
        expect(selected1).toBeDefined();
        expect(selected2).toBeDefined();
        expect(selected1?.nodeID).toBe(selected2?.nodeID);
    });

    it('should distribute different shardKeys across nodes', () => {
        const selectedNodes = new Set<string>();
        for (let i = 0; i < 1000; i++) {
            const ctx: IMeshAuthMeta = { shardKey: `user-${i}` };
            const node = balancer.select(nodes, ctx);
            if (node) selectedNodes.add(node.nodeID);
        }
        
        // With 100 random-ish keys and 3 nodes, we expect all nodes to be used.
        expect(selectedNodes.size).toBe(3);
    });

    it('should fall back to nodes[0] if no shardKey is provided', () => {
        const selected = balancer.select(nodes, {});
        expect(selected?.nodeID).toBe(nodes[0].nodeID);
    });
});
