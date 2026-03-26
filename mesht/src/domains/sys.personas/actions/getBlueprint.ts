import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { GetBlueprintParamsSchema, Blueprint } from '../personas.schema';
import { z } from 'zod';
import { CatalogModel } from '../../sys.catalog/catalog.schema';
import type { PersonasService } from '../personas.service';

type GetBlueprintParams = z.infer<typeof GetBlueprintParamsSchema>;

export const getBlueprint = {
  params: GetBlueprintParamsSchema,
  async handler(this: PersonasService, ctx: IContext<GetBlueprintParams>): Promise<Blueprint> {
    const { alias } = GetBlueprintParamsSchema.parse(ctx.params);

    // 1. Find the persona
    const results = await this.db.find({ alias });
    if (results.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Persona '${alias}' not found.`, status: 404 });
    }

    const persona = results[0];
    const allowedTools = persona.allowedTools || [];

    // 2. Resolve LLM deployment from sys.catalog
    let llmDeployment: Record<string, unknown> = {};
    try {
      const models = await ctx.call<CatalogModel[]>('sys.catalog.list', {});
      const deployment = models.find((m) => m.alias === persona.llmDeploymentAlias);
      if (deployment) {
        llmDeployment = {
          alias: deployment.alias,
          providerId: deployment.providerId,
          modelName: deployment.modelName,
          baseURL: deployment.baseURL,
          apiKey: deployment.apiKey,
          maxContextTokens: deployment.maxContextTokens,
          capabilities: deployment.capabilities,
        };
      }
    } catch (err: unknown) {
      this.logger.warn(`[sys.personas] Could not resolve LLM deployment for ${alias}: ${(err as Error).message}`);
    }

    // 3. Build tool belt (expanded in Phase 3 via sys.tools)
    const toolBelt = allowedTools.map((toolName: string) => ({
      type: 'function' as const,
      function: {
        name: toolName,
        description: `Tool: ${toolName} (pending resolution from sys.tools)`,
        parameters: {},
      },
    }));

    this.logger.info(`[sys.personas] Blueprint resolved: ${alias} (${allowedTools.length} tools)`);

    return { persona, llmDeployment, toolBelt };
  },
};
