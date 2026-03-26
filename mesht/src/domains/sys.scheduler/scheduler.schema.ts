// FILE: src/domains/sys.scheduler/scheduler.schema.ts
import { z } from 'zod';

// ─── Scheduler Configuration ───────────────────────────────────

export const SchedulerConfigSchema = z.object({
  configId: z.string().default('scheduler-singleton'),
  tickIntervalMs: z.number().int().positive().default(5000).describe(
    'How often the scheduler main loop ticks (ms).'
  ),
  maxConcurrentDirectives: z.number().int().positive().default(5).describe(
    'Maximum directives actively being processed simultaneously.'
  ),
  zombieCheckIntervalMs: z.number().int().positive().default(60000).describe(
    'How often to check for zombie directives.'
  ),
  staleThresholdMs: z.number().int().positive().default(120000).describe(
    'A running directive is considered stale after this duration without a step.'
  ),
  enabled: z.boolean().default(true).describe('Whether the scheduler tick loop is active.'),
  lastTickAt: z.number().int().optional(),
  totalTickCount: z.number().int().default(0),
  totalDirectivesProcessed: z.number().int().default(0),
  status: z.enum(['idle', 'running', 'paused', 'error']).default('idle'),
});

export type SchedulerConfig = z.infer<typeof SchedulerConfigSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const StartSchedulerParamsSchema = z.object({
  tickIntervalMs: z.number().int().positive().optional(),
  maxConcurrentDirectives: z.number().int().positive().optional(),
});

export type StartSchedulerParams = z.infer<typeof StartSchedulerParamsSchema>;

export const StopSchedulerParamsSchema = z.object({
  reason: z.string().default('Stopped by operator.'),
});

export type StopSchedulerParams = z.infer<typeof StopSchedulerParamsSchema>;

export const TickParamsSchema = z.object({
  manual: z.boolean().default(false).describe('If true, this is a manual tick triggered by operator.'),
});

export type TickParams = z.infer<typeof TickParamsSchema>;

export const SchedulerStatusParamsSchema = z.object({});

export type SchedulerStatusParams = z.infer<typeof SchedulerStatusParamsSchema>;

export type SchedulerExecutionParams = StartSchedulerParams | TickParams | SchedulerStatusParams;
