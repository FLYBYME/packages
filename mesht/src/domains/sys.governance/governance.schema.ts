// FILE: src/domains/sys.governance/governance.schema.ts
import { z } from 'zod';
import { JSONObjectSchema } from '../../shared/json.schema';

// ============================================================================
// Constitutional Ledger — Immutable (high-quorum) core rules
// ============================================================================

export const ConstitutionalRuleSchema = z.object({
  ruleId: z.string().describe('Unique rule identifier (e.g., CONST-001).'),
  text: z.string().describe('The full text of the constitutional constraint.'),
  domain: z.string().optional().describe('Bounded context this rule applies to (omit for global rules).'),
  severity: z.enum(['HARD', 'SOFT']).default('HARD').describe(
    'HARD = immediate rejection on violation, SOFT = warning only.'
  ),
  proposedBy: z.string().describe('Persona alias or human operator who authored the rule.'),
  status: z.enum(['proposed', 'ratified', 'rejected']).default('proposed').describe(
    'Ratification state of the constitutional rule.'
  ),
  proposedAt: z.number().int().describe('Unix MS timestamp when the rule was proposed.'),
  ratifiedAt: z.number().int().optional().describe('Unix MS timestamp when the rule was ratified.'),
  reviewedAt: z.number().int().optional().describe('Unix MS timestamp when the proposal was reviewed.'),
  reviewedBy: z.string().optional().describe('Persona or operator that reviewed the proposal.'),
  reviewNotes: z.string().optional().describe('Optional review rationale.'),
});

export type ConstitutionalRule = z.infer<typeof ConstitutionalRuleSchema>;

// ============================================================================
// 5-Year Plan — Strategic Roadmap
// ============================================================================

