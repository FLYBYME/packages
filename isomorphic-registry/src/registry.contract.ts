import { z } from 'zod';
import { NodeInfoSchema, ServiceInfoSchema } from './types/registry.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'registry.register': {
            params: typeof NodeInfoSchema;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
        };
        'registry.getNodes': {
            params: z.ZodObject<{ serviceName: z.ZodOptional<z.ZodString> }>;
            returns: z.ZodArray<typeof NodeInfoSchema>;
        };
        'registry.getServices': {
            params: z.ZodObject<{ nodeID: z.ZodOptional<z.ZodString> }>;
            returns: z.ZodArray<typeof ServiceInfoSchema>;
        };
    }
}

export const RegistryContract = {
    name: 'registry',
    actions: {
        register: {
            params: NodeInfoSchema,
            returns: z.object({ success: z.string() }) // Wait, returns should match the Registry result
        },
        getNodes: {
            params: z.object({ serviceName: z.string().optional() }),
            returns: z.array(NodeInfoSchema)
        },
        getServices: {
            params: z.object({ nodeID: z.string().optional() }),
            returns: z.array(ServiceInfoSchema)
        }
    }
};
