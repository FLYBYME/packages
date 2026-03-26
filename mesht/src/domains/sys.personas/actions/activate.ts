// FILE: src/domains/sys.personas/actions/activate.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { ActivatePersonaParamsSchema, PersonaSchema, Persona } from '../personas.schema';
import { z } from 'zod';
import type { PersonasService } from '../personas.service';

type ActivateParams = z.infer<typeof ActivatePersonaParamsSchema>;

export const activate = {
  params: ActivatePersonaParamsSchema,
  returns: PersonaSchema,
  async handler(this: PersonasService, ctx: IContext<ActivateParams>): Promise<Persona> {
    const { alias } = ActivatePersonaParamsSchema.parse(ctx.params);

    const results = await this.db.find({ alias });
    if (results.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Persona '${alias}' not found.`, status: 404 });
    }

    const persona = results[0];
    if (persona.status === 'suspended') {
      throw new MeshError({
        code: 'FORBIDDEN',
        message: `Persona '${alias}' is suspended and cannot be activated. Contact an operator.`,
        status: 403,
      });
    }

    const now = Date.now();
    await this.db.updateMany({ alias }, { status: 'active', lastActiveAt: now });

    this.logger.info(`[sys.personas] Activated: ${alias}`);
    ctx.emit('sys.personas.activated', { id: persona.id, alias });

    const updated = await this.db.find({ alias });
    return updated[0];
  },
};
