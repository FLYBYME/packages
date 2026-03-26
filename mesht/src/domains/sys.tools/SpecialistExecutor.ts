// FILE: src/domains/sys.tools/SpecialistExecutor.ts
import { spawn, ChildProcess } from 'node:child_process';
import { IContext, ILogger } from '@flybyme/isomorphic-core';
import { BaseRepository } from '@flybyme/isomorphic-database';
import {
  Specialist,
  SpecialistSettings,
  QuotaLock,
  DelegateToSpecialistParams,
  SpecialistSettingsSchema,
  QuotaLockSchema,
} from './tools.schema';
import { CatalogModel } from '../sys.catalog/catalog.schema';
import { Project } from '../sys.projects/projects.schema';

export interface WorkerResult {
  success: boolean;
  output: string;
  exitCode: number;
  stderr: string;
}

/**
 * SpecialistExecutor
 * Responsibility: Executes specialist workers (CLI tools) and streams logs via the Mesh Broker.
 */
export class SpecialistExecutor {
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private roundRobinIndex: number = 0;

  constructor(
    private readonly logger: ILogger,
    private readonly db: BaseRepository<typeof SpecialistSettingsSchema>,
    private readonly locksDb: BaseRepository<typeof QuotaLockSchema>
  ) { }

  public async killByDirective(id: string): Promise<void> {
    const child = this.activeProcesses.get(id);
    if (child) {
      this.logger.warn(`Killing orphaned specialist process for directive ${id}`);
      child.kill('SIGTERM');
      this.activeProcesses.delete(id);
    }
  }

  public async execute(
    ctx: IContext<DelegateToSpecialistParams>,
    params: DelegateToSpecialistParams
  ): Promise<WorkerResult> {
    const { specialist, prompt, hints, cwd: rawCwd, id, model: modelOverride, projectId } = params;

    // Resolve CWD if missing
    let cwd = rawCwd;
    if (!cwd && projectId && projectId !== 'global') {
      try {
        const project = await ctx.call<Project>('sys.projects.get', { id: projectId });
        if (project?.rootPath) cwd = project.rootPath;
      } catch { /* ignore */ }
    }

    // 1. Fetch Settings
    let settings: SpecialistSettings | null = await this.db.findById('global');
    if (!settings) {
      // Default fallback if not seeded
      settings = {
        id: 'global',
        geminiEnabled: true,
        copilotEnabled: true,
        opencodeEnabled: true,
        specialistTimeoutMs: 300000
      };
    }

    const timeoutMs = settings.specialistTimeoutMs;

    // 2. Check Feature Flags
    const isEnabled = settings[`${specialist}Enabled` as keyof SpecialistSettings];
    if (isEnabled === false) {
      return { success: false, output: '', exitCode: -1, stderr: `${specialist} specialist is disabled in settings.` };
    }

    // 3. Queue Resolution
    let modelQueue: string[] = [];
    if (modelOverride) {
      modelQueue = [modelOverride];
    } else {
      try {
        // Query sys.catalog for models with the 'specialist-cli' and specialist name capabilities
        const catalogModels = await ctx.call<CatalogModel[]>('sys.catalog.find', {
          query: {
            capabilities: { $contains: specialist },
            status: 'active'
          }
        });
        modelQueue = catalogModels.map(m => m.alias);
      } catch (err) {
        this.logger.error(`[Specialist] Failed to fetch models from catalog for ${specialist}`, err);
      }
    }

    if (modelQueue.length === 0) {
      // Fallback to defaults if catalog is empty or fails
      switch (specialist) {
        case 'gemini': modelQueue = ['gemini-2.5-flash']; break;
        case 'copilot': modelQueue = ['gpt-4o-mini']; break;
        case 'opencode': modelQueue = ['ollama/qwen3:4b-instruct']; break;
      }
    }

    // 4. "Simple" Heuristic
    if (hints?.includes('simple')) {
      this.logger.info(`[Specialist] Simple task detected. Reversing model queue for ${specialist}.`);
      modelQueue.reverse();
    }

    // 5. Round-Robin (if not simple)
    if (modelQueue.length > 1 && !hints?.includes('simple')) {
      this.roundRobinIndex = (this.roundRobinIndex + 1) % modelQueue.length;
      const preferred = modelQueue.splice(this.roundRobinIndex, 1)[0];
      if (preferred) modelQueue.unshift(preferred);
    }

    let lastResult: WorkerResult | null = null;
    const now = Date.now();

    for (let i = 0; i < modelQueue.length; i++) {
      const model = modelQueue[i];

      // 6. Check Persistent Quota Locks
      const locks = await this.locksDb.find({});
      const activeLock = locks.find((l: QuotaLock) =>
        (l.model === model || l.specialist === specialist) && l.disabledUntil > now
      );

      if (activeLock) {
        this.logger.warn(`[Specialist] Skipping model ${model} (Locked until ${new Date(activeLock.disabledUntil).toLocaleTimeString()}: ${activeLock.reason})`);
        continue;
      }

      ctx.emit('sys.tools.specialist_start', {
        id,
        specialist,
        model,
        timestamp: Date.now()
      });

      this.logger.info(`[Specialist] Attempting ${specialist} with model ${model} (${i + 1}/${modelQueue.length})`);

      const result = await this.runSingleAttempt(ctx, specialist, prompt, model, cwd, timeoutMs, id || 'anonymous', params.files);
      lastResult = result;

      if (result.success) return result;

      // 7. Error Interception & Quota Locking
      const isQuotaError = result.stderr.includes('QUOTA_EXHAUSTED') || result.stderr.includes('exhausted your capacity') || result.stderr.includes('rate limit');
      const isNotFoundError = result.stderr.includes('ModelNotFoundError') || result.stderr.includes('not found');
      const isTimeout = result.stderr.includes('timed out') || result.exitCode === -1;

      if (isQuotaError || isNotFoundError || isTimeout) {
        const reason = isQuotaError ? 'Quota exhausted' : isNotFoundError ? 'Model not found' : 'Timeout';

        if (specialist === 'copilot' && isQuotaError) {
          // Copilot: Block entire specialist until end of month
          const date = new Date();
          const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

          await this.locksDb.create({
            specialist: 'copilot',
            reason: 'Monthly quota exhausted',
            disabledUntil: lastDay
          });
          this.logger.error(`[Specialist] Copilot monthly quota exhausted. Locked until ${new Date(lastDay).toISOString()}`);
          break;
        } else {
          // Gemini/OpenCode: Block individual model
          const duration = isNotFoundError ? 3600000 : 300000; // 1h for 404, 5m for rate limit
          const disabledUntil = Date.now() + duration;

          await this.locksDb.create({
            id: crypto.randomUUID(),
            model,
            reason: `${reason} detected`,
            disabledUntil
          });
          this.logger.warn(`[Specialist] Model ${model} failed (${reason}). Locked for ${duration / 60000}m. Cascading...`);
          continue;
        }
      }

      this.logger.error(`[Specialist] ${specialist} failed with code ${result.exitCode}. No further fallback.`);
      break;
    }

    return lastResult || { success: false, output: '', exitCode: -1, stderr: 'No healthy models available in queue.' };
  }

