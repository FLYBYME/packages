// FILE: src/domains/sys.personas/actions/updateTools.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { UpdateToolsParamsSchema } from '../personas.schema';
import { z } from 'zod';
import type { PersonasService } from '../personas.service';

type UpdateToolsParams = z.infer<typeof UpdateToolsParamsSchema>;

export const updateTools = {
  params: UpdateToolsParamsSchema,
  returns: z.object({ alias: z.string(), allowedTools: z.array(z.string()) }),
  async handler(this: PersonasService, ctx: IContext<UpdateToolsParams>): Promise<{ alias: string; allowedTools: string[] }> {
    const { alias, addTools, removeTools } = UpdateToolsParamsSchema.parse(ctx.params);

    const results = await this.db.find({ alias });
    if (results.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Persona '${alias}' not found.`, status: 404 });
    }

    const persona = results[0];
    const currentTools = new Set<string>(persona.allowedTools || []);

    for (const tool of addTools) currentTools.add(tool);
    for (const tool of removeTools) currentTools.delete(tool);

    const updatedTools = [...currentTools];
    await this.db.updateMany({ alias }, { allowedTools: updatedTools });

    this.logger.info(`[sys.personas] Updated tools for ${alias}: [${updatedTools.join(', ')}]`);
    return { alias, allowedTools: updatedTools };
  },
};
