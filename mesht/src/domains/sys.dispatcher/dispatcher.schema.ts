// FILE: src/domains/sys.dispatcher/dispatcher.schema.ts
import { z } from 'zod';
import { JSONObjectSchema, JSONValueSchema } from '../../shared/json.schema';

// ─── Tool Call Format ───────────────────────────────────────────

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string().describe('JSON-encoded arguments string.'),
  }),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

// ─── LLM Message Format ────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().nullable(),
  name: z.string().optional().describe('Tool name when role=tool.'),
  tool_call_id: z.string().optional().describe('Tool call ID when role=tool.'),
  tool_calls: z.array(ToolCallSchema).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ─── Structured Output ──────────────────────────────────────────

export const FSM_VERDICTS = ["DONE", "ERROR", "RETRY", "SUCCESS", "FAILURE", "NEEDS_INPUT"] as const;

export const FinalVerdictSchema = z.object({
  verdict: z.enum(FSM_VERDICTS).describe("The final FSM transition verdict. You MUST choose one of these exact states."),
  response: z.string().describe("The final textual response, explanation, or summary of actions taken."),
});

export type FinalVerdict = z.infer<typeof FinalVerdictSchema>;

export const TokenUsageSchema = z.object({
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

// ─── Cognition Result ───────────────────────────────────────────

export const CognitionResultSchema = z.object({
  verdict: z.string().describe('The persona verdict/trigger for FSM edge resolution.'),
  response: z.string().describe('Final text response from the LLM.'),
  updatedContext: JSONObjectSchema.default({}).describe(
    'Mutations to merge into the directive stateContext.'
  ),
  toolCallsMade: z.number().int().default(0).describe('How many tool loops were executed.'),
  tokenUsage: TokenUsageSchema.optional(),
});

export type CognitionResult = z.infer<typeof CognitionResultSchema>;

// ─── Database Schema — Cognition Log ────────────────────────────

export const CognitionLogSchema = z.object({
  id: z.string().describe('Primary Key.'),
  directiveID: z.string().describe('Foreign Key → sys.directives.directiveID.'),
  personaId: z.string().describe('Persona alias that was invoked.'),
  nodeId: z.string().optional().describe('FSM node ID that triggered the cognition.'),
  objective: z.string().describe('The objective given to the persona.'),
  verdict: z.string().describe('The persona verdict for edge resolution.'),
  response: z.string().describe('Final LLM output.'),
  toolCallsMade: z.number().int().default(0),
  messageTrace: z.string().optional().describe('JSON encoded array of ChatMessage representing the raw prompt/response history.'),
  toolTrace: z.string().optional().describe('JSON encoded array of all tool calls and their raw results during this cycle.'),
  tokenUsage: z.string().optional().describe('JSON encoded token usage.'),
  latencyMs: z.number().int().describe('Total round-trip latency.'),
  status: z.enum(['success', 'error', 'timeout']).default('success'),
  errorMessage: z.string().optional(),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
});

export type CognitionLog = z.infer<typeof CognitionLogSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const DispatchCognitionParamsSchema = z.object({
  personaId: z.string().describe('Persona alias to invoke (from sys.personas).'),
  objective: z.string().describe('The objective/instruction for this cognition round.'),
  stateContext: JSONObjectSchema.default({}).describe(
    'Current shared memory from the directive.'
  ),
  id: z.string().describe('Originating directive for audit linkage.'),
  nodeId: z.string().optional().describe('FSM node ID that triggered the dispatch.'),
  traceId: z.string().optional().describe('Execution Span ID.'),
  attempt: z.number().int().optional().describe('Attempt number for this specific node.'),
  maxToolRoundsOverride: z.number().int().positive().optional().describe(
    'Override the persona maxToolRounds for this specific invocation.'
  ),
});
export type DispatchCognitionParams = z.infer<typeof DispatchCognitionParamsSchema>;

export const GetCognitionHistoryParamsSchema = z.object({
  id: z.string().describe('The directive to fetch cognition history for.'),
  limit: z.number().int().positive().default(20),
});
export type GetCognitionHistoryParams = z.infer<typeof GetCognitionHistoryParamsSchema>;

export const ToolTraceEntrySchema = z.object({
  tool: z.string(),
  args: JSONValueSchema.optional(),
  result: JSONValueSchema.optional(),
  error: z.string().optional(),
  status: z.enum(['success', 'error']),
});

export type ToolTraceEntry = z.infer<typeof ToolTraceEntrySchema>;

export const DispatcherCognitionStartedEventSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  objective: z.string(),
  timestamp: z.number(),
});

export const DispatcherToolCalledEventSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  arguments: JSONObjectSchema,
  result: JSONObjectSchema.or(z.array(JSONObjectSchema)).or(z.string()).or(z.number()).or(z.boolean()).or(z.null()),
  timestamp: z.number(),
});

export const DispatcherCognitionFinishedEventSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  projectId: z.string(),
  modelName: z.string(),
  verdict: z.string(),
  response: z.string(),
  tokenUsage: TokenUsageSchema.optional(),
  latencyMs: z.number(),
  timestamp: z.number(),
});

export const DispatcherCognitionProgressStageSchema = z.enum(['started', 'tool_result', 'verdict']);

export const DispatcherCognitionProgressEventSchema = z.object({
  id: z.string(),
  directiveId: z.string(),
  personaId: z.string().optional(),
  projectId: z.string().optional(),
  modelName: z.string().optional(),
  stage: DispatcherCognitionProgressStageSchema.describe('Current progress stage.'),
  detail: z.string().describe('Human readable description of the stage.'),
  timestamp: z.number().int().describe('Unix MS timestamp when this progress event was emitted.'),
  messages: z.array(ChatMessageSchema).optional(),
  toolTrace: z.array(ToolTraceEntrySchema).optional(),
  toolCallsMade: z.number().int().optional(),
});

export type DispatcherCognitionProgressEvent = z.infer<typeof DispatcherCognitionProgressEventSchema>;
