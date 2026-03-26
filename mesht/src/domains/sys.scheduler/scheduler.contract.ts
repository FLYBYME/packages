// FILE: src/domains/sys.scheduler/scheduler.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  SchedulerConfigSchema,
  StartSchedulerParamsSchema,
  StopSchedulerParamsSchema,
  TickParamsSchema,
  SchedulerStatusParamsSchema,
} from './scheduler.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.scheduler', typeof SchedulerConfigSchema> {
    'sys.scheduler.start': {
      params: typeof StartSchedulerParamsSchema;
      returns: z.ZodObject<{ started: z.ZodBoolean; tickIntervalMs: z.ZodNumber }>;
    };

    'sys.scheduler.stop': {
      params: typeof StopSchedulerParamsSchema;
      returns: z.ZodObject<{ stopped: z.ZodBoolean; reason: z.ZodString }>;
    };

    'sys.scheduler.tick': {
      params: typeof TickParamsSchema;
      returns: z.ZodObject<{
        directivesProcessed: z.ZodNumber;
        zombiesRecovered: z.ZodNumber;
        tickDurationMs: z.ZodNumber;
      }>;
    };

    'sys.scheduler.status': {
      params: typeof SchedulerStatusParamsSchema;
      returns: typeof SchedulerConfigSchema;
    };
  }
}
