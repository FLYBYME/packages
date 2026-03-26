import { ICircuitAdapter, IRateLimitAdapter, ICircuitState } from '../interfaces/IResiliencyAdapter';

/**
 * LocalResiliencyAdapter — In-memory state for resiliency features.
 */
export class LocalResiliencyAdapter implements ICircuitAdapter, IRateLimitAdapter {
    private circuits = new Map<string, ICircuitState>();
    private rateLimits = new Map<string, { count: number, expires: number }>();

    // Circuit Adapter
    async getState(nodeID: string): Promise<ICircuitState> {
        return this.circuits.get(nodeID) || { state: 'CLOSED', failures: 0 };
    }

    async setState(nodeID: string, state: ICircuitState): Promise<void> {
        this.circuits.set(nodeID, state);
    }

    // Rate Limit Adapter
    async increment(key: string, ttlMs: number): Promise<number> {
        const now = Date.now();
        const bucket = this.rateLimits.get(key);

        if (!bucket || bucket.expires <= now) {
            this.rateLimits.set(key, { count: 1, expires: now + ttlMs });
            return 1;
        }

        bucket.count++;
        return bucket.count;
    }

    async get(key: string): Promise<number> {
        const now = Date.now();
        const bucket = this.rateLimits.get(key);
        if (!bucket || bucket.expires <= now) return 0;
        return bucket.count;
    }
}
