import { z } from 'zod';
import { LoginParams, GetTicketParams, AuthSettingsSchema } from './auth.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'auth.authenticate': {
            params: typeof LoginParams;
            returns: z.ZodObject<{ token: z.ZodString }>;
        };
        'auth.getServiceTicket': {
            params: typeof GetTicketParams;
            returns: z.ZodObject<{ token: z.ZodString }>;
        };
    }

    interface ISettingsRegistry {
        'auth': typeof AuthSettingsSchema;
    }
}

export const AuthContract = {
    name: 'auth',
    actions: {
        authenticate: {
            params: LoginParams,
            returns: z.object({ token: z.string() })
        },
        getServiceTicket: {
            params: GetTicketParams,
            returns: z.object({ token: z.string() })
        }
    }
};
