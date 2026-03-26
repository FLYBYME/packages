// FILE: src/domains/sys.governance/actions/proposeRule.ts
import { IContext } from '@flybyme/isomorphic-core';
import { ProposeRuleParamsSchema, ConstitutionalRule } from '../governance.schema';
import { z } from 'zod';
import type { GovernanceService } from '../governance.service';

type ProposeParams = z.infer<typeof ProposeRuleParamsSchema>;

export const proposeRule = {
  params: ProposeRuleParamsSchema,
  returns: z.object({
    ruleId: z.string(),
    ratified: z.boolean(),
    status: z.enum(['proposed', 'ratified', 'rejected']),
  }),
  async handler(this: GovernanceService, ctx: IContext<ProposeParams>): Promise<{
    ruleId: string;
    ratified: boolean;
    status: 'proposed' | 'ratified' | 'rejected';
  }> {
    const { text, domain, severity, proposedBy } = ProposeRuleParamsSchema.parse(ctx.params);

    const governance = await this.ensureSingleton();

    // constitution is already a native array (parsed by repo schema)
    const constitution = governance.constitution || [];

    const ruleId = `CONST-${String(constitution.length + 1).padStart(3, '0')}`;
    const now = Date.now();

    const newRule: ConstitutionalRule = {
      ruleId,
      text,
      domain,
      severity,
      proposedBy,
      status: 'proposed',
      proposedAt: now,
    };
    const updated = [...constitution, newRule];

    await this.db.updateMany(
      { governanceId: this.SINGLETON_ID },
      { constitution: updated }
    );

    this.logger.info(`[sys.governance] Rule proposed: ${ruleId} — "${text}" (${severity})`);
    ctx.emit('sys.governance.rule_proposed', { ruleId, severity, proposedBy });

    return { ruleId, ratified: false, status: 'proposed' };
  },
};
