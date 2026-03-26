import { TaskSchema } from '../schemas/task.schema';
import { z } from 'zod';
import { CRUDActions } from '@flybyme/isomorphic-database';

export const SuccessSchema = z.object({ success: z.boolean() });
export const ToggleStatusParams = z.object({ id: z.string() });

declare module '@flybyme/isomorphic-core' {
    export interface IServiceActionRegistry extends CRUDActions<'tasks', typeof TaskSchema> {
        'tasks.toggleStatus': {
            params: typeof ToggleStatusParams;
            returns: typeof TaskSchema;
        };
    }
}
