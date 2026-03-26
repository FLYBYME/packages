import { IMeshModule, IMeshApp, IServiceBroker, ILogger, IServiceRegistry, IServiceSchema, SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';
import { IRaftNode } from '@flybyme/raft-consensus';
import { ICronDefinition } from '../types/cron.types';
import * as parser from 'cron-parser';

export class CronModule implements IMeshModule {
    public readonly name = 'cron';
    public serviceBroker!: IServiceBroker;
    public logger!: ILogger;
    private raft?: IRaftNode;
    private tasks: Map<string, { definition: ICronDefinition, nextRun: number, serviceName: string }> = new Map();
    private pollTimer?: TimerHandle;

    onInit(app: IMeshApp): void {
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');
        this.logger = app.getProvider<ILogger>('logger').child({ module: 'Cron' });

        try {
            this.raft = app.getProvider<IRaftNode>('consensus');
        } catch {
            this.logger.warn('Consensus provider not found. Cron jobs will run on all nodes (No leader election).');
        }

        // Scan for cron definitions in services
        const registry = app.getProvider<IServiceRegistry>('registry');
        registry.on('service:registered', (...args: unknown[]) => {
            const schema = args[0] as IServiceSchema;
            if (schema.cron) {
                this.registerCronTasks(schema.name, schema.cron);
            }
        });

        registry.on('service:unregistered', (...args: unknown[]) => {
            const serviceName = args[0] as string;
            this.unregisterCronTasks(serviceName);
        });
    }

    private registerCronTasks(serviceName: string, cronTasks: ICronDefinition[]): void {
        for (const task of cronTasks) {
            try {
                const interval = parser.parseExpression(task.schedule);
                const nextRun = interval.next().getTime();
                this.tasks.set(`${serviceName}:${task.action}:${task.schedule}`, { definition: task, nextRun, serviceName });
                this.logger.info(`Registered cron task: ${task.action} (${task.schedule}) for service ${serviceName}`);
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                this.logger.error(`Failed to parse cron schedule: ${task.schedule}`, { error: error.message });
            }
        }
    }

    private unregisterCronTasks(serviceName: string): void {
        for (const [key, task] of this.tasks.entries()) {
            if (task.serviceName === serviceName) {
                this.tasks.delete(key);
                this.logger.info(`Unregistered cron task: ${task.definition.action} due to service ${serviceName} unregistration`);
            }
        }
    }

    async onStart(): Promise<void> {
        this.pollTimer = setInterval(() => this.tick(), 1000);
        SafeTimer.unref(this.pollTimer);
    }

    private async tick(): Promise<void> {
        // Only the leader executes cron evaluation
        if (this.raft && this.raft.state !== 'LEADER') {
            return;
        }

        const now = Date.now();
        for (const [key, task] of this.tasks.entries()) {
            if (now >= task.nextRun) {
                // Dispatch execution
                this.logger.info(`Triggering cron task: ${task.definition.action}`);
                this.serviceBroker.call(task.definition.action, task.definition.params || {}).catch(err => {
                    const error = err instanceof Error ? err : new Error(String(err));
                    this.logger.error(`Cron task failed: ${task.definition.action}`, { error: error.message });
                });

                // Update next run time
                try {
                    const interval = parser.parseExpression(task.definition.schedule);
                    task.nextRun = interval.next().getTime();
                } catch {
                    this.tasks.delete(key);
                }
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
