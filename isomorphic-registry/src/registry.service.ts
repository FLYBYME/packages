import { z } from 'zod';
import { IContext } from '@flybyme/isomorphic-core';
import { ServiceRegistry } from './core/ServiceRegistry';
import { NodeInfoSchema } from './types/registry.schema';

/**
 * RegistryService — Exposed actions for interacting with the ServiceRegistry.
 */
export class RegistryService {
    public readonly name = 'registry';

    public actions = {
        register: { handler: this.register.bind(this) },
        getNodes: { handler: this.getNodes.bind(this) },
        getServices: { handler: this.getServices.bind(this) }
    };

    constructor(private registry: ServiceRegistry) {}

    async register(ctx: IContext<z.infer<typeof NodeInfoSchema>>): Promise<{ success: boolean }> {
        this.registry.registerNode(ctx.params);
        return { success: true };
    }

    async getNodes(ctx: IContext<{ serviceName?: string }>): Promise<unknown[]> {
        if (ctx.params.serviceName) {
            return this.registry.findNodesForAction(ctx.params.serviceName) as unknown as unknown[];
        }
        return this.registry.getNodes() as unknown as unknown[];
    }

    async getServices(ctx: IContext<{ nodeID?: string }>): Promise<unknown[]> {
        if (ctx.params.nodeID) {
            const node = this.registry.getNode(ctx.params.nodeID);
            return node ? (node.services as unknown as unknown[]) : [];
        }
        return this.registry.listServices() as unknown as unknown[];
    }
}
