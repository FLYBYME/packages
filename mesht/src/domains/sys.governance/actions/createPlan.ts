// FILE: src/domains/sys.governance/actions/createPlan.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { CreatePlanParamsSchema, GovernancePlanSchema, FiveYearPlan } from '../governance.schema';
import { z } from 'zod';
import type { GovernanceService } from '../governance.service';

type CreatePlanParams = z.infer<typeof CreatePlanParamsSchema>;

export const createPlan = {
  params: CreatePlanParamsSchema,
  returns: GovernancePlanSchema,
  async handler(this: GovernanceService, ctx: IContext<CreatePlanParams>): Promise<FiveYearPlan> {
    const params = CreatePlanParamsSchema.parse(ctx.params);

    const planId = crypto.randomUUID();
    const now = Date.now();

    // Use secondary DB if available (from multi-table DatabaseMixin)
    const planTable = this.dbs.plans;

    await planTable.create({
      planId,
      title: params.title,
      period: params.period,
      milestones: params.milestones.map((m) => ({
        ...m,
        currentValue: 0,
        status: 'pending',
      })),
      budgetAllocations: params.budgetAllocations.map((b) => ({
        ...b,
        usedTokens: 0,
        usedComputeMs: 0,
      })),
      status: 'draft',
      createdAt: now,
    });

    this.logger.info(`[sys.governance] Created plan: "${params.title}" (${planId})`);
    ctx.emit('sys.governance.plan_created', { planId, title: params.title });

    const results = await planTable.find({ planId });
    if (results.length === 0) {
      throw new MeshError({ code: 'DATABASE_ERROR', message: 'Failed to retrieve newly created plan.', status: 500 });
    }
    return results[0];
  },
};
