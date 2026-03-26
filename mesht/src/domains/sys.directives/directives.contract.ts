// FILE: src/domains/sys.directives/directives.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  DirectiveSchema,
  CreateDirectiveParamsSchema,
  StepDirectiveParamsSchema,
  UpdateContextParamsSchema,
  ResumeDirectivesParamsSchema,
  CancelDirectiveParamsSchema,
  AcquireLockParamsSchema,
  ReleaseLockParamsSchema,
  ListByStatusParamsSchema,
  DirectiveStepResultSchema,
  UpdateContextResultSchema,
  ResumeDirectivesResultSchema,
  AcquireLockResultSchema,
  ReleaseLockResultSchema,
} from './directives.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.directives', typeof DirectiveSchema, typeof CreateDirectiveParamsSchema> {
    'sys.directives.create': {
      params: typeof CreateDirectiveParamsSchema;
      returns: typeof DirectiveSchema;
    };

    'sys.directives.step': {
      params: typeof StepDirectiveParamsSchema;
      returns: typeof DirectiveStepResultSchema;
    };

    'sys.directives.updateContext': {
      params: typeof UpdateContextParamsSchema;
      returns: typeof UpdateContextResultSchema;
    };

    'sys.directives.resume': {
      params: typeof ResumeDirectivesParamsSchema;
      returns: typeof ResumeDirectivesResultSchema;
    };

    'sys.directives.cancel': {
      params: typeof CancelDirectiveParamsSchema;
      returns: typeof DirectiveSchema;
    };

    'sys.directives.acquireLock': {
      params: typeof AcquireLockParamsSchema;
      returns: typeof AcquireLockResultSchema;
    };

    'sys.directives.releaseLock': {
      params: typeof ReleaseLockParamsSchema;
      returns: typeof ReleaseLockResultSchema;
    };

    'sys.directives.listByStatus': {
      params: typeof ListByStatusParamsSchema;
      returns: z.ZodArray<typeof DirectiveSchema>;
    };
  }

  export interface IServiceEventRegistry {
    'sys.directives.created': { id: string; artifactId: string; title: string; priority: string };
    'sys.directives.completed': { id: string; resolution: string };
    'sys.directives.step_completed': { id: string; fromNode: string; toNode: string; trigger: string | null; timestamp: number };
    'sys.directives.zombie_recovered': { id: string; title: string };
    'sys.directives.cancelled': { id: string; reason: string };
  }
}
