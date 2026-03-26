import { z } from 'zod';

export const LogEntrySchema = z.object({
    txID: z.string(),
    index: z.number(),
    term: z.number(),
    payload: z.record(z.string(), z.unknown()),
    timestamp: z.number()
});

export const AppendParamsSchema = z.object({
    namespace: z.string(),
    payload: z.record(z.string(), z.unknown())
});

export const GetEntriesParamsSchema = z.object({
    namespace: z.string(),
    fromIndex: z.number().default(0)
});

export type LogEntry = z.infer<typeof LogEntrySchema>;
export type AppendParams = z.infer<typeof AppendParamsSchema>;
export type GetEntriesParams = z.infer<typeof GetEntriesParamsSchema>;
