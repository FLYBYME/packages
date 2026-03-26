// FILE: src/domains/sys.audit/audit.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { AuditLogSchema } from './audit.schema';
import { ILogger } from '@flybyme/isomorphic-core';

import './audit.contract';

// Import split actions
import { log } from './actions/log';
import { query } from './actions/query';
import { purge } from './actions/purge';

const AuditTable = defineTable('audit_logs', AuditLogSchema);

/**
 * AuditService — The Immutable Ledger.
 *
 * Records all significant actions across the MeshT grid.
 * Uses its own isolated database to prevent write-lock contention.
 * CONSTRAINT: This service must NOT audit itself (infinite recursion guard).
 */
export class AuditService extends DatabaseMixin(AuditTable)(class {}) {
  public readonly name = 'sys.audit';
  declare logger: ILogger;

  public actions = {
    log: {
      ...log,
      handler: log.handler.bind(this),
    },
    query: {
      ...query,
      handler: query.handler.bind(this),
    },
    purge: {
      ...purge,
      handler: purge.handler.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
  }
}

export default AuditService;
