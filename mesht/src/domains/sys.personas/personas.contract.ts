// FILE: src/domains/sys.personas/personas.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  PersonaSchema,
  CreatePersonaParamsSchema,
  GetBlueprintParamsSchema,
  UpdateToolsParamsSchema,
  ActivatePersonaParamsSchema,
  DeactivatePersonaParamsSchema,
} from './personas.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.personas', typeof PersonaSchema, typeof CreatePersonaParamsSchema> {
    'sys.personas.create': {
      params: typeof CreatePersonaParamsSchema;
      returns: typeof PersonaSchema;
    };

    'sys.personas.getBlueprint': {
      params: typeof GetBlueprintParamsSchema;
      returns: z.ZodObject<{
        persona: typeof PersonaSchema;
        llmDeployment: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        toolBelt: z.ZodArray<z.ZodObject<{
          type: z.ZodLiteral<'function'>;
          function: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
          }>;
        }>>;
      }>;
    };

    'sys.personas.updateTools': {
      params: typeof UpdateToolsParamsSchema;
      returns: z.ZodObject<{ alias: z.ZodString; allowedTools: z.ZodArray<z.ZodString> }>;
    };

    'sys.personas.activate': {
      params: typeof ActivatePersonaParamsSchema;
      returns: typeof PersonaSchema;
    };

    'sys.personas.deactivate': {
      params: typeof DeactivatePersonaParamsSchema;
      returns: typeof PersonaSchema;
    };
  }

  export interface IServiceEventRegistry {
    'sys.personas.created': { personaID: string; alias: string; role: string };
    'sys.personas.updated': { personaID: string; alias: string };
    'sys.personas.activated': { personaID: string };
    'sys.personas.deactivated': { personaID: string };
  }
}
