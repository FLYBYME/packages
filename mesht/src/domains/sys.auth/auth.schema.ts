// FILE: src/domains/sys.auth/auth.schema.ts
import { z } from 'zod';

export const IssueTicketParamsSchema = z.object({
  personaId: z.string().describe('The agent requesting the service ticket.'),
  targetDomain: z.string().describe('The domain or node to authorize access for (e.g., sys.eng, sys.tools).'),
  ttlMs: z.number().int().positive().default(3600000).describe('1 hour default TTL.'),
});

export type IssueTicketParams = z.infer<typeof IssueTicketParamsSchema>;

export const VerifyTicketParamsSchema = z.object({
  ticket: z.string().describe('The encrypted / signed service ticket.'),
});

export type VerifyTicketParams = z.infer<typeof VerifyTicketParamsSchema>;

export const ServiceTicketSchema = z.object({
  ticketId: z.string(),
  personaId: z.string(),
  targetDomain: z.string(),
  expiresAt: z.number().int(),
});

export type ServiceTicket = z.infer<typeof ServiceTicketSchema>;

export const IssueTicketResultSchema = z.object({
  ticket: z.string(),
});

export type IssueTicketResult = z.infer<typeof IssueTicketResultSchema>;

export const VerifyTicketResultSchema = z.object({
  valid: z.boolean(),
  personaId: z.string().optional(),
});

export type VerifyTicketResult = z.infer<typeof VerifyTicketResultSchema>;
