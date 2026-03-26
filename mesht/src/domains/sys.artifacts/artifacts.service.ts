// FILE: src/domains/sys.artifacts/artifacts.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  ArtifactSchema,
} from './artifacts.schema';
import { ILogger } from '@flybyme/isomorphic-core';

import './artifacts.contract';

// Import split actions
import { register } from './actions/register';
import { validate } from './actions/validate';

const ArtifactTable = defineTable('artifacts', ArtifactSchema);

/**
 * ArtifactsService — The Protocol & Capability Registry.
 *
 * Stores FSM manifests (protocols) and atomic tool definitions (capabilities).
 * Protocols govern execution of Directives — they define the graph of
 * persona nodes, gate nodes, terminal nodes, and transition edges.
 */
export class ArtifactsService extends DatabaseMixin(ArtifactTable)(class {}) {
  public readonly name = 'sys.artifacts';
  declare logger: ILogger;

  public actions = {
    register: {
      ...register,
      handler: register.handler.bind(this),
    },
    validate: {
      ...validate,
      handler: validate.handler.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
  }
}

export default ArtifactsService;
