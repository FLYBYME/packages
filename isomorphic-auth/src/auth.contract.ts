import { z } from 'zod';
import { LoginParams, GetTicketParams, AuthSettingsSchema } from './auth.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'auth.authenticate': {
            params: z.infer<typeof LoginParams>;
            returns: { token: string };
        };
        'auth.getServiceTicket': {
            params: z.infer<typeof GetTicketParams>;
            returns: { token: string };
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
