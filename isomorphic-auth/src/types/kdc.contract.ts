import { z } from 'zod';
import { TGTRequestSchema, STRequestSchema } from './auth.schema';
import { ValidatePACParamsSchema, ValidatePACResponseSchema, KDCSettingsSchema } from './kdc.schema';

/**
 * KDCContract — The formal Zod contract for the Key Distribution Center.
 * Injects types into the global MeshActionRegistry and ISettingsRegistry.
 */
declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'sys.kdc.authenticate': {
            params: z.infer<typeof TGTRequestSchema>;
            returns: { token: string };
        };
        'sys.kdc.getServiceTicket': {
            params: z.infer<typeof STRequestSchema>;
            returns: { token: string };
        };
        'sys.kdc.validate_pac': {
            params: z.infer<typeof ValidatePACParamsSchema>;
            returns: z.infer<typeof ValidatePACResponseSchema>;
        };
    }

    interface ISettingsRegistry {
        'sys.kdc': typeof KDCSettingsSchema;
    }
}

export const KDCContract = {
    name: 'sys.kdc',
    settings: KDCSettingsSchema,
    actions: {
        authenticate: {
            params: TGTRequestSchema,
            returns: z.object({ token: z.string() })
        },
        getServiceTicket: {
            params: STRequestSchema,
            returns: z.object({ token: z.string() })
        },
        validate_pac: {
            params: ValidatePACParamsSchema,
            returns: ValidatePACResponseSchema
        }
    }
};
