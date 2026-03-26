import { IBrokerPlugin, IServiceBroker, IContext, MeshActionSchemaRegistry } from '@flybyme/isomorphic-core';

/**
 * ConsensusPlugin — Passive observer for distributed state mutations.
 */
export class ConsensusPlugin implements IBrokerPlugin {
    public readonly name = '@flybyme/raft-consensus';

    constructor(private ledger?: unknown) {}

    onRegister(broker: IServiceBroker): void {
        // Global Middleware: Passive observer (does not block, only reacts after next())
        broker.use(async (ctx: IContext<unknown, Record<string, unknown>>, next: () => Promise<unknown>) => {
            const result = await next();
            
            const actionName = ctx.actionName;
            const schema = MeshActionSchemaRegistry.get(actionName);
            
            if (schema?.mutates === true) {
                broker.emit(`$${actionName.split('.')[0]}.mutated`, { 
                    action: actionName, 
                    correlationID: ctx.correlationID 
                });
            }
            
            return result;
        });
    }

    async onStart(): Promise<void> {}
    async onStop(): Promise<void> {}
}
