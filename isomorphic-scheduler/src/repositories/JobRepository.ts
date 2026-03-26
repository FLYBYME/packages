import { BaseRepository } from '@flybyme/isomorphic-database';
import { JobSchema, JobRecord, JobStatus } from '../types/job.types';
import { IServiceBroker } from '@flybyme/isomorphic-core';
import { IDatabaseAdapter } from '@flybyme/isomorphic-database';

export class JobRepository extends BaseRepository<typeof JobSchema> {
    constructor(adapter: IDatabaseAdapter, broker?: IServiceBroker) {
        super('jobs', JobSchema, adapter, broker);
    }

    async findPending(limit: number = 10): Promise<JobRecord[]> {
        const now = Date.now();
        // Combined query: pending jobs OR running jobs that have timed out
        return await this.builder()
            .where('status', '=', 'PENDING')
            .where('nextRunAt', '<=', now)
            .limit(limit)
            .execute() as JobRecord[];
    }

    async findStuckJobs(limit: number = 10): Promise<JobRecord[]> {
        const now = Date.now();
        return await this.builder()
            .where('status', '=', 'RUNNING')
            .where('lockedUntil', '<=', now)
            .limit(limit)
            .execute() as JobRecord[];
    }

    async updateStatus(id: string, status: JobStatus, extra: Partial<JobRecord> = {}): Promise<void> {
        await this.update(id, {
            status,
            updatedAt: Date.now(),
            ...extra
        });
    }

    /**
     * Atomic transition from PENDING to RUNNING to prevent double processing.
     */
    async claimJob(id: string, nodeID: string, lockDurationMs: number = 300000): Promise<boolean> {
        const results = await this.builder()
            .where('id', '=', id)
            .where('status', '=', 'PENDING')
            .update({
                status: 'RUNNING',
                nodeID,
                updatedAt: Date.now(),
                lockedUntil: Date.now() + lockDurationMs
            });
        
        return results.changes > 0;
    }

    async recoverJob(id: string): Promise<boolean> {
        const results = await this.builder()
            .where('id', '=', id)
            .where('status', '=', 'RUNNING')
            .update({
                status: 'PENDING',
                updatedAt: Date.now(),
                lockedUntil: 0
            });
        
        return results.changes > 0;
    }
}
