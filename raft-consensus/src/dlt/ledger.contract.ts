import { z } from 'zod';
import { AppendParamsSchema, LogEntrySchema, GetEntriesParamsSchema } from './ledger.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'ledger.append': {
            params: typeof AppendParamsSchema;
            returns: typeof LogEntrySchema;
        };
        'ledger.getEntries': {
            params: typeof GetEntriesParamsSchema;
            returns: z.ZodArray<typeof LogEntrySchema>;
        };
    }
}

export const LedgerContract = {
    name: 'ledger',
    actions: {
        append: {
            params: AppendParamsSchema,
            returns: LogEntrySchema
        },
        getEntries: {
            params: GetEntriesParamsSchema,
            returns: z.array(LogEntrySchema)
        }
    }
};
