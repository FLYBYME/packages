import { IServiceBroker } from '@flybyme/isomorphic-core';

/**
 * KVRouter — Implements Consistent Hashing for KV distribution.
 */
export class KVRouter {
    private hashedRing: string[] = []; // Sorted hashed nodeIDs
    private hashedToNodeID = new Map<string, string>(); 

    constructor(private broker: IServiceBroker) {
        this.rebuildRing();
        // Listen to registry events to keep ring synchronized
        this.broker.on('$registry.node.added', () => this.rebuildRing());
        this.broker.on('$registry.node.removed', () => this.rebuildRing());
    }

    /**
     * Rebuilds the hash ring based on all active mesh nodes.
     */
    private rebuildRing(): void {
        const nodes = this.broker.registry.getNodes();
        this.hashedToNodeID.clear();
        
        this.hashedRing = nodes.map(node => {
            const h = this.hash(node.nodeID);
            this.hashedToNodeID.set(h, node.nodeID);
            return h;
        }).sort();
    }

    /**
     * Simple deterministic hash. 
     * In production, this would use a more robust SHA-256 implementation.
     */
    private hash(input: string): string {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Returns the target nodes for a given key based on replication factor.
     */
    public getTargetNodes(key: string, replicationFactor: number = 3): string[] {
        if (this.hashedRing.length === 0) return [];

        const keyHash = this.hash(key);
        
        // Find the first hashed node >= keyHash (clockwise on the ring)
        let index = this.hashedRing.findIndex(h => h >= keyHash);
        if (index === -1) index = 0; // Wrap around to the start of the ring

        const targets: string[] = [];
        for (let i = 0; i < this.hashedRing.length; i++) {
            const nodeHash = this.hashedRing[(index + i) % this.hashedRing.length];
            const nodeID = this.hashedToNodeID.get(nodeHash)!;
            
            if (!targets.includes(nodeID)) {
                targets.push(nodeID);
            }

            if (targets.length >= replicationFactor) break;
        }

        return targets;
    }

    /**
     * Determines if the local node is responsible for a given key.
     */
    public isLocalResponsible(key: string, replicationFactor: number = 3): boolean {
        const targets = this.getTargetNodes(key, replicationFactor);
        return targets.includes(this.broker.app.nodeID);
    }
}
