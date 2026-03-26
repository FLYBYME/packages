// FILE: src/domains/sys.personas/personas.schema.ts
import { z } from 'zod';

// ─── Database Schema ────────────────────────────────────────────

export const PersonaSchema = z.object({
  id: z.string().describe('Primary Key.'),
  alias: z.string().describe('Unique Index. Logical name for routing (e.g., ralph_core, architect, judge).'),
  traits: z.array(z.string()).default([]).describe(
    'Personality traits (e.g., [analytical, rigorous, proactive, state-driven]).'
  ),
  role: z.enum(['operator', 'general_secretary', 'architect', 'judge', 'worker']).default('worker').describe(
    'Authorization role. operator = human, general_secretary = governance, architect = structural, judge = audit.'
  ),
  leaning: z.enum(['left', 'center', 'right']).default('center').describe('Philosophical alignment.'),
  systemPrompt: z.string().describe('Base behavioral instructions and personality for the LLM.'),
  llmDeploymentAlias: z.string().describe('Foreign Key → sys.catalog.alias. Which model this persona uses.'),
  allowedTools: z.array(z.string()).default([]).describe('Foreign Keys → sys.tools.name. Capabilities this persona can invoke.'),
  maxToolRounds: z.number().int().positive().default(10).describe('Circuit breaker — max sequential tool invocations per reasoning loop.'),
  temperature: z.number().min(0).max(2).optional().describe('Override for the LLM creativity level.'),
  status: z.enum(['active', 'dormant', 'suspended']).default('dormant'),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
  lastActiveAt: z.number().int().optional().describe('Unix MS timestamp of last FSM invocation.'),
});

export type Persona = z.infer<typeof PersonaSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const CreatePersonaParamsSchema = z.object({
  alias: z.string().describe('The logical name for this persona.'),
  traits: z.array(z.string()).default([]).describe('Initial personality traits.'),
  role: z.enum(['operator', 'general_secretary', 'architect', 'judge', 'worker']).default('worker'),
  leaning: z.enum(['left', 'center', 'right']).default('center'),
  systemPrompt: z.string().describe('The base system prompt.'),
  llmDeploymentAlias: z.string().describe('Which LLM deployment to bind to (from sys.catalog).'),
  allowedTools: z.array(z.string()).default([]).describe('Initial tool belt.'),
  maxToolRounds: z.number().int().positive().default(10),
  temperature: z.number().min(0).max(2).optional(),
});

export const GetBlueprintParamsSchema = z.object({
  alias: z.string().describe('The persona alias to retrieve the blueprint for.'),
});

export const UpdateToolsParamsSchema = z.object({
  alias: z.string().describe('The persona alias.'),
  addTools: z.array(z.string()).default([]).describe('Tool names to add to the belt.'),
  removeTools: z.array(z.string()).default([]).describe('Tool names to remove from the belt.'),
});

export const ActivatePersonaParamsSchema = z.object({
  alias: z.string().describe('The persona alias to activate.'),
});

export const DeactivatePersonaParamsSchema = z.object({
  alias: z.string().describe('The persona alias to deactivate.'),
});


export const BlueprintSchema = z.object({
  persona: PersonaSchema,
  llmDeployment: z.object({
    baseURL: z.string().optional(),
    apiKey: z.string().optional(),
    modelName: z.string().optional(),
  }).catchall(z.unknown()),
  toolBelt: z.array(z.object({
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.string(), z.unknown()),
    }),
  })),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
