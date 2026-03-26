// FILE: src/domains/sys.audit/actions/query.ts
import { IContext } from '@flybyme/isomorphic-core';
import { QueryAuditParamsSchema, AuditLog } from '../audit.schema';
import { z } from 'zod';
import type { AuditService } from '../audit.service';

type QueryParams = z.infer<typeof QueryAuditParamsSchema>;

export const query = {
  params: QueryAuditParamsSchema,
  async handler(this: AuditService, ctx: IContext<QueryParams>): Promise<AuditLog[]> {
    const { domain, actorNodeID, changeType, fromTimestamp, toTimestamp, directiveId, traceId, limit } =
      QueryAuditParamsSchema.parse(ctx.params);

    const filter: Partial<AuditLog> = {};
    if (domain) filter.domain = domain;
    if (changeType) filter.changeType = changeType;
    if (directiveId) filter.directiveId = directiveId;
    if (traceId) filter.traceId = traceId;

    const maxResults = limit || 100;
    let results = await this.db.find(filter, { limit: maxResults });

    if (actorNodeID) {
      results = results.filter((r) => r.actor.nodeID === actorNodeID);
    }
    if (fromTimestamp) results = results.filter((r) => r.timestamp >= fromTimestamp);
    if (toTimestamp) results = results.filter((r) => r.timestamp <= toTimestamp);

    results.sort((a, b) => b.timestamp - a.timestamp);
    return results.slice(0, maxResults);
  },
};
