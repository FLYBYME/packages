// FILE: src/domains/sys.governance/actions/updateRoadmap.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { UpdateRoadmapParamsSchema, GovernancePlanSchema, FiveYearPlan } from '../governance.schema';
import { z } from 'zod';
import type { GovernanceService } from '../governance.service';

type UpdateRoadmapParams = z.infer<typeof UpdateRoadmapParamsSchema>;

export const updateRoadmap = {
  params: UpdateRoadmapParamsSchema,
  returns: GovernancePlanSchema,
  async handler(this: GovernanceService, ctx: IContext<UpdateRoadmapParams>): Promise<FiveYearPlan> {
    const { planId, milestoneUpdates, budgetUpdates } = UpdateRoadmapParamsSchema.parse(ctx.params);

    const planTable = this.dbs.plans;

    const existing = await planTable.find({ planId });
    if (existing.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Plan '${planId}' not found.`, status: 404 });
    }

    const plan = existing[0];
    const milestones = plan.milestones || [];
    const budgets = plan.budgetAllocations || [];

    const updatedMs = milestones.map((m) => {
      const u = milestoneUpdates.find((up) => up.milestoneId === m.milestoneId);
      return u ? { ...m, currentValue: u.currentValue ?? m.currentValue, status: u.status ?? m.status } : m;
    });

    const updatedBs = budgets.map((b) => {
      const u = budgetUpdates.find((up) => up.department === b.department);
      return u ? { ...b, usedTokens: u.usedTokens ?? b.usedTokens, usedComputeMs: u.usedComputeMs ?? b.usedComputeMs } : b;
    });

    await planTable.updateMany({ planId }, {
      milestones: updatedMs,
      budgetAllocations: updatedBs,
    });

    this.logger.info(`[sys.governance] Updated roadmap for plan ${planId}`);

    const results = await planTable.find({ planId });
    return results[0];
  },
};
