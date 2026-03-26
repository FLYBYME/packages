// FILE: src/domains/sys.swarm/swarm.schema.ts
import { z } from 'zod';
import { JSONValueSchema } from '../../shared/json.schema';

export const DelegateTaskParamsSchema = z.object({
  id: z.string().describe('The directive to delegate to another node.'),
  targetNodeID: z.string().optional().describe('Specfic node to target, otherwise picks the best available.'),
  taskPayload: JSONValueSchema.describe('The context/data for the delegated task.'),
});

export type DelegateTaskParams = z.infer<typeof DelegateTaskParamsSchema>;

export const DelegateTaskResultSchema = z.object({
  success: z.boolean(),
  targetNodeID: z.string(),
});

export type DelegateTaskResult = z.infer<typeof DelegateTaskResultSchema>;

export const SwarmStatusSchema = z.object({
  activeNodes: z.number().int(),
  tasksInProgress: z.number().int(),
  heartbeats: z.record(z.string(), z.number()),
});
