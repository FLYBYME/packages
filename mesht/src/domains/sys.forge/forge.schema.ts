// FILE: src/domains/sys.forge/forge.schema.ts
import { z } from 'zod';
import { JSONObjectSchema, JSONValueSchema } from '../../shared/json.schema';

export const ForgeStatusEnum = z.enum(['pending_approval', 'active', 'quarantined']);
export type ForgeStatus = z.infer<typeof ForgeStatusEnum>;

/**
 * ForgeTool — A dynamically generated tool produced by an agent.
 */
export const ForgeToolSchema = z.object({
  id: z.string().describe('Primary Key (UUID).'),
  name: z.string().describe('Unique tool name (snake_case).'),
  description: z.string().describe('Description for the LLM tool registry.'),
  inputSchema: z.string().describe('JSON representation of the expected parameters.'),
  code: z.string().describe('JavaScript function body to execute in sandbox.'),
  status: ForgeStatusEnum.default('pending_approval'),
  authorTaskID: z.string().optional().describe('The directive that originated this tool.'),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export type ForgeTool = z.infer<typeof ForgeToolSchema>;

// --- Action Parameters ---

export const ProposeToolParamsSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.string(),
  code: z.string(),
  authorTaskID: z.string().optional(),
});
export type ProposeToolParams = z.infer<typeof ProposeToolParamsSchema>;

export const ApproveToolParamsSchema = z.object({
  id: z.string(),
  status: ForgeStatusEnum,
});
export type ApproveToolParams = z.infer<typeof ApproveToolParamsSchema>;

export const ExecuteForgedToolParamsSchema = z.object({
  toolName: z.string(),
  arguments: JSONObjectSchema,
});
export type ExecuteForgedToolParams = z.infer<typeof ExecuteForgedToolParamsSchema>;

export const ExecuteForgedToolResultSchema = z.object({
  success: z.boolean(),
  result: JSONValueSchema.optional(),
  error: z.string().optional(),
});

export type ExecuteForgedToolResult = z.infer<typeof ExecuteForgedToolResultSchema>;
