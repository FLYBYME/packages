// FILE: src/domains/sys.directives/actions/create.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { CreateDirectiveParamsSchema, DirectiveSchema, Directive } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';
import { Artifact } from '../../sys.artifacts/artifacts.schema';

type CreateParams = z.infer<typeof CreateDirectiveParamsSchema>;

export const create = {
  params: CreateDirectiveParamsSchema,
  returns: DirectiveSchema,
  async handler(this: DirectivesService, ctx: IContext<CreateParams>): Promise<Directive> {
    const { artifactId, title, projectId, parentID, stateContext, assignedPersona, priority } = ctx.params;
    // Resolve protocol
    const artifacts = await ctx.call<Artifact[]>('sys.artifacts.find', { id: artifactId });
    const artifact = artifacts?.[0];

    if (!artifact || !artifact.manifest) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Protocol artifact '${artifactId}' not found or invalid.`, status: 404 });
    }

    const entryNode = artifact.manifest.initialNodeId;

    const now = Date.now();

    // Native types — no JSON.stringify. The repo handles serialization.
    const record = await this.db.create({
      parentID,
      projectId,
      title,
      artifactId,
      status: 'initialized',
      stateContext,
      currentNode: entryNode,
      history: [],
      assignedPersona,
      priority,
      createdAt: now,
      lastStepAt: now,
    });

    this.logger.info(`[sys.directives] Created: "${title}" (${String(record.id).slice(0, 8)}) → ${entryNode}`);
    ctx.emit('sys.directives.created', { id: record.id, artifactId, title, priority });

    return this.findDirective(record.id as string);
  },
};
