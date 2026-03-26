// FILE: src/domains/sys.governance/actions/advanceCycle.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { AdvanceCycleParamsSchema, GovernanceSchema, LifecyclePhase, Governance } from '../governance.schema';
import { z } from 'zod';
import type { GovernanceService } from '../governance.service';

type AdvanceCycleParams = z.infer<typeof AdvanceCycleParamsSchema>;

const VALID_TRANSITIONS: Record<LifecyclePhase, LifecyclePhase[]> = {
  BIRTH: ['GROWTH'],
  GROWTH: ['MATURITY'],
  MATURITY: ['RENEWAL'],
  RENEWAL: ['GROWTH', 'BIRTH'],
};

export const advanceCycle = {
  params: AdvanceCycleParamsSchema,
  returns: GovernanceSchema,
  async handler(this: GovernanceService, ctx: IContext<AdvanceCycleParams>): Promise<Governance> {
    const { targetPhase, reason } = AdvanceCycleParamsSchema.parse(ctx.params);

    const governance = await this.ensureSingleton();
    const currentPhase = governance.lifecyclePhase;

    const allowed = VALID_TRANSITIONS[currentPhase] ?? [];
    if (!allowed.includes(targetPhase)) {
      throw new MeshError({
        code: 'INVALID_TRANSITION',
        message: `Invalid lifecycle transition: ${currentPhase} → ${targetPhase}. Allowed: [${allowed.join(', ')}].`,
        status: 409,
      });
    }

    const now = Date.now();

    const phaseHistory = governance.phaseHistory;

    const updatedHistory = [
      ...phaseHistory.map((entry) =>
        entry.phase === currentPhase && !entry.exitedAt ? { ...entry, exitedAt: now } : entry
      ),
      { phase: targetPhase, enteredAt: now },
    ];

    await this.db.updateMany(
      { governanceId: this.SINGLETON_ID },
      { lifecyclePhase: targetPhase, phaseHistory: updatedHistory }
    );

    this.logger.info(`[sys.governance] Lifecycle: ${currentPhase} → ${targetPhase}. Reason: ${reason}`);
    ctx.emit('sys.governance.lifecycle_advanced', { from: currentPhase, to: targetPhase, reason });

    return this.ensureSingleton();
  },
};