export const MilestoneSchema = z.object({
  milestoneId: z.string().describe('Unique milestone identifier.'),
  title: z.string().describe('Short description of the KPI.'),
  targetDomain: z.string().describe('Domain this milestone tracks (e.g., sys.personas, sys.artifacts).'),
  metric: z.string().describe('Measurable KPI (e.g., "active_nodes", "protocol_count").'),
  targetValue: z.number().describe('Target numeric value for the KPI.'),
  currentValue: z.number().default(0).describe('Current progress.'),
  status: z.enum(['pending', 'in_progress', 'achieved', 'missed']).default('pending'),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

export const BudgetAllocationSchema = z.object({
  department: z.string().describe('Domain or department name.'),
  maxTokens: z.number().int().positive().describe('Max LLM token budget per cycle.'),
  maxComputeMs: z.number().int().positive().describe('Max compute time in ms per cycle.'),
  usedTokens: z.number().int().default(0),
  usedComputeMs: z.number().int().default(0),
});

export type BudgetAllocation = z.infer<typeof BudgetAllocationSchema>;

export const FiveYearPlanSchema = z.object({
  planId: z.string().describe('Primary Key.'),
  title: z.string().describe('Plan name (e.g., "MeshT Expansion Phase I").'),
  period: z.object({
    startDate: z.string().describe('ISO 8601 start date.'),
    endDate: z.string().describe('ISO 8601 end date.'),
  }),
  milestones: z.array(MilestoneSchema).default([]),
  budgetAllocations: z.array(BudgetAllocationSchema).default([]),
  status: z.enum(['draft', 'active', 'completed', 'superseded']).default('draft'),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
});

export type FiveYearPlan = z.infer<typeof FiveYearPlanSchema>;

// ============================================================================
// Lifecycle Phases
// ============================================================================

export const LifecyclePhaseSchema = z.enum(['BIRTH', 'GROWTH', 'MATURITY', 'RENEWAL']);
export type LifecyclePhase = z.infer<typeof LifecyclePhaseSchema>;

// ============================================================================
// Database Schema — Governance Record (Unified Ledger)
// ============================================================================

export const DispatchPolicySchema = z.object({
  modelOverride: z.string().optional().describe('Optional cheaper model to force for future cognition loops.'),
  circuitBreakerActive: z.boolean().default(false).describe('If true, governance has tripped a global breaker.'),
  circuitBreakerReason: z.string().optional().describe('Reason for current circuit breaker state.'),
  updatedAt: z.number().int().optional().describe('Last governance dispatch policy update.'),
});

export type DispatchPolicy = z.infer<typeof DispatchPolicySchema>;

export const GovernanceSchema = z.object({
  governanceId: z.string().describe('Primary Key. Singleton ID for the governance state.'),
  constitution: z.array(ConstitutionalRuleSchema).default([]).describe('The Constitutional Ledger.'),
  activePlanId: z.string().optional().describe('Foreign Key → active FiveYearPlan.planId.'),
  dispatchPolicy: DispatchPolicySchema.default({ circuitBreakerActive: false }).describe('Runtime dispatch constraints enforced by governance.'),
  lifecyclePhase: LifecyclePhaseSchema.default('BIRTH').describe('Current organization lifecycle phase.'),
  phaseHistory: z.array(z.object({
    phase: LifecyclePhaseSchema,
    enteredAt: z.number().int(),
    exitedAt: z.number().int().optional(),
  })).default([]),
  lastConstitutionalConvention: z.number().int().optional().describe('Timestamp of last ratification.'),
});

export type Governance = z.infer<typeof GovernanceSchema>;

// Separate table for plans
export const GovernancePlanSchema = FiveYearPlanSchema;

// ============================================================================
// Action Parameter Schemas
// ============================================================================

export const ProposeRuleParamsSchema = z.object({
  text: z.string().describe('The full text of the proposed constitutional rule.'),
  domain: z.string().optional().describe('Specific domain scope, or omit for global.'),
  severity: z.enum(['HARD', 'SOFT']).default('HARD'),
  proposedBy: z.string().describe('Persona alias or human operator authoring the rule.'),
});

export const ProposeRuleResultSchema = z.object({
  ruleId: z.string(),
  ratified: z.boolean(),
  status: z.enum(['proposed', 'ratified', 'rejected']),
});

export type ProposeRuleResult = z.infer<typeof ProposeRuleResultSchema>;

export const VerifyComplianceParamsSchema = z.object({
  artifactId: z.string().optional().describe('The sys.artifacts artifact ID to verify against the constitution.'),
  manifest: JSONObjectSchema.optional().describe(
    'Optional manifest override. If omitted, fetched from sys.artifacts.'
  ),
  toolName: z.string().optional().describe('Optional tool name under evaluation.'),
  arguments: JSONObjectSchema.optional().describe('Arguments for the tool invocation under review.'),
  domain: z.string().optional().describe('Execution domain being checked.'),
  personaId: z.string().optional().describe('Persona requesting the action.'),
  projectId: z.string().optional().describe('Project context for compliance review.'),
  directiveId: z.string().optional().describe('Directive context for compliance review.'),
});

export const ComplianceViolationSchema = z.object({
  ruleId: z.string(),
  text: z.string(),
  severity: z.enum(['HARD', 'SOFT']),
});

export const VerifyComplianceResultSchema = z.object({
  compliant: z.boolean(),
  rationale: z.string(),
  evaluatedBy: z.string(),
  violations: z.array(ComplianceViolationSchema),
});

export type VerifyComplianceResult = z.infer<typeof VerifyComplianceResultSchema>;

export const RatifyRuleParamsSchema = z.object({
  ruleId: z.string().describe('Rule identifier to ratify or reject.'),
  approved: z.boolean().describe('Whether the rule is ratified or rejected.'),
  reviewedBy: z.string().describe('Persona or operator making the ratification decision.'),
  reviewNotes: z.string().optional().describe('Optional rationale for the decision.'),
});

export type RatifyRuleParams = z.infer<typeof RatifyRuleParamsSchema>;

export const UpdateRoadmapParamsSchema = z.object({
  planId: z.string().describe('The plan to update.'),
  milestoneUpdates: z.array(z.object({
    milestoneId: z.string(),
    currentValue: z.number().optional(),
    status: z.enum(['pending', 'in_progress', 'achieved', 'missed']).optional(),
  })).default([]),
  budgetUpdates: z.array(z.object({
    department: z.string(),
    usedTokens: z.number().int().optional(),
    usedComputeMs: z.number().int().optional(),
  })).default([]),
});

export const AdvanceCycleParamsSchema = z.object({
  targetPhase: LifecyclePhaseSchema.describe('The lifecycle phase to transition to.'),
  reason: z.string().describe('Justification for the phase transition.'),
});

export const CreatePlanParamsSchema = z.object({
  title: z.string(),
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  milestones: z.array(MilestoneSchema.omit({ currentValue: true, status: true })).default([]),
  budgetAllocations: z.array(BudgetAllocationSchema.omit({ usedTokens: true, usedComputeMs: true })).default([]),
});

export const GetActiveConstitutionParamsSchema = z.object({});

export type GetActiveConstitutionParams = z.infer<typeof GetActiveConstitutionParamsSchema>;

export const GetDispatchPolicyParamsSchema = z.object({});

export type GetDispatchPolicyParams = z.infer<typeof GetDispatchPolicyParamsSchema>;

export const JudgeComplianceViolationSchema = z.object({
  ruleId: z.string().optional(),
});

export type JudgeComplianceViolation = z.infer<typeof JudgeComplianceViolationSchema>;

export const JudgeComplianceResponseSchema = z.object({
  compliant: z.boolean().optional(),
  rationale: z.string().optional(),
  violations: z.array(JudgeComplianceViolationSchema).optional(),
});

export type JudgeComplianceResponse = z.infer<typeof JudgeComplianceResponseSchema>;
