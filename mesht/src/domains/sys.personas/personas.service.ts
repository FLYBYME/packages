// FILE: src/domains/sys.personas/personas.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { PersonaSchema } from './personas.schema';
import { ILogger } from '@flybyme/isomorphic-core';

import './personas.contract';

// Import split actions
import { create } from './actions/create';
import { activate } from './actions/activate';
import { deactivate } from './actions/deactivate';
import { getBlueprint } from './actions/getBlueprint';
import { updateTools } from './actions/updateTools';

const PersonaTable = defineTable('personas', PersonaSchema);

/**
 * PersonasService — The Persona Matrix.
 * 
 * Manages the instantiation and lifecycle of agent blueprints.
 */
export class PersonasService extends DatabaseMixin(PersonaTable)(class {}) {
  public readonly name = 'sys.personas';
  declare logger: ILogger;

  public actions = {
    create: {
      ...create,
      handler: create.handler.bind(this),
    },
    activate: {
      ...activate,
      handler: activate.handler.bind(this),
    },
    deactivate: {
      ...deactivate,
      handler: deactivate.handler.bind(this),
    },
    getBlueprint: {
      ...getBlueprint,
      handler: getBlueprint.handler.bind(this),
    },
    updateTools: {
      ...updateTools,
      handler: updateTools.handler.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
  }
}

export default PersonasService;
