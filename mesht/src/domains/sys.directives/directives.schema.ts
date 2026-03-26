// FILE: src/domains/sys.directives/directives.schema.ts
import { z } from 'zod';

// ─── Transition History Entry ───────────────────────────────────

export const TransitionEntrySchema = z.object({
  fromNode: z.string().describe('Node ID transitioned from.'),
  toNode: z.string().describe('Node ID transitioned to.'),
  timestamp: z.number().int().describe('Unix MS timestamp of the transition.'),
  actorID: z.string().optional().describe('PersonaID or NodeID that triggered the transition.'),
  trigger: z.string().optional().describe('The logical trigger/verdict that caused the transition.'),
  output: z.record(z.string(), z.any()).default({}).describe('Output payload from the executed node.'),
});

export type TransitionEntry = z.infer<typeof TransitionEntrySchema>;

// ─── Database Schema ────────────────────────────────────────────

export const DirectiveSchema = z.object({
  id: z.string().describe('Primary Key.'),
  parentID: z.string().optional().describe('For sub-task tracking. Null if top-level.'),
  projectId: z.string().optional().describe('The project this directive belongs to.'),
  title: z.string().describe('Human-readable name for the task.'),
  artifactId: z.string().describe('Foreign Key → sys.artifacts.artifactId. The Protocol FSM governing execution.'),
  status: z.enum(['initialized', 'running', 'paused', 'completed', 'failed', 'cancelled', 'blocked_merge_conflict']).default('initialized'),
  stateContext: z.record(z.string(), z.any()).default({}).describe('Shared memory — stores current reality for the FSM.'),
  currentNode: z.string().default('').describe('ID of the active node in the Protocol graph.'),
  history: z.array(TransitionEntrySchema).default([]).describe('Log of all state transitions.'),
  assignedPersona: z.string().optional().describe('Persona alias currently executing this directive.'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  lockHolder: z.string().optional().describe('NodeID holding the execution lock.'),
  lockAcquiredAt: z.number().int().optional().describe('Unix MS when lock was acquired.'),
  createdAt: z.number().int().describe('Unix MS timestamp of creation.'),
  lastStepAt: z.number().int().optional().describe('Unix MS timestamp of the last step execution.'),
});

export type Directive = z.infer<typeof DirectiveSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const CreateDirectiveParamsSchema = z.object({
  artifactId: z.string().describe('The artifact ID of the protocol to execute (from sys.artifacts).'),
  title: z.string().describe('Human-readable name for this directive.'),
  projectId: z.string().optional().describe('The project this directive belongs to.'),
  parentID: z.string().optional(),
  stateContext: z.record(z.string(), z.any()).default({}).describe('Initial shared memory state.'),
  assignedPersona: z.string().optional().describe('Optionally assign a specific persona.'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
});

export const StepDirectiveParamsSchema = z.object({
  id: z.string().describe('The directive to advance by one step.'),
});

export const UpdateContextParamsSchema = z.object({
  id: z.string(),
  contextMutation: z.record(z.string(), z.any()).describe('Key-value pairs to deep merge into stateContext.'),
  status: z.enum(['initialized', 'running', 'paused', 'completed', 'failed', 'cancelled', 'blocked_merge_conflict']).optional().describe('Optionally update status.'),
});

export const ResumeDirectivesParamsSchema = z.object({
  staleThresholdMs: z.number().int().positive().default(60000).describe('Consider stale if no step in this many ms.'),
});

export const ResolveApprovalParamsSchema = z.object({
  id: z.string().describe('The directive ID to resolve.'),
  verdict: z.string().describe('The logical trigger to apply for the transition (e.g. APPROVED, REJECTED).'),
  feedback: z.string().optional().describe('Optional operator feedback added to stateContext.'),
});

export type ResolveApprovalParams = z.infer<typeof ResolveApprovalParamsSchema>;

export const ResolveApprovalMutationSchema = z.object({
  _human_verdict: z.string(),
  _human_feedback: z.string().optional(),
});

export type ResolveApprovalMutation = z.infer<typeof ResolveApprovalMutationSchema>;

export const CancelDirectiveParamsSchema = z.object({
  id: z.string().describe('The directive to cancel.'),
  reason: z.string().default('Cancelled by operator.'),
});

export const AcquireLockParamsSchema = z.object({
  id: z.string(),
  nodeID: z.string().describe('The node requesting the lock.'),
});

export const ReleaseLockParamsSchema = z.object({
  id: z.string(),
  nodeID: z.string().describe('The node releasing the lock.'),
});

export const ListByStatusParamsSchema = z.object({
  status: z.enum(['initialized', 'running', 'paused', 'completed', 'failed', 'cancelled', 'blocked_merge_conflict']),
  limit: z.number().int().positive().default(50),
});

export const DirectiveStepResultSchema = z.object({
  id: z.string(),
  currentNode: z.string(),
  status: z.string(),
  nextAction: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
});

export type DirectiveStepResult = z.infer<typeof DirectiveStepResultSchema>;

export const UpdateContextResultSchema = z.object({
  id: z.string(),
  stateContext: z.record(z.string(), z.unknown()),
});

export type UpdateContextResult = z.infer<typeof UpdateContextResultSchema>;

export const ResumeDirectivesResultSchema = z.object({
  resumed: z.array(z.string()),
  count: z.number(),
});

export type ResumeDirectivesResult = z.infer<typeof ResumeDirectivesResultSchema>;

export const AcquireLockResultSchema = z.object({
  acquired: z.boolean(),
  id: z.string(),
});

export type AcquireLockResult = z.infer<typeof AcquireLockResultSchema>;

export const ReleaseLockResultSchema = z.object({
  released: z.boolean(),
  id: z.string(),
});

export type ReleaseLockResult = z.infer<typeof ReleaseLockResultSchema>;
