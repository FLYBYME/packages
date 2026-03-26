// FILE: src/domains/sys.audit/actions/log.ts
import { IContext } from '@flybyme/isomorphic-core';
import { LogAuditParamsSchema } from '../audit.schema';
import { z } from 'zod';
import type { AuditService } from '../audit.service';

type LogParams = z.infer<typeof LogAuditParamsSchema>;

export const log = {
  params: LogAuditParamsSchema,
  returns: z.object({ success: z.literal(true) }),
  async handler(this: AuditService, ctx: IContext<LogParams>): Promise<{ success: true }> {
    const {
      actor, action, domain, changeType, payload, diff, status,
      traceId, attempt, directiveId, promptTokens, completionTokens, finishReason, modelUsed, latencyMs
    } = LogAuditParamsSchema.parse(ctx.params);

    const timestamp = Date.now();
    await this.db.create({
      timestamp,
      traceId,
      attempt,
      directiveId,
      actor,
      action,
      domain,
      changeType,
      payload,
      diff,
      status,
      promptTokens,
      completionTokens,
      finishReason,
      modelUsed,
      latencyMs,
    });

    this.logger.info(`[sys.audit] Logged: ${changeType} on ${domain}.${action} by ${actor.nodeID} → ${status}`);

    return { success: true };
  },
};
