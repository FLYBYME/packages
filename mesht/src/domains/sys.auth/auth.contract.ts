import { z } from 'zod';
import { IssueTicketParamsSchema, VerifyTicketParamsSchema } from './auth.schema';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry {
    'sys.auth.issue_ticket': {
      params: typeof IssueTicketParamsSchema,
      returns: z.ZodObject<{ ticket: z.ZodString }>;
    };
    'sys.auth.verify_ticket': {
      params: typeof VerifyTicketParamsSchema,
      returns: z.ZodObject<{ valid: z.ZodBoolean, personaId: z.ZodOptional<z.ZodString> }>;
    };
  }
}
