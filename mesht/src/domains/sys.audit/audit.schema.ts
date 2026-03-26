// FILE: src/domains/sys.audit/audit.schema.ts
import { z } from 'zod';

// ─── LLM Message Primitives ─────────────────────────────────────

export const SystemMessageSchema = z.object({
  role: z.literal('system'),
  content: z.string(),
});

export const UserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string(),
});

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()),
  }),
});

export const AssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().nullable(),
  tool_calls: z.array(ToolCallSchema).optional(),
});

export const ToolResultMessageSchema = z.object({
  role: z.literal('tool'),
  tool_call_id: z.string(),
  name: z.string(),
  content: z.string(),
});

export const CognitionTraceMessageSchema = z.union([
  SystemMessageSchema,
  UserMessageSchema,
  AssistantMessageSchema,
  ToolResultMessageSchema,
]);

// ─── Database Schema ────────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: z.string().describe('Primary Key.'),
  timestamp: z.number().int().describe('Unix MS timestamp. Immutable once written.'),
  traceId: z.string().optional().describe('Execution Span ID tying together a single FSM tick.'),
  attempt: z.number().optional().describe('Attempt number for this specific node in the directive lifecycle.'),
  directiveId: z.string().optional().describe('Directive ID this audit relates to.'),
  actor: z.object({
    nodeID: z.string().describe('Source node that initiated the action.'),
    personaID: z.string().optional().describe('Persona that initiated the action, if applicable.'),
    tenantID: z.string().optional().describe('Organization/tenant context.'),
  }).describe('Who performed the action.'),
  action: z.string().describe('Full broker action name (e.g., sys.personas.create).'),
  domain: z.string().describe('Bounded context (e.g., personas, artifacts, catalog).'),
  changeType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'AUTH', 'COGNITION_TRACE', 'COGNITION_PROGRESS']).describe('Category of the operation.'),
  payload: z.any().default({}).describe('Input parameters, "Before" state, or Cognition Trace Array.'),
  diff: z.record(z.string(), z.any()).default({}).describe('Delta of the change for UPDATE operations.'),
  status: z.enum(['SUCCESS', 'FAILURE']).describe('Outcome of the operation.'),
  
  // LLM Execution Metadata
  promptTokens: z.number().int().optional(),
  completionTokens: z.number().int().optional(),
  finishReason: z.string().optional(),
  modelUsed: z.string().optional(),
  latencyMs: z.number().int().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const LogAuditParamsSchema = z.object({
  traceId: z.string().optional(),
  attempt: z.number().optional(),
  directiveId: z.string().optional(),
  actor: z.object({
    nodeID: z.string(),
    personaID: z.string().optional(),
    tenantID: z.string().optional(),
  }),
  action: z.string(),
  domain: z.string(),
  changeType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'AUTH', 'COGNITION_TRACE', 'COGNITION_PROGRESS']),
  payload: z.any().default({}),
  diff: z.record(z.string(), z.any()).default({}),
  status: z.enum(['SUCCESS', 'FAILURE']),
  
  promptTokens: z.number().int().optional(),
  completionTokens: z.number().int().optional(),
  finishReason: z.string().optional(),
  modelUsed: z.string().optional(),
  latencyMs: z.number().int().optional(),
});

export const QueryAuditParamsSchema = z.object({
  domain: z.string().optional().describe('Filter by bounded context.'),
  actorNodeID: z.string().optional().describe('Filter by source node.'),
  changeType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'AUTH', 'COGNITION_TRACE', 'COGNITION_PROGRESS']).optional(),
  fromTimestamp: z.number().int().optional().describe('Start of time range (Unix MS).'),
  toTimestamp: z.number().int().optional().describe('End of time range (Unix MS).'),
  directiveId: z.string().optional().describe('Filter by directive ID for trace lookups.'),
  traceId: z.string().optional().describe('Filter by specific execution span.'),
  limit: z.number().int().positive().default(100),
});

export const PurgeAuditParamsSchema = z.object({
  olderThanMs: z.number().int().positive().describe('Retention period in ms. Logs older are archived/removed.'),
  dryRun: z.boolean().default(true).describe('If true, returns count without deleting.'),
});
