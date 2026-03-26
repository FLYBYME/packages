import { ServiceSchema, IServiceInstance, ILogger } from '../types/registry.types';
import { IServiceBroker, IMeshApp } from '@flybyme/isomorphic-core';

/**
 * ServiceInitializer — creates a service instance from a schema.
 */
export class ServiceInitializer {
    static createInstance(schema: ServiceSchema, logger: ILogger, broker: IServiceBroker, app: IMeshApp): IServiceInstance {
        const fullName = schema.version ? `v${schema.version}.${schema.name}` : schema.name;
        
        const instance: IServiceInstance = {
            name: schema.name,
            fullName,
            version: schema.version,
            schema,
            state: 'initializing',
            logger,
            broker,

            async start() {
                this.state = 'starting';
                if (schema.started) await schema.started();
                this.state = 'running';
            },

            async stop() {
                this.state = 'stopping';
                if (schema.stopped) await schema.stopped();
                this.state = 'stopped';
            }
        };

        if (schema.created) schema.created(app);

        return instance;
    }
}
