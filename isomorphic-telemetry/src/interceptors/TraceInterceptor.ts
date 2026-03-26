import { IMeshPacket } from '@flybyme/isomorphic-mesh';

/**
 * TraceInterceptor — Pipeline middleware for distributed tracing.
 */
export class TraceInterceptor {
    public readonly name = 'trace-middleware';

    /**
     * Pipeline handler: Hydrates and propagates tracing context.
     */
    async onInbound(packet: IMeshPacket, next: (p: IMeshPacket) => Promise<unknown>): Promise<unknown> {
        // Hydration logic would go here
        return await next(packet);
    }
}
