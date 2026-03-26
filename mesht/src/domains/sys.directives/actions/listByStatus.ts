// FILE: src/domains/sys.directives/actions/listByStatus.ts
import { IContext } from '@flybyme/isomorphic-core';
import { ListByStatusParamsSchema, Directive } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';

type ListByStatusParams = z.infer<typeof ListByStatusParamsSchema>;

export const listByStatus = {
  params: ListByStatusParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<ListByStatusParams>): Promise<Directive[]> {
    const { status, limit } = ListByStatusParamsSchema.parse(ctx.params);
    return this.db.find({ status }, { limit });
  },
};
