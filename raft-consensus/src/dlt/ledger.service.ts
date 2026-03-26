import { z } from 'zod';
import { IContext } from '@flybyme/isomorphic-core';
import { DistributedLedger } from './DistributedLedger';
import { AppendParamsSchema, GetEntriesParamsSchema, LogEntrySchema } from './ledger.schema';

/**
 * LedgerService — Triad-compliant service for the Distributed Ledger.
 */
export class LedgerService {
    public readonly name = 'ledger';

    public actions = {
        append: { handler: this.append.bind(this) },
        getEntries: { handler: this.getEntries.bind(this) }
    };

    constructor(private ledger: DistributedLedger) {}

    async append(ctx: IContext<z.infer<typeof AppendParamsSchema>>): Promise<z.infer<typeof LogEntrySchema>> {
        const result = await this.ledger.append({
            term: 1, // Default term if not provided
            nodeID: ctx.nodeID,
            payload: ctx.params.payload
        });

        // Ensure we return exactly what LogEntrySchema expects
        return {
            txID: result.txID,
            index: result.index,
            term: result.term,
            payload: result.payload as Record<string, unknown>,
            timestamp: result.timestamp
        };
    }

    async getEntries(ctx: IContext<z.infer<typeof GetEntriesParamsSchema>>): Promise<unknown[]> {
        return await this.ledger.getEntriesFrom(ctx.params.fromIndex);
    }
}
