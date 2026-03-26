import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { Task, TaskSchema, UpdateTaskParams } from '../schemas/task.schema';
import { ILogger, MeshError, IContext } from '@flybyme/isomorphic-core';
import '../contracts/task.contract';

/**
 * Task Table Definition
 */
const TaskTable = defineTable('tasks', TaskSchema);

/**
 * TaskWorkerService — The "Kitchen Sink" Service Implementation.
 * Updated to use the new BaseRepository interface.
 */
export class TaskWorkerService extends DatabaseMixin(TaskTable)(class { }) {
    public readonly name = 'tasks';

    public actions = {
        toggleStatus: {
            params: UpdateTaskParams,
            returns: TaskSchema,
            handler: this.toggleStatus.bind(this)
        }
    };

    constructor(private logger: ILogger) {
        super();
    }

    async toggleStatus(ctx: IContext<Record<string, unknown>>): Promise<Task> {
        const { id, expectedStatus } = UpdateTaskParams.parse(ctx.params);

        const task = await this.db.findById(id);
        if (!task) throw new MeshError({ code: 'NOT_FOUND', message: 'Task not found', status: 404 });

        // Phase 4: State Validation (Defense in Depth)
        if (expectedStatus && task.status !== expectedStatus) {
            this.logger.info(`[TaskWorker] Skipping toggle for task ${id}: current status ${task.status} does not match expected ${expectedStatus}`);
            return task;
        }

        const newStatus = task.status === 'completed' ? 'active' : 'completed';

        await this.db.update(id, {
            status: newStatus,
            updatedAt: Date.now()
        });

        const updated = await this.db.findById(id);
        if (!updated) throw new Error('Failed to update task');
        ctx.emit('tasks.updated', updated);
        return updated;
    }
}
