// FILE: src/domains/sys.scheduler/scheduler.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  SchedulerConfigSchema,
  SchedulerConfig,
  SchedulerExecutionParams,
  SchedulerStatusParams,
  StartSchedulerParamsSchema,
  StartSchedulerParams,
  StopSchedulerParamsSchema,
  StopSchedulerParams,
  TickParamsSchema,
  TickParams,
  SchedulerStatusParamsSchema,
} from './scheduler.schema';
import { IContext, ILogger } from '@flybyme/isomorphic-core';
import { AcquireLockResult, Directive, ResumeDirectivesResult } from '../sys.directives/directives.schema';

import './scheduler.contract';

const CONFIG_ID = 'scheduler-singleton';
const SchedulerTable = defineTable('scheduler_config', SchedulerConfigSchema);

/**
 * SchedulerService — The Heartbeat Engine.
 *
 * Runs a periodic tick loop that:
 * 1. Picks up initialized/paused directives by priority
 * 2. Acquires locks and steps each directive through the FSM
 * 3. Periodically runs zombie recovery
 *
 * The scheduler respects the maxConcurrentDirectives limit to
 * prevent resource exhaustion.
 */
export class SchedulerService extends DatabaseMixin(SchedulerTable)(class { }) {
  public readonly name = 'sys.scheduler';

  declare logger: ILogger;

  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private zombieTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessingTick = false;

  public actions = {
    start: {
      params: StartSchedulerParamsSchema,
      handler: this.startScheduler.bind(this),
    },
    stop: {
      params: StopSchedulerParamsSchema,
      handler: this.stopScheduler.bind(this),
    },
    tick: {
      params: TickParamsSchema,
      handler: this.tick.bind(this),
      timeout: 300000 // 5 minutes
    },
    status: {
      params: SchedulerStatusParamsSchema,
      handler: this.getStatus.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
  }

  private async ensureConfig(): Promise<SchedulerConfig> {
    const existing = await this.db.find({ configId: CONFIG_ID });
    if (existing.length > 0) return existing[0];

    await this.db.create({
      configId: CONFIG_ID,
      tickIntervalMs: 5000,
      maxConcurrentDirectives: 5,
      zombieCheckIntervalMs: 60000,
      staleThresholdMs: 120000,
      enabled: true,
      totalTickCount: 0,
      totalDirectivesProcessed: 0,
      status: 'idle',
    });

    const results = await this.db.find({ configId: CONFIG_ID });
    return results[0];
  }

  // ────────────────────────────────────────────────────────────
  // START — Begin the tick loop
  // ────────────────────────────────────────────────────────────

  async startScheduler(ctx: IContext<StartSchedulerParams>): Promise<{
    started: boolean;
    tickIntervalMs: number;
  }> {
    const params = StartSchedulerParamsSchema.parse(ctx.params);
    const config = await this.ensureConfig();

    if (this.tickTimer) {
      this.logger.warn('[sys.scheduler] Already running. Stop first.');
      return { started: false, tickIntervalMs: config.tickIntervalMs };
    }

    const tickIntervalMs = params.tickIntervalMs ?? config.tickIntervalMs;
    const maxConcurrent = params.maxConcurrentDirectives ?? config.maxConcurrentDirectives;

    // Update config
    await this.db.updateMany({ configId: CONFIG_ID }, {
      tickIntervalMs,
      maxConcurrentDirectives: maxConcurrent,
      status: 'running',
      enabled: true,
    });

    // Start tick loop
    this.tickTimer = setInterval(() => {
      this.executeTick(ctx).catch((err: Error) => {
        this.logger.error(`[sys.scheduler] Tick error: ${err.message}`);
      });
    }, tickIntervalMs);

    // Start zombie recovery loop
    this.zombieTimer = setInterval(() => {
      this.executeZombieRecovery(ctx).catch((err: Error) => {
        this.logger.error(`[sys.scheduler] Zombie recovery error: ${err.message}`);
      });
    }, config.zombieCheckIntervalMs);

    this.logger.info(`[sys.scheduler] Started. Tick: ${tickIntervalMs}ms, MaxConcurrent: ${maxConcurrent}`);
    ctx.emit('sys.scheduler.started', { tickIntervalMs, maxConcurrentDirectives: maxConcurrent });

    return { started: true, tickIntervalMs };
  }

  // ────────────────────────────────────────────────────────────
  // STOP — Halt the tick loop
  // ────────────────────────────────────────────────────────────

  async stopScheduler(ctx: IContext<StopSchedulerParams>): Promise<{
    stopped: boolean;
    reason: string;
  }> {
    const { reason } = StopSchedulerParamsSchema.parse(ctx.params);

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.zombieTimer) {
      clearInterval(this.zombieTimer);
      this.zombieTimer = null;
    }

    await this.db.updateMany({ configId: CONFIG_ID }, {
      status: 'paused',
      enabled: false,
    });

    this.logger.info(`[sys.scheduler] Stopped — ${reason}`);
    ctx.emit('sys.scheduler.stopped', { reason });

    return { stopped: true, reason };
  }

