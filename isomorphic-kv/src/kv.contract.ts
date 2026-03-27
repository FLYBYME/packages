import { z } from 'zod';
import { KVSetRequestSchema, KVGetRequestSchema, KVEntrySchema } from './kv.schema';

declare module '@flybyme/isomorphic-core' {
    export interface IServiceActionRegistry {
        'kv.get': {
            params: z.infer<typeof KVGetRequestSchema>;
            returns: z.infer<typeof KVEntrySchema> | null;
            rest: { method: 'GET', path: '/:key' };
        };
        'kv.set': {
            params: z.infer<typeof KVSetRequestSchema>;
            returns: { success: boolean };
            rest: { method: 'POST', path: '/' };
        };
        'kv.delete': {
            params: { key: string };
            returns: { success: boolean };
            rest: { method: 'DELETE', path: '/:key' };
        };
        'kv.replicate': {
            params: z.infer<typeof KVEntrySchema>;
            returns: { success: boolean };
        };
    }

    export interface ISettingsRegistry {
        'kv': z.ZodObject<{
            replicationFactor: z.ZodNumber;
            cleanupIntervalMs: z.ZodNumber;
        }>;
    }
}

export const KVContract = {
    name: 'kv',
    actions: {
        get: {
            params: KVGetRequestSchema,
            returns: KVEntrySchema.nullable()
        },
        set: {
            params: KVSetRequestSchema,
            returns: z.object({ success: z.boolean() })
        },
        delete: {
            params: z.object({ key: z.string() }),
            returns: z.object({ success: z.boolean() })
        },
        replicate: {
            params: KVEntrySchema,
            returns: z.object({ success: z.boolean() })
        }
    }
};
