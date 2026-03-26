// FILE: src/domains/sys.directives/actions/updateContext.ts
import { IContext } from '@flybyme/isomorphic-core';
import { Directive, UpdateContextParamsSchema } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

type UpdateContextParams = z.infer<typeof UpdateContextParamsSchema>;

export const updateContext = {
  params: UpdateContextParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<UpdateContextParams>): Promise<{ id: string; stateContext: Record<string, unknown> }> {
    const { id, contextMutation, status } = UpdateContextParamsSchema.parse(ctx.params);
    const directive = await this.findDirective(id);

    // stateContext is already a native object — repo handles serialization
    const merged = { ...directive.stateContext, ...contextMutation };

    const updatePayload: Partial<Directive> = { stateContext: merged };
    if (status) {
      updatePayload.status = status;
      
      // If transitioning to running for the first time, provision gitflow workspace
      if (status === 'running' && directive.status === 'initialized' && directive.projectId) {
        ctx.call('sys.gitflow.provision_workspace', { directiveId: id }).catch((err) => {
          this.logger.error(`[sys.directives] Failed to provision workspace for ${id}: ${err.message}`);
        });
      }
    }

    await this.db.updateMany({ id }, updatePayload);

    this.logger.info(`[sys.directives] Context updated: ${id.slice(0, 8)} (+${Object.keys(contextMutation).length} keys)`);
    return { id, stateContext: merged };
  },
};
