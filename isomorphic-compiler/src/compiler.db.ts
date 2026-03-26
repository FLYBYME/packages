import { z } from 'zod';
import { defineTable } from '@flybyme/isomorphic-database';
import { BuildRecordSchema } from './compiler.schema';

/**
 * BuildTable
 * Tracks history of compiler executions.
 */
export const BuildTable = defineTable('compiler_builds', BuildRecordSchema);

/**
 * ManifestTable
 * Stores application configurations.
 */
export const ManifestTable = defineTable('ui_manifests', z.object({
    id: z.string(), // appId
    appId: z.string(),
    data: z.any(), // The SiteManifest
    version: z.number(),
    createdAt: z.coerce.number(),
    updatedAt: z.coerce.number()
}));
