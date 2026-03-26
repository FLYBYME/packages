import { z } from 'zod';
import { mKDC } from './mKDC';
import { IContext, IServiceActionRegistry } from '@flybyme/isomorphic-core';
import '../types/auth.contract';

/**
 * AuthService — Handles authentication and ticket issuance.
 * Strictly implements handlers using inferred types from the registry.
 */
export class AuthService {
    public readonly name = 'auth';

    constructor(private mkdc: mKDC) {}

    /**
     * Authenticate a node and issue a TGT.
     */
    async authenticate(
        ctx: IContext<z.infer<IServiceActionRegistry['auth.authenticate']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['auth.authenticate']['returns']>> {
        const result = await this.mkdc.authenticate(ctx.params);
        return { token: result.token };
    }

    /**
     * Issue a Service Ticket (ST) using a TGT.
     */
    async getServiceTicket(
        ctx: IContext<z.infer<IServiceActionRegistry['auth.getServiceTicket']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['auth.getServiceTicket']['returns']>> {
        const result = await this.mkdc.issueServiceTicket(ctx.params);
        return { token: result.token };
    }
}
