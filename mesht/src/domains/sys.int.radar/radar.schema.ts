// FILE: src/domains/sys.int.radar/radar.schema.ts
import { z } from 'zod';

export const ScanProjectParamsSchema = z.object({
  targetDir: z.string().default('.'),
  depth: z.number().int().positive().default(3),
});

export type ScanProjectParams = z.infer<typeof ScanProjectParamsSchema>;

export const EntityLookupParamsSchema = z.object({
  query: z.string().describe('The name of the entity to lookup (e.g., class name, function name).'),
});

export type EntityLookupParams = z.infer<typeof EntityLookupParamsSchema>;

export const RadarEntitySchema = z.object({
  path: z.string(),
  definition: z.string(),
});

export type RadarEntity = z.infer<typeof RadarEntitySchema>;

export const RadarLookupResultSchema = z.object({
  path: z.string(),
  line: z.number().int(),
  content: z.string(),
});

export type RadarLookupResult = z.infer<typeof RadarLookupResultSchema>;

export const ScanProjectResultSchema = z.object({
  tree: z.string(),
  entities: z.array(RadarEntitySchema),
});

export type ScanProjectResult = z.infer<typeof ScanProjectResultSchema>;

export const LookupEntityResultSchema = z.object({
  results: z.array(RadarLookupResultSchema),
});

export type LookupEntityResult = z.infer<typeof LookupEntityResultSchema>;

export const RadarMappingSchema = z.object({
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['class', 'function', 'module', 'interface']),
    path: z.string(),
    line: z.number().int(),
  })),
  dependencies: z.record(z.string(), z.array(z.string())),
});
