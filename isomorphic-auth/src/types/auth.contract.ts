import { z } from 'zod';
import { TGTRequestSchema, STRequestSchema } from './auth.schema';

/**
 * AuthContract — The formal Zod contract for the Authentication Service.
 * Injects types into the global IServiceActionRegistry.
 */
declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'auth.authenticate': {
            params: z.infer<typeof TGTRequestSchema>;
            returns: { token: string };
        };
        'auth.getServiceTicket': {
            params: z.infer<typeof STRequestSchema>;
            returns: { token: string };
        };
    }
}

export const AuthContract = {
    name: 'auth',
    actions: {
        authenticate: {
            params: TGTRequestSchema,
            returns: z.object({
                token: z.string()
            })
        },
        getServiceTicket: {
            params: STRequestSchema,
            returns: z.object({
                token: z.string()
            })
        }
    }
};
