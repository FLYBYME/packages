// FILE: src/domains/sys.dispatcher/dispatcher.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  CognitionLogSchema,
  CognitionResultSchema,
  DispatchCognitionParamsSchema,
  GetCognitionHistoryParamsSchema,
  DispatcherCognitionFinishedEventSchema,
  DispatcherCognitionStartedEventSchema,
  DispatcherToolCalledEventSchema,
  DispatcherCognitionProgressEventSchema,
} from './dispatcher.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.dispatcher', typeof CognitionLogSchema> {
    'sys.dispatcher.dispatch_cognition': {
      params: typeof DispatchCognitionParamsSchema;
      returns: typeof CognitionResultSchema;
    };

    'sys.dispatcher.cognition_history': {
      params: typeof GetCognitionHistoryParamsSchema;
      returns: z.ZodArray<typeof CognitionLogSchema>;
    };
  }

  export interface IServiceEventRegistry {
    'sys.dispatcher.cognition_started': z.infer<typeof DispatcherCognitionStartedEventSchema>;
    'sys.dispatcher.tool_called': z.infer<typeof DispatcherToolCalledEventSchema>;
    'sys.dispatcher.cognition_finished': z.infer<typeof DispatcherCognitionFinishedEventSchema>;
    'sys.dispatcher.cognition_progress': z.infer<typeof DispatcherCognitionProgressEventSchema>;
  }
}
