import { z } from 'zod';
import { IContext } from '@flybyme/isomorphic-core';

export const JobStatusSchema = z.enum([
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'RETRYING',
    'DLQ'
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobSchema = z.object({
    id: z.string(),
    type: z.string(),
    payload: z.record(z.string(), z.unknown()),
    status: JobStatusSchema,
    retries: z.number().default(0),
    maxRetries: z.number().default(3),
    error: z.string().optional(),
    stack: z.string().optional(),
    correlationID: z.string(),
    meta: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    nextRunAt: z.number().optional(),
    lockedUntil: z.number().optional(),
    nodeID: z.string().optional()
});

export type JobRecord = z.infer<typeof JobSchema>;

export interface IJobHandler<TParams = Record<string, unknown>> {
    type: string;
    schema?: z.ZodType<TParams>;
    handle(ctx: IContext<TParams>): Promise<void>;
}
