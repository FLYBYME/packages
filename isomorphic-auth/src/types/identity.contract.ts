import { z } from 'zod';
import { UserRegistrationSchema, UserLoginSchema, IdentitySettingsSchema } from './identity.schema';

/**
 * IdentityContract — The formal Zod contract for the Identity Service.
 * Injects types into the global MeshActionRegistry and ISettingsRegistry.
 */
declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'auth.identity.register': {
            params: z.infer<typeof UserRegistrationSchema>;
            returns: { id: string, email: string };
        };
        'auth.identity.login': {
            params: z.infer<typeof UserLoginSchema>;
            returns: { id: string, token: string };
        };
    }

    interface ISettingsRegistry {
        'auth.identity': typeof IdentitySettingsSchema;
    }
}

export const IdentityContract = {
    name: 'auth.identity',
    settings: IdentitySettingsSchema,
    actions: {
        register: {
            params: UserRegistrationSchema,
            returns: z.object({
                id: z.string(),
                email: z.string()
            })
        },
        login: {
            params: UserLoginSchema,
            returns: z.object({
                id: z.string(),
                token: z.string()
            })
        }
    }
};
