// FILE: src/domains/sys.int.chroma/chroma.schema.ts
import { z } from 'zod';
import { JSONObjectSchema } from '../../shared/json.schema';

export const StoreMemoryParamsSchema = z.object({
  content: z.string().describe('The textual content to store in long-term memory.'),
  metadata: JSONObjectSchema.default({}).describe('Optional metadata (e.g., node, persona, timestamp).'),
});

export type StoreMemoryParams = z.infer<typeof StoreMemoryParamsSchema>;

export const QueryMemoryParamsSchema = z.object({
  query: z.string().describe('The semantic search query.'),
  limit: z.number().int().positive().default(5),
});

export type QueryMemoryParams = z.infer<typeof QueryMemoryParamsSchema>;

export const MemoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: JSONObjectSchema,
  similarityScore: z.number().optional(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const DeleteMemoryParamsSchema = z.object({
  id: z.string().describe('The ID of the memory to delete.'),
});

export type DeleteMemoryParams = z.infer<typeof DeleteMemoryParamsSchema>;

export const UpdateMetadataParamsSchema = z.object({
  id: z.string().describe('The ID of the memory to update.'),
  metadata: JSONObjectSchema.describe('New metadata to merge.'),
});

export type UpdateMetadataParams = z.infer<typeof UpdateMetadataParamsSchema>;

export const ListAllMemoriesParamsSchema = z.object({});

export type ListAllMemoriesParams = z.infer<typeof ListAllMemoriesParamsSchema>;

export const StoreMemoryResultSchema = z.object({
  id: z.string(),
});

export type StoreMemoryResult = z.infer<typeof StoreMemoryResultSchema>;

export const QueryMemoryResultSchema = z.object({
  results: z.array(MemoryEntrySchema),
});

export type QueryMemoryResult = z.infer<typeof QueryMemoryResultSchema>;

export const DeleteMemoryResultSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export type DeleteMemoryResult = z.infer<typeof DeleteMemoryResultSchema>;

export const UpdateMetadataResultSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export type UpdateMetadataResult = z.infer<typeof UpdateMetadataResultSchema>;
