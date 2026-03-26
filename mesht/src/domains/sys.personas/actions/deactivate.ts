// FILE: src/domains/sys.personas/actions/deactivate.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { DeactivatePersonaParamsSchema, PersonaSchema, Persona } from '../personas.schema';
import { z } from 'zod';
import type { PersonasService } from '../personas.service';

type DeactivateParams = z.infer<typeof DeactivatePersonaParamsSchema>;

export const deactivate = {
  params: DeactivatePersonaParamsSchema,
  returns: PersonaSchema,
  async handler(this: PersonasService, ctx: IContext<DeactivateParams>): Promise<Persona> {
    const { alias } = DeactivatePersonaParamsSchema.parse(ctx.params);

    const results = await this.db.find({ alias });
    if (results.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Persona '${alias}' not found.`, status: 404 });
    }

    const persona = results[0];
    await this.db.updateMany({ alias }, { status: 'dormant' });

    this.logger.info(`[sys.personas] Deactivated: ${alias}`);
    ctx.emit('sys.personas.deactivated', { id: persona.id, alias });

    const updated = await this.db.find({ alias });
    return updated[0];
  },
};
