import { z } from 'zod';
import { SubmitDirectiveParamsSchema, SubmitDirectiveResultSchema, StartReplParamsSchema } from './interface.schema';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry {
    'sys.interface.submit': {
      params: typeof SubmitDirectiveParamsSchema,
      returns: typeof SubmitDirectiveResultSchema;
    };
    'sys.interface.start_repl': {
      params: typeof StartReplParamsSchema,
      returns: z.ZodVoid;
    };
  }
}
