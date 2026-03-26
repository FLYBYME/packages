// FILE: src/domains/sys.directives/actions/cancel.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { CancelDirectiveParamsSchema, DirectiveSchema, Directive } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

type CancelParams = z.infer<typeof CancelDirectiveParamsSchema>;

export const cancel = {
  params: CancelDirectiveParamsSchema,
  returns: DirectiveSchema,
  async handler(this: DirectivesService, ctx: IContext<CancelParams>): Promise<Directive> {
    const { id, reason } = CancelDirectiveParamsSchema.parse(ctx.params);
    const directive = await this.findDirective(id);

    if (directive.status === 'completed' || directive.status === 'failed') {
      throw new MeshError({
        code: 'INVALID_STATE',
        message: `Directive already in terminal state '${directive.status}'.`,
        status: 409,
      });
    }

    await this.db.updateMany({ id }, { status: 'cancelled', lockHolder: undefined, lockAcquiredAt: undefined });

    this.logger.info(`[sys.directives] Cancelled: ${id.slice(0, 8)} — ${reason}`);

    // NEW LOGIC: Clean up the physical git worktree
    try {
      await ctx.call('sys.gitflow.abort_workspace', { directiveId: id }, { timeout: 15000 });
      this.logger.info(`[sys.directives] Git Worktree cleaned up for cancelled directive ${id.slice(0, 8)}`);
    } catch (err) {
      this.logger.warn(`[sys.directives] Failed to cleanup worktree for ${id.slice(0, 8)}: ${(err as Error).message}`);
    }

    ctx.emit('sys.directives.cancelled', { id, reason });

    return this.findDirective(id);
  },
};
