// FILE: src/domains/sys.directives/actions/assignPersona.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

export const assignPersona = {
  params: z.object({
    id: z.string(),
    personaId: z.string(),
  }),
  async handler(this: DirectivesService, ctx: IContext<{ id: string; personaId: string }>): Promise<{ success: boolean }> {
    const { id, personaId } = ctx.params;
    
    // Validate if the persona exists
    try {
      await ctx.call('sys.personas.getBlueprint', { alias: personaId });
    } catch {
      throw new MeshError({ code: 'NOT_FOUND', message: `Persona '${personaId}' not found.`, status: 404 });
    }

    await this.db.updateMany({ id }, { assignedPersona: personaId });

    this.logger.info(`[sys.directives] Assigned persona '${personaId}' to directive ${id.slice(0, 8)}`);
    return { success: true };
  },
};
