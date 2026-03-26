import { IContext, MeshError } from '@flybyme/isomorphic-core';
import {
  ResolveApprovalMutation,
  ResolveApprovalParams,
  ResolveApprovalParamsSchema,
} from '../directives.schema';
import type { DirectivesService } from '../directives.service';

export const resolveApproval = {
  params: ResolveApprovalParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<ResolveApprovalParams>) {
    const { id, verdict, feedback } = ResolveApprovalParamsSchema.parse(ctx.params);
    const directive = await this.findDirective(id);

    if (directive.status !== 'paused') {
      throw new MeshError({
        code: 'INVALID_STATE',
        message: `Directive '${id}' is not paused. Current status: ${directive.status}`,
        status: 409
      });
    }

    const mutation: ResolveApprovalMutation = {
      _human_verdict: verdict,
    };
    if (feedback) {
      mutation._human_feedback = feedback;
    }

    // Update context and set status to running
    await this.db.updateMany(
      { id },
      {
        status: 'running',
        stateContext: { ...directive.stateContext, ...mutation }
      }
    );

    this.logger.info(`[sys.directives] HITL: Operator resolved directive ${id.slice(0, 8)} with verdict: ${verdict}`);

    // Trigger the next step immediately
    return await ctx.call('sys.directives.step', { id });
  },
};
