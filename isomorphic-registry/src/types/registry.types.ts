import { IActionDefinition, IServiceSchema, IServiceInstance, IContext, ILogger, ServiceState } from '@flybyme/isomorphic-core';

export { 
    IActionDefinition as ActionSchema, 
    IServiceSchema as ServiceSchema, 
    IServiceInstance, 
    IContext as Context,
    ILogger,
    ServiceState
};

export interface IMeshAuthMeta extends Record<string, unknown> {
    shardKey?: string;
}

export interface RegistryConfig {
    dht?: {
        enabled: boolean;
        bucketSize?: number;
    };
    heartbeatInterval?: number;
}
