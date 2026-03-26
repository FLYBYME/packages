// FILE: src/domains/sys.audit/actions/purge.ts
import { IContext } from '@flybyme/isomorphic-core';
import { PurgeAuditParamsSchema } from '../audit.schema';
import { z } from 'zod';
import type { AuditService } from '../audit.service';

type PurgeParams = z.infer<typeof PurgeAuditParamsSchema>;

export const purge = {
  params: PurgeAuditParamsSchema,
  returns: z.object({ purgedCount: z.number(), dryRun: z.boolean() }),
  async handler(this: AuditService, ctx: IContext<PurgeParams>): Promise<{ purgedCount: number; dryRun: boolean }> {
    const { olderThanMs, dryRun } = PurgeAuditParamsSchema.parse(ctx.params);
    const cutoff = Date.now() - olderThanMs;

    const filter = { timestamp: { '<': cutoff } };
    const stale = await this.db.find(filter);
    const purgedCount = stale.length;

    if (!dryRun && purgedCount > 0) {
      await this.db.removeMany(filter);
      this.logger.info(`[sys.audit] Purged ${purgedCount} audit entries older than ${olderThanMs}ms`);
    } else {
      this.logger.info(`[sys.audit] DRY RUN: Would purge ${purgedCount} audit entries`);
    }

    return { purgedCount, dryRun };
  },
};
