import { z } from 'zod';
import { SiteManifestSchema } from '@flybyme/isomorphic-core';

/**
 * BootClientParamsSchema
 * Request to initialize a compiler pipeline for a specific app manifest.
 */
export const BootClientParamsSchema = z.object({
    manifest: SiteManifestSchema,
});

/**
 * BuildRecordSchema
 * Immutable record of a single compiler execution.
 */
export const BuildRecordSchema = z.object({
    id: z.string(),
    appId: z.string(),
    manifestId: z.string(),
    status: z.enum(['running', 'success', 'failed']),
    durationMs: z.number().nullable().optional(),
    assets: z.union([z.array(z.string()), z.string()]).nullable().optional(),
    errorLog: z.union([z.string(), z.any()]).nullable().optional(),
    createdAt: z.coerce.number(),
    updatedAt: z.coerce.number().nullable().optional(),
});

export const BuildFromPathParamsSchema = z.object({
    manifestPath: z.string().describe('Absolute or relative path to the manifest.ts file'),
    watch: z.boolean().optional().describe('Whether to watch for changes and rebuild'),
    outputPath: z.string().optional().describe('Relative path to store build assets, defaults to .builds')
});

export const PromoteBuildParamsSchema = z.object({
    buildId: z.string()
});

export const WatchClientParamsSchema = z.object({
    appId: z.string(),
});

export type BuildResult = z.infer<typeof BuildRecordSchema>;

export type BootClientParams = z.infer<typeof BootClientParamsSchema>;

export type PromoteBuildParams = z.infer<typeof PromoteBuildParamsSchema>;

