// FILE: src/domains/sys.personas/actions/create.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { CreatePersonaParamsSchema, PersonaSchema, Persona } from '../personas.schema';
import { z } from 'zod';
import { CatalogModel } from '../../sys.catalog/catalog.schema';
import type { PersonasService } from '../personas.service';

type CreateParams = z.infer<typeof CreatePersonaParamsSchema>;

export const create = {
  params: CreatePersonaParamsSchema,
  returns: PersonaSchema,
  async handler(this: PersonasService, ctx: IContext<CreateParams>): Promise<Persona> {
    const params = CreatePersonaParamsSchema.parse(ctx.params);

    // 1. Verify the LLM deployment exists in sys.catalog (cross-domain RPC)
    try {
      const models = await ctx.call<CatalogModel[]>('sys.catalog.list', {});
      const deployment = models.find((m) => m.alias === params.llmDeploymentAlias);
      if (!deployment) {
        throw new MeshError({
          code: 'NOT_FOUND',
          message: `LLM deployment '${params.llmDeploymentAlias}' not found in sys.catalog. Enable it first.`,
          status: 404,
        });
      }
    } catch (err: unknown) {
      if (err instanceof MeshError) throw err;
      this.logger.warn(`[sys.personas] Could not verify LLM deployment: ${(err as Error).message}`);
    }

    // 2. Check for duplicate alias
    const existing = await this.db.find({ alias: params.alias });
    if (existing.length > 0) {
      throw new MeshError({ code: 'CONFLICT', message: `Persona with alias '${params.alias}' already exists.`, status: 409 });
    }

    // 3. Create the persona record
    const now = Date.now();

    const record = await this.db.create({
      alias: params.alias,
      traits: params.traits,
      role: params.role,
      leaning: params.leaning,
      systemPrompt: params.systemPrompt,
      llmDeploymentAlias: params.llmDeploymentAlias,
      allowedTools: params.allowedTools,
      maxToolRounds: params.maxToolRounds,
      temperature: params.temperature,
      status: 'dormant',
      createdAt: now,
    });

    this.logger.info(`[sys.personas] Created persona: ${params.alias} (role: ${params.role})`);
    ctx.emit('sys.personas.created', { id: record.id, alias: params.alias, role: params.role });

    return record as Persona;
  },
};
