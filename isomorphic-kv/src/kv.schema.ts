import { z } from 'zod';

/**
 * KV Domain Schemas
 */

export const KVSetRequestSchema = z.object({
    key: z.string().min(1),
    value: z.unknown(), // Validated at application level
    ttlMs: z.number().positive().optional(),
});

export type KVSetRequest = z.infer<typeof KVSetRequestSchema>;

export const KVGetRequestSchema = z.object({
    key: z.string().min(1)
});

export type KVGetRequest = z.infer<typeof KVGetRequestSchema>;

/**
 * Internal storage schema (for DatabaseMixin if needed)
 */
export const KVEntrySchema = z.object({
    key: z.string(),
    value: z.unknown(),
    ttl: z.number(),
    version: z.number(),
    ownerID: z.string(),
    tenant_id: z.string().optional()
});
