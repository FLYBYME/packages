// FILE: src/domains/sys.catalog/catalog.schema.ts
import { z } from 'zod';
import { FilterObject, QueryOptions } from '@flybyme/isomorphic-database';

// ─── Database Schema ────────────────────────────────────────────

export const CatalogModelSchema = z.object({
  id: z.string().describe('Primary Key.'),
  alias: z.string().describe('Unique Index. Logical name for routing (e.g., gpt4o, claude-sonnet, deepseek-coder).'),
  providerId: z.string().describe('The LLM provider identifier (e.g., openai, anthropic, ollama).'),
  modelName: z.string().describe('The actual model identifier to send to the provider API.'),
  baseURL: z.string().optional().describe('Override base URL for the provider endpoint.'),
  apiKey: z.string().optional().describe('API key (stored encrypted at rest in production).'),
  maxContextTokens: z.number().int().positive().default(128000).describe('Max context window size in tokens.'),
  capabilities: z.array(z.string()).default([]).describe(
    'Feature flags (e.g., tool_use, vision, code_generation, reasoning).'
  ),
  status: z.enum(['active', 'disabled', 'provisioning', 'error']).default('provisioning'),
  quotas: z.object({
    maxTokensPerMinute: z.number().int().positive().default(100000),
    maxRequestsPerMinute: z.number().int().positive().default(60),
    usedTokensThisCycle: z.number().int().default(0),
    usedRequestsThisCycle: z.number().int().default(0),
  }).default({}),
  lastHealthCheck: z.number().int().optional().describe('Unix MS timestamp of last ping.'),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
});

export type CatalogModel = z.infer<typeof CatalogModelSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const EnableModelParamsSchema = z.object({
  alias: z.string().describe('Logical name for routing.'),
  providerId: z.string().describe('Provider identifier.'),
  modelName: z.string().describe('Model to register.'),
  baseURL: z.string().optional(),
  apiKey: z.string().optional(),
  maxContextTokens: z.number().int().positive().default(128000),
  capabilities: z.array(z.string()).default([]),
  quotas: z.object({
    maxTokensPerMinute: z.number().int().positive().default(100000),
    maxRequestsPerMinute: z.number().int().positive().default(60),
  }).optional(),
});
export type EnableModelParams = z.infer<typeof EnableModelParamsSchema>;

export const DeleteModelParamsSchema = z.object({
  alias: z.string().describe('The model alias to remove.'),
});
export type DeleteModelParams = z.infer<typeof DeleteModelParamsSchema>;

export const UpdateCapsParamsSchema = z.object({
  alias: z.string().describe('The model alias to update.'),
  addCapabilities: z.array(z.string()).default([]).describe('Capabilities to add.'),
  removeCapabilities: z.array(z.string()).default([]).describe('Capabilities to remove.'),
});
export type UpdateCapsParams = z.infer<typeof UpdateCapsParamsSchema>;

export const PingModelParamsSchema = z.object({
  alias: z.string().describe('The model alias to health-check.'),
});
export type PingModelParams = z.infer<typeof PingModelParamsSchema>;

export const UpdateModelParamsSchema = z.object({
  id: z.string().describe('The internal ID of the model to update.'),
  alias: z.string().optional(),
  providerId: z.string().optional(),
  modelName: z.string().optional(),
  baseURL: z.string().optional(),
  apiKey: z.string().optional(),
  maxContextTokens: z.number().int().positive().optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['active', 'disabled', 'provisioning', 'error']).optional(),
});
export type UpdateModelParams = z.infer<typeof UpdateModelParamsSchema>;

export const FindCatalogModelsParamsSchema = z.object({
  query: z.custom<FilterObject<typeof CatalogModelSchema>>().optional(),
  options: z.custom<QueryOptions<typeof CatalogModelSchema>>().optional(),
});
export type FindCatalogModelsParams = z.infer<typeof FindCatalogModelsParamsSchema>;
