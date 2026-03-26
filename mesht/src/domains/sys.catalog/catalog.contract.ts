// FILE: src/domains/sys.catalog/catalog.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  CatalogModelSchema,
  EnableModelParamsSchema,
  DeleteModelParamsSchema,
  UpdateCapsParamsSchema,
  PingModelParamsSchema,
} from './catalog.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.catalog', typeof CatalogModelSchema> {
    'sys.catalog.enable': {
      params: typeof EnableModelParamsSchema;
      returns: typeof CatalogModelSchema;
    };

    'sys.catalog.deleteModel': {
      params: typeof DeleteModelParamsSchema;
      returns: z.ZodObject<{ success: z.ZodBoolean; alias: z.ZodString }>;
    };

    'sys.catalog.updateCaps': {
      params: typeof UpdateCapsParamsSchema;
      returns: z.ZodObject<{ alias: z.ZodString; capabilities: z.ZodArray<z.ZodString> }>;
    };

    'sys.catalog.ping': {
      params: typeof PingModelParamsSchema;
      returns: z.ZodObject<{ alias: z.ZodString; healthy: z.ZodBoolean; latencyMs: z.ZodNumber }>;
    };

    'sys.catalog.updateModel': {
      params: typeof import('./catalog.schema').UpdateModelParamsSchema;
      returns: typeof import('./catalog.schema').CatalogModelSchema;
    };
  }

  export interface IServiceEventRegistry {
    'sys.catalog.model_enabled': { alias: string; providerId: string };
    'sys.catalog.model_deleted': { alias: string };
  }
}
