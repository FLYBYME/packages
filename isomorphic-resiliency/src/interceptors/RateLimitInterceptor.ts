import { IInterceptor, ResiliencyError } from '@flybyme/isomorphic-core';
import { MeshPacket } from '@flybyme/isomorphic-mesh';
import { IRateLimitAdapter } from '../interfaces/IResiliencyAdapter';

export interface RateLimitOptions {
    windowMs: number;
    limit: number;
    adapter: IRateLimitAdapter;
}

/**
 * RateLimitInterceptor — Throttles inbound requests.
 */
export class RateLimitInterceptor implements IInterceptor<MeshPacket, MeshPacket> {
    public readonly name = 'rate-limiter';

    constructor(private options: RateLimitOptions) {}

    async onInbound(packet: MeshPacket): Promise<MeshPacket> {
        // We only rate limit incoming REQUESTs
        if (packet.type !== 'REQUEST') return packet;

        const senderNodeID = packet.senderNodeID;
        const key = `rl:${senderNodeID}`;

        const count = await this.options.adapter.increment(key, this.options.windowMs);

        if (count > this.options.limit) {
            throw new ResiliencyError(`[RateLimiter] Rate limit exceeded for sender: ${senderNodeID}`, 'TOO_MANY_REQUESTS', 429);
        }

        return packet;
    }
}
