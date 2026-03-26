// FILE: src/domains/sys.directives/actions/releaseLock.ts
import { IContext } from '@flybyme/isomorphic-core';
import { ReleaseLockParamsSchema } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

type ReleaseLockParams = z.infer<typeof ReleaseLockParamsSchema>;

export const releaseLock = {
  params: ReleaseLockParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<ReleaseLockParams>): Promise<{ released: boolean; id: string }> {
    const { id, nodeID } = ReleaseLockParamsSchema.parse(ctx.params);
    const directive = await this.findDirective(id);

    if (directive.lockHolder && directive.lockHolder !== nodeID) {
      this.logger.warn(`[sys.directives] Lock release denied: ${id.slice(0, 8)} — requested by ${nodeID}, held by ${directive.lockHolder}`);
      return { released: false, id };
    }

    await this.db.updateMany({ id }, { lockHolder: undefined, lockAcquiredAt: undefined });

    this.logger.info(`[sys.directives] Lock released: ${id.slice(0, 8)} by ${nodeID}`);
    return { released: true, id };
  },
};
