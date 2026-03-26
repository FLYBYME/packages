// FILE: src/domains/sys.audit/audit.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  AuditLogSchema,
  LogAuditParamsSchema,
  QueryAuditParamsSchema,
  PurgeAuditParamsSchema,
} from './audit.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.audit', typeof AuditLogSchema> {
    'sys.audit.log': {
      params: typeof LogAuditParamsSchema;
      returns: z.ZodObject<{ success: z.ZodLiteral<true> }>;
    };

    'sys.audit.query': {
      params: typeof QueryAuditParamsSchema;
      returns: z.ZodArray<typeof AuditLogSchema>;
    };

    'sys.audit.purge': {
      params: typeof PurgeAuditParamsSchema;
      returns: z.ZodObject<{ purgedCount: z.ZodNumber; dryRun: z.ZodBoolean }>;
    };
  }
}
