import { IBrokerPlugin, IServiceBroker, IContext } from '@flybyme/isomorphic-core';
import { Gatekeeper } from './core/Gatekeeper';
import { TicketManager } from './core/TicketManager';
import { IAuthMetadata } from './types/auth.types';

/**
 * AuthPlugin — Injects authentication middleware into the GLOBAL ServiceBroker pipeline.
 */
export class AuthPlugin implements IBrokerPlugin {
    public readonly name = 'auth';

    constructor(
        private gatekeeper: Gatekeeper, 
        private ticketManager: TicketManager
    ) {}

    onRegister(broker: IServiceBroker): void {
        // Global Middleware: Check tokens for every request entering the system
        broker.use(async (ctx: IContext<unknown, IAuthMetadata>, next: () => Promise<unknown>) => {
            const { meta } = ctx;

            if (meta.token) {
                try {
                    const decoded = await this.gatekeeper.verifyServiceTicket(meta.token);
                    if (!decoded) {
                        throw new Error('Invalid or expired token');
                    }
                    meta.user = {
                        id: decoded.sub,
                        groups: decoded.capabilities ?? [],
                        type: decoded.type,
                        tenant_id: decoded.tenant_id
                    };
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Security error';
                    broker.logger.warn(`[AuthPlugin] Inbound ticket verification failed: ${message}`);
                    throw err; // Re-throw to halt pipeline with error
                }
            }
            return next();
        });

        broker.app.registerProvider('auth:ticket', this.ticketManager);
    }
}
