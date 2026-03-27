import { IMeshModule } from './IMeshModule';
import { ILogger } from './ILogger';
import { IServiceSchema } from './IService';
import { IProviderToken } from './IProviderToken';

import { IServiceRegistry } from './IServiceRegistry';
import { IServiceActionRegistry } from './IGlobalRegistry';

export interface AppConfig extends Record<string, unknown> {
    nodeID: string;
    namespace?: string;
    logger?: ILogger;
}

/**
 * IMeshNode — Base interface for a node in the mesh.
 */
export interface IMeshNode {
    readonly nodeID: string;
    readonly namespace: string;
    readonly logger: ILogger;
    readonly registry: IServiceRegistry;
    getConfig?(): Record<string, unknown>;
    publish<T = unknown>(topic: string, data: T): Promise<void>;
    orchestrator?: unknown;
}

/**
 * IMeshApp — Core container for the mesh application.
 */
export interface IMeshApp extends IMeshNode {
    readonly nodeID: string;
    config: AppConfig;
    logger: ILogger;

    /** Registers a module or middleware. */
    use(moduleOrMiddleware: IMeshModule | ((ctx: unknown, next: () => Promise<unknown>) => Promise<unknown>)): this;

    /** Registers a service. */
    registerService(service: IServiceSchema): Promise<this>;

    /** Registers a provider for DI. */
    registerProvider<T>(token: IProviderToken<T>, provider: T): void;

    /** Checks if a provider exists. */
    hasProvider<T>(token: IProviderToken<T>): boolean;

    /** Gets a provider from DI. */
    getProvider<T>(token: IProviderToken<T>): T;

    /** Starts the application. */
    start(): Promise<void>;

    /** Stops the application. */
    stop(): Promise<void>;

    call<K extends keyof IServiceActionRegistry>(
        action: K,
        params: IServiceActionRegistry[K] extends { params: infer P } ? P : never,
        options?: { nodeID?: string; timeout?: number }
    ): Promise<IServiceActionRegistry[K] extends { returns: infer R } ? R : never>;
}
