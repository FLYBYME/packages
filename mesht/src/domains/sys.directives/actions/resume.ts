// FILE: src/domains/sys.directives/actions/resume.ts
import { IContext } from '@flybyme/isomorphic-core';
import { ResumeDirectivesParamsSchema } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

type ResumeParams = z.infer<typeof ResumeDirectivesParamsSchema>;

export const resume = {
  params: ResumeDirectivesParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<ResumeParams>): Promise<{ resumed: string[]; count: number }> {
    const { staleThresholdMs } = ResumeDirectivesParamsSchema.parse(ctx.params);
    const cutoff = Date.now() - staleThresholdMs;

    const running = await this.db.find({ status: 'running' });
    const stale = running.filter((d) => (d.lastStepAt ?? d.createdAt) < cutoff);

    const resumed: string[] = [];
    for (const d of stale) {
      await this.db.updateMany(
        { id: d.id },
        { status: 'paused', lockHolder: undefined, lockAcquiredAt: undefined }
      );
      resumed.push(d.id);
      this.logger.warn(`[sys.directives] Zombie recovered: ${d.id.slice(0, 8)} (stale ${Date.now() - (d.lastStepAt ?? d.createdAt)}ms)`);
      ctx.emit('sys.directives.zombie_recovered', { id: d.id, title: d.title });
    }

    if (resumed.length > 0) {
      this.logger.info(`[sys.directives] Zombie recovery: ${resumed.length} directives resumed.`);
    }

    return { resumed, count: resumed.length };
  },
};
