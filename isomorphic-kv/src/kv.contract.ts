import { z } from 'zod';
import { KVSetRequestSchema, KVGetRequestSchema, KVEntrySchema } from './kv.schema';

declare module '@flybyme/isomorphic-core' {
    export interface IServiceActionRegistry {
        'kv.get': {
            params: typeof KVGetRequestSchema;
            returns: z.ZodNullable<typeof KVEntrySchema>;
            rest: { method: 'GET', path: '/:key' };
        };
        'kv.set': {
            params: typeof KVSetRequestSchema;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
            rest: { method: 'POST', path: '/' };
        };
        'kv.delete': {
            params: z.ZodObject<{ key: z.ZodString }>;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
            rest: { method: 'DELETE', path: '/:key' };
        };
        'kv.replicate': {
            params: typeof KVEntrySchema;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
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
