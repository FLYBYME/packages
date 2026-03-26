// FILE: src/domains/sys.directives/actions/acquireLock.ts
import { IContext } from '@flybyme/isomorphic-core';
import { AcquireLockParamsSchema } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

type AcquireLockParams = z.infer<typeof AcquireLockParamsSchema>;

const STALE_LOCK_MS = 5 * 60 * 1000;

export const acquireLock = {
  params: AcquireLockParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<AcquireLockParams>): Promise<{ acquired: boolean; id: string }> {
    const { id, nodeID } = AcquireLockParamsSchema.parse(ctx.params);
    const directive = await this.findDirective(id);

    if (directive.lockHolder) {
      const lockAge = Date.now() - (directive.lockAcquiredAt ?? 0);
      if (lockAge < STALE_LOCK_MS) {
        this.logger.warn(`[sys.directives] Lock denied: ${id.slice(0, 8)} held by ${directive.lockHolder} (${lockAge}ms ago)`);
        return { acquired: false, id };
      }
      this.logger.warn(`[sys.directives] Force-releasing stale lock on ${id.slice(0, 8)} from ${directive.lockHolder}`);
    }

    await this.db.updateMany({ id }, { lockHolder: nodeID, lockAcquiredAt: Date.now() });

    this.logger.info(`[sys.directives] Lock acquired: ${id.slice(0, 8)} by ${nodeID}`);
    return { acquired: true, id };
  },
};
