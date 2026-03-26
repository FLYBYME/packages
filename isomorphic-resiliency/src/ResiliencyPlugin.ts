import { IBrokerPlugin, IServiceBroker, IContext, ResiliencyError } from '@flybyme/isomorphic-core';
import { ICircuitAdapter, IRateLimitAdapter, CircuitState } from './interfaces/IResiliencyAdapter';

export interface ResiliencyPluginOptions {
    circuitBreaker: {
        enabled: boolean;
        threshold: number;
        resetTimeout: number;
        adapter: ICircuitAdapter;
    };
    rateLimiter: {
        enabled: boolean;
        windowMs: number;
        limit: number;
        adapter: IRateLimitAdapter;
    };
}

/**
 * ResiliencyPlugin — Protects the GLOBAL pipeline with Circuit Breaking and Rate Limiting.
 */
export class ResiliencyPlugin implements IBrokerPlugin {
    public readonly name = 'resiliency-plugin';

    private probeContextID: string | null = null;
    private probeNodeID: string | null = null;

    constructor(private options: ResiliencyPluginOptions) {}

    onRegister(broker: IServiceBroker): void {
        broker.use(async (ctx: IContext<unknown, Record<string, unknown>>, next: () => Promise<unknown>) => {
            
            // 1. Rate Limiter
            if (this.options.rateLimiter.enabled) {
                const key = `rl:${ctx.callerID || 'anonymous'}`;
                const count = await this.options.rateLimiter.adapter.increment(key, this.options.rateLimiter.windowMs);
                
                if (count > this.options.rateLimiter.limit) {
                    throw new ResiliencyError(`[RateLimiter] Rate limit exceeded for caller: ${ctx.callerID || 'anonymous'}`, 'TOO_MANY_REQUESTS', 429);
                }
            }

            // 2. Circuit Breaker (Outbound focus)
            if (this.options.circuitBreaker.enabled && ctx.targetNodeID && ctx.targetNodeID !== broker.app.nodeID) {
                const targetNodeID = ctx.targetNodeID;
                const state = await this.options.circuitBreaker.adapter.getState(targetNodeID);

                if (state.state === 'OPEN') {
                    const now = Date.now();
                    if (state.lastFailureTime && (now - state.lastFailureTime) > this.options.circuitBreaker.resetTimeout) {
                        if (this.probeContextID === null) {
                            this.probeContextID = ctx.id;
                            this.probeNodeID = targetNodeID;
                            await this.options.circuitBreaker.adapter.setState(targetNodeID, { ...state, state: 'HALF_OPEN' });
                        } else {
                            throw new ResiliencyError(`[CircuitBreaker] Circuit is OPEN for node: ${targetNodeID}`);
                        }
                    } else {
                        throw new ResiliencyError(`[CircuitBreaker] Circuit is OPEN for node: ${targetNodeID}`);
                    }
                } else if (state.state === 'HALF_OPEN') {
                    if (this.probeContextID !== ctx.id) {
                        throw new ResiliencyError(`[CircuitBreaker] Circuit is HALF_OPEN (probing in progress) for node: ${targetNodeID}`);
                    }
                }

                try {
                    const result = await next();
                    await this.handleSuccess(targetNodeID, ctx.id);
                    return result;
                } catch (err) {
                    await this.handleFailure(targetNodeID, ctx.id);
                    throw err;
                }
            }

            return await next();
        });
    }

    private async handleFailure(nodeID: string, contextID: string): Promise<void> {
        const state = await this.options.circuitBreaker.adapter.getState(nodeID);
        const failures = state.failures + 1;
        let newState: CircuitState = state.state;

        if (this.probeContextID === contextID || failures >= this.options.circuitBreaker.threshold) {
            newState = 'OPEN';
            if (this.probeContextID === contextID) {
                this.probeContextID = null;
                this.probeNodeID = null;
            }
        }

        await this.options.circuitBreaker.adapter.setState(nodeID, {
            state: newState, failures, lastFailureTime: Date.now()
        });
    }

    private async handleSuccess(nodeID: string, contextID: string): Promise<void> {
        const state = await this.options.circuitBreaker.adapter.getState(nodeID);
        if (state.state !== 'CLOSED' && this.probeContextID === contextID) {
            this.probeContextID = null;
            this.probeNodeID = null;
            await this.options.circuitBreaker.adapter.setState(nodeID, { state: 'CLOSED', failures: 0 });
        }
    }
}
