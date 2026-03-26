import { z } from 'zod';
import { NetworkStatsSchema } from './network.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'network.getStats': {
            params: z.ZodObject<Record<string, never>>;
            returns: typeof NetworkStatsSchema;
        };
    }
}

export const NetworkContract = {
    name: 'network',
    actions: {
        getStats: {
            params: z.object({}),
            returns: NetworkStatsSchema
        }
    }
};
