// FILE: src/domains/sys.artifacts/artifacts.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  ArtifactSchema,
  RegisterArtifactParamsSchema,
  ValidateProtocolParamsSchema,
} from './artifacts.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.artifacts', typeof ArtifactSchema> {
    'sys.artifacts.register': {
      params: typeof RegisterArtifactParamsSchema;
      returns: typeof ArtifactSchema;
    };

    'sys.artifacts.validate': {
      params: typeof ValidateProtocolParamsSchema;
      returns: z.ZodObject<{
        valid: z.ZodBoolean;
        errors: z.ZodArray<z.ZodString>;
        nodeCount: z.ZodNumber;
        edgeCount: z.ZodNumber;
      }>;
    };
  }

  export interface IServiceEventRegistry {
    'sys.artifacts.registered': { artifactId: string; type: string; name: string };
    'sys.artifacts.deleted': { artifactId: string };
  }
}
