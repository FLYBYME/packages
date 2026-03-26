// FILE: src/domains/sys.tools/tools.schema.ts
import { z } from 'zod';
import { JSONObjectSchema, JSONValueSchema } from '../../shared/json.schema';

// ─── Tool Parameter Schema ─────────────────────────────────────

export const ToolParameterSchema = z.object({
  name: z.string().describe('Parameter name.'),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']).describe('JSON type.'),
  description: z.string().describe('What this parameter does.'),
  required: z.boolean().default(false),
  defaultValue: JSONValueSchema.optional(),
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;

// ─── Database Schema ────────────────────────────────────────────

export const ToolSchema = z.object({
  id: z.string().describe('Primary Key.'),
  name: z.string().describe('Unique Index. Canonical tool name (e.g., fs_read, shell_exec, git_diff).'),
  description: z.string().describe('Human-readable description of the tool capability.'),
  category: z.enum([
    'filesystem',
    'shell',
    'git',
    'network',
    'database',
    'analysis',
    'generation',
    'communication',
    'custom',
  ]).default('custom').describe('Capability domain category.'),
  handler: z.string().describe(
    'Broker action name to invoke when the tool is called (e.g., sys.eng.fs_read).'
  ),
  parameters: z.array(ToolParameterSchema).default([]).describe('Input parameters for the tool.'),
  inputSchemaJSON: z.string().optional().describe('Raw JSON schema for dynamic tools.'),
  dynamic: z.boolean().default(false).describe('True if this tool was forged dynamically.'),
  outputSchema: JSONObjectSchema.default({}).describe(
    'JSON schema describing expected output shape.'
  ),
  riskLevel: z.enum(['safe', 'moderate', 'dangerous']).default('moderate').describe(
    'Risk classification for governance checks.'
  ),
  requiresApproval: z.boolean().default(false).describe(
    'If true, this tool requires operator approval before execution.'
  ),
  status: z.enum(['active', 'disabled', 'deprecated']).default('active'),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
});

export type Tool = z.infer<typeof ToolSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const RegisterToolParamsSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum([
    'filesystem', 'shell', 'git', 'network', 'database',
    'analysis', 'generation', 'communication', 'custom',
  ]).default('custom'),
  handler: z.string().describe('Broker action name to invoke.'),
  parameters: z.array(ToolParameterSchema).default([]),
  outputSchema: JSONObjectSchema.default({}),
  riskLevel: z.enum(['safe', 'moderate', 'dangerous']).default('moderate'),
  requiresApproval: z.boolean().default(false),
});
export type RegisterToolParams = z.infer<typeof RegisterToolParamsSchema>;

export const ResolveToolBeltParamsSchema = z.object({
  toolNames: z.array(z.string()).describe('List of tool names to resolve into OpenAI function calling format.'),
});
export type ResolveToolBeltParams = z.infer<typeof ResolveToolBeltParamsSchema>;

export const InvokeToolParamsSchema = z.object({
  toolName: z.string().describe('The tool to invoke.'),
  arguments: JSONObjectSchema.describe('Arguments to pass to the tool handler.'),
  projectId: z.string().describe('The project context for tool execution.'),
  id: z.string().optional().describe('Originating directive for audit linkage.'),
  personaId: z.string().optional().describe('Invoking persona for authorization checks.'),
});
export type InvokeToolParams = z.infer<typeof InvokeToolParamsSchema>;

export const InvokeToolResultSchema = z.object({
  success: z.boolean(),
  result: JSONValueSchema,
  toolName: z.string(),
  latencyMs: z.number(),
  pendingApproval: z.boolean().optional(),
  approvalId: z.string().optional(),
});

export type InvokeToolResult = z.infer<typeof InvokeToolResultSchema>;

export const DisableToolParamsSchema = z.object({
  name: z.string().describe('The tool to disable.'),
  reason: z.string().default('Disabled by operator.'),
});
export type DisableToolParams = z.infer<typeof DisableToolParamsSchema>;

export const ResolveApprovalParamsSchema = z.object({
  approvalId: z.string().describe('The pending approval ID to resolve.'),
  id: z.string().describe('The directive that triggered the tool call.'),
  toolName: z.string().describe('The tool that requires approval.'),
  approved: z.boolean().describe('Whether the operator approved or rejected.')
});
export type ResolveApprovalParams = z.infer<typeof ResolveApprovalParamsSchema>;

export const ToolsEmptyParamsSchema = z.object({});
export type ToolsEmptyParams = z.infer<typeof ToolsEmptyParamsSchema>;

// ─── Specialist CLI Worker Schemas ─────────────────────────────

export const SpecialistEnum = z.enum(['gemini', 'copilot', 'opencode']);
export type Specialist = z.infer<typeof SpecialistEnum>;

export const DelegateToSpecialistParamsSchema = z.object({
  specialist: SpecialistEnum,
  prompt: z.string().describe('The specific objective or question for the sub-agent.'),
  projectId: z.string().describe('The project context for tool execution.'),
  model: z.string().optional().describe('Optional specific model to use.'),
  hints: z.array(z.string()).optional().describe('Optional hints. Use "simple" to prioritize faster/cheaper models.'),
  files: z.array(z.string()).optional().describe('Specific file paths the worker should be aware of.'),
  cwd: z.string().optional().describe('The directory the CLI command should be executed in.'),
  id: z.string().optional().describe('Originating directive ID for process tracking.'),
});
export type DelegateToSpecialistParams = z.infer<typeof DelegateToSpecialistParamsSchema>;

export const DelegateToSpecialistResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  exitCode: z.number(),
  stderr: z.string(),
});
export type DelegateToSpecialistResult = z.infer<typeof DelegateToSpecialistResultSchema>;

export const SpecialistSettingsSchema = z.object({
  id: z.string().describe('Primary Key. Singleton ID "global".'),
  geminiEnabled: z.boolean().default(true),
  copilotEnabled: z.boolean().default(true),
  opencodeEnabled: z.boolean().default(true),
  specialistTimeoutMs: z.number().default(300000),
});

export const QuotaLockSchema = z.object({
  id: z.string().describe('Primary Key.'),
  specialist: SpecialistEnum.optional(),
  model: z.string().optional(),
  reason: z.string(),
  disabledUntil: z.number().int().describe('Unix MS timestamp.'),
});

export type SpecialistSettings = z.infer<typeof SpecialistSettingsSchema>;
export type QuotaLock = z.infer<typeof QuotaLockSchema>;

export const RegisterDynamicToolParamsSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.string(),
  handler: z.string(),
  metadata: JSONObjectSchema.optional(),
});
export type RegisterDynamicToolParams = z.infer<typeof RegisterDynamicToolParamsSchema>;

export const SpecialistSettingsUpdateParamsSchema = z.object({
  geminiEnabled: z.boolean().optional(),
  geminiModels: z.array(z.string()).optional(),
  copilotEnabled: z.boolean().optional(),
  copilotModels: z.array(z.string()).optional(),
  opencodeEnabled: z.boolean().optional(),
  opencodeModels: z.array(z.string()).optional(),
  specialistTimeoutMs: z.number().optional(),
});
export type SpecialistSettingsUpdateParams = z.infer<typeof SpecialistSettingsUpdateParamsSchema>;
