// FILE: src/domains/sys.interface/interface.schema.ts
import { z } from 'zod';

export const InterfaceModeSchema = z.enum(['repl', 'cli', 'api']);

export const SubmitDirectiveParamsSchema = z.object({
  title: z.string().describe('Short name for the directive.'),
  objective: z.string().describe('Full textual objective for the agent.'),
  projectId: z.string().optional().describe('The project this directive belongs to.'),
  protocolId: z.string().default('prot_ralph_dev-loop_v120').describe('FSM protocol to use.'),
  personaId: z.string().optional().describe('Directly assign a persona.'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
});
export type SubmitDirectiveParams = z.infer<typeof SubmitDirectiveParamsSchema>;

export const SubmitDirectiveResultSchema = z.object({
  id: z.string(),
});

export type SubmitDirectiveResult = z.infer<typeof SubmitDirectiveResultSchema>;

export const InterfaceConfigSchema = z.object({
  mode: InterfaceModeSchema,
  enabled: z.boolean().default(true),
  prompt: z.string().default('mesht> '),
});

export const StartReplParamsSchema = z.object({});
export type StartReplParams = z.infer<typeof StartReplParamsSchema>;
