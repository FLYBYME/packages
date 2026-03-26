// FILE: src/domains/sys.directives/directives.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { DirectiveSchema, Directive } from './directives.schema';
import { ILogger, MeshError } from '@flybyme/isomorphic-core';

import './directives.contract';

import { create } from './actions/create';
import { step } from './actions/step';
import { updateContext } from './actions/updateContext';
import { resume } from './actions/resume';
import { cancel } from './actions/cancel';
import { acquireLock } from './actions/acquireLock';
import { releaseLock } from './actions/releaseLock';
import { listByStatus } from './actions/listByStatus';
import { assignPersona } from './actions/assignPersona';
import { resolveApproval } from './actions/resolveApproval';

const DirectiveTable = defineTable('directives', DirectiveSchema);

/**
 * DirectivesService — The Task Lifecycle Engine.
 *
 * Manages directive creation, FSM stepping, lock management,
 * and zombie recovery. Each directive is governed by a Protocol
 * (FSM manifest from sys.artifacts).
 */
export class DirectivesService extends DatabaseMixin(DirectiveTable)(class { }) {
  public readonly name = 'sys.directives';
  declare logger: ILogger;

  public actions = {
    create: { ...create, handler: create.handler.bind(this), timeout: 30000 },
    step: { ...step, handler: step.handler.bind(this), timeout: 600000 }, // 10 minutes
    updateContext: { ...updateContext, handler: updateContext.handler.bind(this) },
    resume: { ...resume, handler: resume.handler.bind(this) },
    cancel: { ...cancel, handler: cancel.handler.bind(this) },
    acquireLock: { ...acquireLock, handler: acquireLock.handler.bind(this) },
    releaseLock: { ...releaseLock, handler: releaseLock.handler.bind(this) },
    listByStatus: { ...listByStatus, handler: listByStatus.handler.bind(this) },
    assignPersona: { ...assignPersona, handler: assignPersona.handler.bind(this) },
    resolveApproval: { ...resolveApproval, handler: resolveApproval.handler.bind(this) },
  };

  constructor(_logger: ILogger) {
    super();
  }

  /** Shared helper: fetch a directive by its PK or throw NOT_FOUND */
  public async findDirective(id: string): Promise<Directive> {
    const result = await this.db.findOne({ id });
    if (!result) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Directive '${id}' not found.`, status: 404 });
    }
    return result;
  }

}

export default DirectivesService;
