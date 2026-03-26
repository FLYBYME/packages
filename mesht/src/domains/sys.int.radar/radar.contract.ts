import { z } from 'zod';
import { ScanProjectParamsSchema, EntityLookupParamsSchema } from './radar.schema';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry {
    'sys.int.radar.scan_project': {
      params: typeof ScanProjectParamsSchema,
      returns: z.ZodObject<{
        tree: z.ZodString,
        entities: z.ZodArray<z.ZodObject<{ path: z.ZodString, definition: z.ZodString }>>,
      }>;
    };
    'sys.int.radar.lookup_entity': {
      params: typeof EntityLookupParamsSchema,
      returns: z.ZodObject<{
        results: z.ZodArray<z.ZodObject<{ path: z.ZodString, line: z.ZodNumber, content: z.ZodString }>>,
      }>;
    };
  }
}
