import { IMeshModule, IMeshApp, IServiceBroker, IContext, ILogger, SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';
import { IDatabaseAdapter } from '@flybyme/isomorphic-database';
import { JobRepository } from '../repositories/JobRepository';
import { IJobHandler, JobRecord } from '../types/job.types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export class JobQueueModule implements IMeshModule {
    public readonly name = 'jobs';
    public serviceBroker!: IServiceBroker;
    public logger!: ILogger;
    private repository!: JobRepository;
    private db!: IDatabaseAdapter;
    private handlers = new Map<string, IJobHandler<Record<string, unknown>>>();
    private isWorker: boolean = false;
    private pollTimer?: TimerHandle;

    constructor(options: { isWorker?: boolean } = {}) {
        this.isWorker = options.isWorker || false;
    }

    onInit(app: IMeshApp): void {
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');
        this.logger = app.getProvider<ILogger>('logger').child({ module: 'JobQueue' });

        const db = app.getProvider<IDatabaseAdapter>('database');
        this.db = db;
        this.repository = new JobRepository(db, this.serviceBroker);

        this.serviceBroker.registerService({
            name: 'jobs',
            actions: {
                enqueue: {
                    params: z.object({
                        type: z.string(),
                        payload: z.record(z.string(), z.unknown()),
                        maxRetries: z.number().optional()
                    }),
                    returns: z.object({ id: z.string() }),
                    handler: this.handleEnqueue.bind(this)
                }
            }
        });

        if (this.isWorker) {
            this.startPolling();
        }
    }

    private async handleEnqueue(ctx: IContext<Record<string, unknown>>): Promise<{ id: string }> {
        const { type, payload, maxRetries } = ctx.params as { type: string, payload: Record<string, unknown>, maxRetries?: number };

        const job: JobRecord = {
            id: nanoid(),
            type,
            payload,
            status: 'PENDING',
            retries: 0,
            maxRetries: maxRetries || 3,
            correlationID: ctx.correlationID,
            meta: ctx.meta,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            nextRunAt: Date.now()
        };

        await this.repository.create(job);
        return { id: job.id };
    }

    public registerHandler<T extends Record<string, unknown>>(handler: IJobHandler<T>): void {
        this.handlers.set(handler.type, handler as unknown as IJobHandler<Record<string, unknown>>);
    }

    private startPolling(): void {
        this.pollTimer = setInterval(() => this.poll(), 5000);
        SafeTimer.unref(this.pollTimer);
    }

    private async poll(): Promise<void> {
        // 1. Recover stuck jobs (zombie workers)
        const stuckJobs = await this.repository.findStuckJobs(5);
        for (const job of stuckJobs) {
            this.logger.warn(`Recovering stuck job: ${job.id} (type: ${job.type})`);
            await this.repository.recoverJob(job.id);
        }

        // 2. Poll for new pending jobs
        const jobs = await this.repository.findPending(5);
        for (const job of jobs) {
            const claimed = await this.repository.claimJob(job.id, this.serviceBroker.app.nodeID);
            if (claimed) {
                this.executeJob(job).catch(err => {
                    this.logger.error(`Job execution failed: ${job.id}`, { error: (err as Error).message });
                });
            }
        }
    }

    private async executeJob(job: JobRecord): Promise<void> {
        const handler = this.handlers.get(job.type);
        if (!handler) {
            await this.repository.updateStatus(job.id, 'FAILED', { error: 'No handler registered' });
            return;
        }

        const ctx: IContext<Record<string, unknown>> = {
            id: job.id,
            actionName: `job.${job.type}`,
            params: job.payload,
            meta: job.meta || {},
            correlationID: job.correlationID,
            callerID: 'SYSTEM_JOB',
            nodeID: this.serviceBroker.app.nodeID,
            db: this.db,
            call: this.serviceBroker.call.bind(this.serviceBroker),
            emit: this.serviceBroker.emit.bind(this.serviceBroker)
        };

        try {
            await handler.handle(ctx);
            await this.repository.updateStatus(job.id, 'COMPLETED');
            this.logger.info(`Job completed: ${job.type} (${job.id})`);
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            const canRetry = job.retries < job.maxRetries;

            if (canRetry) {
                this.logger.warn(`Job failed, retrying: ${job.type} (${job.id})`, { error: error.message });
                await this.repository.updateStatus(job.id, 'PENDING', {
                    retries: job.retries + 1,
                    nextRunAt: Date.now() + Math.pow(2, job.retries) * 1000,
                    error: error.message
                });
            } else {
                this.logger.error(`Job failed and moved to DLQ: ${job.type} (${job.id})`, { error: error.message, stack: error.stack });
                await this.repository.updateStatus(job.id, 'DLQ', {
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    }

    async onStop(): Promise<void> {
        if (this.pollTimer) {
            SafeTimer.clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
    }
}
