// FILE: src/domains/sys.artifacts/artifacts.schema.ts
import { z } from 'zod';

// ============================================================================
// Node Ontology — The building blocks of FSM Protocol graphs
// ============================================================================

/**
 * Persona Node — An intellect state that invokes the LLMAdapter with a
 * persona's system prompt + a node-specific objective.
 */
export const PersonaNodeSchema = z.object({
  nodeId: z.string().describe('Unique ID within the manifest graph.'),
  type: z.literal('persona'),
  personaId: z.string().describe('Foreign Key → sys.personas.personaID.'),
  nodeObjective: z.string().describe('Node-specific instruction injected into the LLMAdapter system prompt.'),
  capabilityWhitelist: z.array(z.string()).default([]).describe(
    "Subset of the Persona's allowed tools permitted in this node."
  ),
  inputMapping: z.record(z.string(), z.string()).default({}).describe(
    'Maps global State Context keys → Persona prompt context fields.'
  ),
  outputMapping: z.record(z.string(), z.object({
    contextKey: z.string().describe('Target key in global State Context.'),
    strategy: z.enum(['APPEND', 'OVERWRITE', 'NEST']).default('OVERWRITE').describe('Merge strategy.'),
  })).default({}).describe(
    "Defines how the Persona's final response is merged back into global context."
  ),
});

export type PersonaNode = z.infer<typeof PersonaNodeSchema>;

/**
 * Gate Node — A lightweight logical router that evaluates a condition on the
 * State Context to determine the transition path without a full cognitive loop.
 */
export const GateNodeSchema = z.object({
  nodeId: z.string().describe('Unique ID within the manifest graph.'),
  type: z.literal('gate'),
  evaluatorType: z.enum(['static_logic', 'judge_persona', 'human_review']).describe(
    'static_logic = simple field checks, judge_persona = summative LLM assessment, human_review = operator approval.'
  ),
  nodeObjective: z.string().optional().describe('Node-specific instruction or prompt for the review/evaluation.'),
  contextPath: z.string().describe('The specific key in Shared Memory to evaluate.'),
  inputMapping: z.record(z.string(), z.string()).default({}).describe(
    'Maps global State Context keys → evaluator input fields.'
  ),
  outputMapping: z.record(z.string(), z.object({
    contextKey: z.string(),
    strategy: z.enum(['APPEND', 'OVERWRITE', 'NEST']).default('OVERWRITE'),
  })).default({}).describe('Gate evaluation results merged into context.'),
});

export type GateNode = z.infer<typeof GateNodeSchema>;

/**
 * Terminal Node — An end-state that produces the final result of the Protocol.
 */
export const TerminalNodeSchema = z.object({
  nodeId: z.string().describe('Unique ID within the manifest graph.'),
  type: z.literal('terminal'),
  resolution: z.enum(['SUCCESS', 'FAILURE']).describe('Outcome classification.'),
  outputTemplate: z.string().describe(
    'Instructions for mapping the final Shared Memory state into a user-facing response.'
  ),
});

export type TerminalNode = z.infer<typeof TerminalNodeSchema>;

/**
 * Discriminated union of all node types.
 */
export const FSMNodeSchema = z.discriminatedUnion('type', [
  PersonaNodeSchema,
  GateNodeSchema,
  TerminalNodeSchema,
]);

export type FSMNode = z.infer<typeof FSMNodeSchema>;

// ============================================================================
// Transition Logic (Edges)
// ============================================================================

export const EdgeSchema = z.object({
  fromNode: z.string().describe('The originating state nodeId.'),
  toNode: z.string().describe('The destination state nodeId.'),
  trigger: z.string().describe(
    'Condition for activation. For Persona nodes: the Verdict/Finish Reason. ' +
    'For Gate nodes: a deterministic comparison (e.g., status == "vulnerable").'
  ),
});

export type Edge = z.infer<typeof EdgeSchema>;

// ============================================================================
// Circuit Breakers — Runtime Constraints
// ============================================================================

export const CircuitBreakersSchema = z.object({
  maxTransitions: z.number().int().positive().describe('Max state hops to prevent infinite cycles.'),
  globalTimeoutMs: z.number().int().positive().describe('Maximum real-time duration for a single Directive run.'),
});

export type CircuitBreakers = z.infer<typeof CircuitBreakersSchema>;

// ============================================================================
// Full FSM Manifest
// ============================================================================

export const FSMManifestSchema = z.object({
  initialNodeId: z.string().describe('ID of the node where the directive begins execution.'),
  sharedMemorySchema: z.record(z.string(), z.any()).describe(
    'Zod-compatible JSON Schema defining the shape of the State Context.'
  ),
  circuitBreakers: CircuitBreakersSchema,
  nodes: z.array(FSMNodeSchema).min(1).describe('Array of all graph nodes.'),
  edges: z.array(EdgeSchema).describe('Conditional transition rules between nodes.'),
});

export type FSMManifest = z.infer<typeof FSMManifestSchema>;

// ============================================================================
// Artifact Metadata
// ============================================================================

export const ArtifactMetadataSchema = z.object({
  version: z.string().default('1.0.0').describe('Semantic version of the artifact.'),
  author: z.string().describe('Creator of the artifact (persona alias, user ID, etc.).'),
  tags: z.array(z.string()).default([]).describe('Categorization tags.'),
  createdAt: z.number().int().describe('Unix MS timestamp of creation.'),
  updatedAt: z.number().int().optional().describe('Unix MS timestamp of last update.'),
});

export type ArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;

// ============================================================================
// Database Schema — Unified Artifact Record
// ============================================================================

export const ArtifactSchema = z.object({
  id: z.string().describe('Primary Key (e.g., prot_secure_forge_v1).'),
  type: z.enum(['capability', 'protocol']).describe('Capability = atomic tool, Protocol = FSM graph.'),
  name: z.string().describe('Human-readable name for the artifact.'),
  description: z.string().describe('Purpose and behavior summary.'),
  manifest: FSMManifestSchema.optional().describe(
    'The FSM definition. Required when type === protocol, omitted for capabilities.'
  ),
  schema: z.record(z.string(), z.any()).optional().describe(
    'Formal schema and metadata for capabilities (atomic tool blueprints).'
  ),
  metadata: ArtifactMetadataSchema,
});

export type Artifact = z.infer<typeof ArtifactSchema>;

// ============================================================================
// Action Parameter Schemas
// ============================================================================

export const RegisterArtifactParamsSchema = z.object({
  name: z.string().describe('Human-readable artifact name.'),
  type: z.enum(['capability', 'protocol']),
  description: z.string(),
  manifest: FSMManifestSchema.optional().describe('Required when type is protocol.'),
  metadata: z.object({
    version: z.string().default('1.0.0'),
    author: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

export const ValidateProtocolParamsSchema = z.object({
  manifest: FSMManifestSchema.describe('The FSM manifest to validate.'),
});