  private async runSingleAttempt(
    ctx: IContext<DelegateToSpecialistParams>,
    specialist: Specialist,
    prompt: string,
    model: string,
    cwd: string | undefined,
    timeoutMs: number,
    id: string,
    files?: string[]
  ): Promise<WorkerResult> {
    const startTime = Date.now();
    let cmd = '';
    let args: string[] = [];

    switch (specialist) {
      case 'gemini':
        cmd = 'gemini';
        args = ['--prompt', prompt, '--yolo', '--resume', '--model', model];
        if (files && files.length > 0) {
          files.forEach(f => args.push('--file', f));
        }
        break;
      case 'copilot':
        cmd = 'gh';
        args = ['copilot', 'suggest', '-t', 'shell', prompt];
        // Note: gh copilot suggest doesn't have a direct file flag, 
        // but we could theoretically cat them into the prompt if needed.
        // For now, we'll keep it simple as per spec 3.C.
        break;
      case 'opencode':
        cmd = 'opencode';
        args = ['run', prompt, '-m', model, '-c'];
        if (files && files.length > 0) {
          args.push('--files', files.join(','));
        }
        break;
    }

    return new Promise((resolve) => {
      let stdoutData = '';
      let stderrData = '';

      const child = spawn(cmd, args, {
        cwd,
        env: { ...process.env, NON_INTERACTIVE: '1' }
      });

      child.stdin.end();
      this.activeProcesses.set(id, child);

      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        this.activeProcesses.delete(id);
        resolve({
          success: false,
          output: stdoutData,
          exitCode: -1,
          stderr: `${specialist} (${model}) timed out after ${timeoutMs}ms`
        });
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdoutData += text;
        ctx.emit('sys.tools.specialist_log', { id, specialist, stream: 'stdout', text });
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrData += text;
        ctx.emit('sys.tools.specialist_log', { id, specialist, stream: 'stderr', text });
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(id);
        resolve({ success: false, output: stdoutData, exitCode: -1, stderr: err.message });
      });

      child.on('exit', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(id);
        const exitCode = code ?? -1;
        const durationMs = Date.now() - startTime;

        ctx.emit('sys.tools.specialist_complete', {
          id,
          specialist,
          durationMs,
          exitCode
        });

        resolve({
          success: exitCode === 0,
          output: stdoutData.trim(),
          exitCode,
          stderr: stderrData.trim()
        });
      });
    });
  }
}
