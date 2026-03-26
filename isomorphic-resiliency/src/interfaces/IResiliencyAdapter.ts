export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ICircuitState {
    state: CircuitState;
    failures: number;
    lastFailureTime?: number;
}

/**
 * ICircuitAdapter — Shared state for Circuit Breakers.
 */
export interface ICircuitAdapter {
    getState(nodeID: string): Promise<ICircuitState>;
    setState(nodeID: string, state: ICircuitState): Promise<void>;
}

/**
 * IRateLimitAdapter — Shared state for Rate Limiters.
 */
export interface IRateLimitAdapter {
    increment(key: string, ttlMs: number): Promise<number>;
    get(key: string): Promise<number>;
}