  // ────────────────────────────────────────────────────────────
  // TICK — Single scheduler tick (can be manual or automatic)
  // ────────────────────────────────────────────────────────────

  async tick(ctx: IContext<TickParams>): Promise<{
    directivesProcessed: number;
    zombiesRecovered: number;
    tickDurationMs: number;
  }> {
    const { manual } = TickParamsSchema.parse(ctx.params);

    if (this.isProcessingTick) {
      this.logger.warn('[sys.scheduler] Tick skipped — previous tick still processing.');
      return { directivesProcessed: 0, zombiesRecovered: 0, tickDurationMs: 0 };
    }

    const startMs = Date.now();
    const result = await this.executeTick(ctx);

    const tickDurationMs = Date.now() - startMs;

    if (manual) {
      this.logger.info(`[sys.scheduler] Manual tick complete: ${result.directivesProcessed} processed in ${tickDurationMs}ms`);
    }

    return { ...result, tickDurationMs };
  }

  // ────────────────────────────────────────────────────────────
  // STATUS — Get current scheduler state
  // ────────────────────────────────────────────────────────────

  async getStatus(_ctx: IContext<SchedulerStatusParams>): Promise<SchedulerConfig> {
    return this.ensureConfig();
  }

  // ────────────────────────────────────────────────────────────
  // INTERNAL — Core tick execution
  // ────────────────────────────────────────────────────────────

  private async executeTick(ctx: IContext<SchedulerExecutionParams>): Promise<{
    directivesProcessed: number;
    zombiesRecovered: number;
  }> {
    this.isProcessingTick = true;
    let directivesProcessed = 0;

    try {
      const config = await this.ensureConfig();

      // Find workable directives: initialized or paused (ready for pickup)
      const initialized = await ctx.call<Directive[]>(
        'sys.directives.listByStatus',
        { status: 'initialized', limit: config.maxConcurrentDirectives }
      );

      const paused = await ctx.call<Directive[]>(
        'sys.directives.listByStatus',
        { status: 'paused', limit: Math.max(0, config.maxConcurrentDirectives - initialized.length) }
      );

      const workQueue = [...initialized, ...paused];

      // Sort by priority: critical > high > normal > low
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
      workQueue.sort((a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );

      // Process directives in parallel
      const processingPromises = workQueue.slice(0, config.maxConcurrentDirectives).map(async (directive) => {
        const id = directive.id;
        let lockAcquired = false;
        try {
          // 1. Acquire lock
          const lockResult = await ctx.call<AcquireLockResult>('sys.directives.acquireLock', {
            id,
            nodeID: ctx.nodeID,
          });

          if (!lockResult.acquired) {
            this.logger.info(`[sys.scheduler] Skipping ${id.slice(0, 8)} — lock held.`);
            return;
          }
          lockAcquired = true;

          // 2. Persona Ignition
          if (!directive.assignedPersona) {
            await ctx.call('sys.directives.assignPersona', {
              id,
              personaId: 'ralph_core'
            });
            directive.assignedPersona = 'ralph_core';
          }

          // 3. Step the directive
          this.logger.info(`[sys.scheduler] Stepping ${id.slice(0, 8)} (Persona: ${directive.assignedPersona})`);
          await ctx.call('sys.directives.step', { id });
          directivesProcessed++;
        } catch (err: unknown) {
          this.logger.error(`[sys.scheduler] Failed to step ${id.slice(0, 8)}: ${(err as Error).message}`);
        } finally {
          if (lockAcquired) {
            try {
              await ctx.call('sys.directives.releaseLock', { id, nodeID: ctx.nodeID });
            } catch (e: unknown) {
              this.logger.error(`[sys.scheduler] Failed to release lock for ${id.slice(0, 8)}: ${(e as Error).message}`);
            }
          }
        }
      });

      await Promise.allSettled(processingPromises);

      // Update stats
      await this.db.updateMany({ configId: CONFIG_ID }, {
        lastTickAt: Date.now(),
        totalTickCount: (config.totalTickCount ?? 0) + 1,
        totalDirectivesProcessed: (config.totalDirectivesProcessed ?? 0) + directivesProcessed,
      });

    } finally {
      this.isProcessingTick = false;
    }

    return { directivesProcessed, zombiesRecovered: 0 };
  }

  private async executeZombieRecovery(ctx: IContext<SchedulerExecutionParams>): Promise<void> {
    try {
      const config = await this.ensureConfig();
      const result = await ctx.call<ResumeDirectivesResult>('sys.directives.resume', {
        staleThresholdMs: config.staleThresholdMs,
      });

      if (result.count > 0) {
        this.logger.info(`[sys.scheduler] Zombie recovery: ${result.count} directives resumed.`);
      }
    } catch (err: unknown) {
      this.logger.error(`[sys.scheduler] Zombie recovery failed: ${(err as Error).message}`);
    }
  }
}

export default SchedulerService;
