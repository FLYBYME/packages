import { IMeshNetwork, IMeshPacket } from './IMeshNetwork';
import { ILogger } from './ILogger';
import { IServiceRegistry } from './IServiceRegistry';
import { IServiceSchema } from './IService';
import { IContext } from './IContext';
import { IMeshMeta } from './IMeshMeta';
import { IServiceActionRegistry, IServiceEventRegistry, ISettingsRegistry } from './IGlobalRegistry';
import { IBrokerPlugin } from './IBrokerPlugin';
import { IMeshApp } from './IMeshApp';
import { IMiddleware } from './IInterceptor';

/**
 * IServiceBroker — Interface for the central communication kernel.
 * Refactored for Bipartite Pipeline and High-Speed execution.
 */
export interface IServiceBroker {
    readonly app: IMeshApp;
    readonly logger: ILogger;
    readonly registry: IServiceRegistry;
    readonly network: IMeshNetwork;

    /** Registers a plugin into the broker's lifecycle. */
    pipe(plugin: IBrokerPlugin): this;

    /** Registers a middleware in the GLOBAL pipeline (Always runs). */
    use(mw: IMiddleware): void;

    /** Registers a middleware in the LOCAL pipeline (Runs only for local services). */
    useLocal(mw: IMiddleware): void;

    /** Registers a service schema. */
    registerService(service: IServiceSchema): Promise<void>;

    /** Fully processes a context through the pipeline. */
    handlePipeline(ctx: IContext<Record<string, unknown>, IMeshMeta>): Promise<unknown>;

    /** Low-level execution (used by NetworkPlugin for inbound requests) */
    handleIncomingRPC(packet: IMeshPacket): Promise<unknown>;

    /** Low-level dispatch to remote node. */
    executeRemote(nodeID: string, actionName: string, params: unknown, meta?: Record<string, unknown>): Promise<unknown>;

    /** Typed mesh action call. */
    call<K extends keyof IServiceActionRegistry>(
        action: K,
        params: IServiceActionRegistry[K] extends { params: infer P } ? P : never,
        options?: { nodeID?: string; timeout?: number }
    ): Promise<IServiceActionRegistry[K] extends { returns: infer R } ? R : never>;

    /** Runtime access to schemas (instance property) */
    readonly actionSchemas: Map<string, {
        params?: import('zod').ZodTypeAny,
        returns?: import('zod').ZodTypeAny,
        mutates?: boolean,
        timeout?: number
    }>;

    /** Typed mesh event emit. */
    emit<K extends keyof IServiceEventRegistry>(event: K, payload: unknown): void;

    /** Untyped event emit. */
    emit(event: string, payload: unknown): void;

    /** Typed settings retrieval. */
    getSetting<K extends keyof ISettingsRegistry>(key: K): ISettingsRegistry[K];
    getSetting<T = unknown>(key: string): T;

    /** Subscription to events. */
    on<T = unknown>(topic: string, handler: (payload: T, packet?: IMeshPacket<T>) => void): (() => void);
    off<T = unknown>(topic: string, handler: (payload: T, packet?: IMeshPacket<T>) => void): void;

    /** Gets the current execution context. */
    getContext(): IContext<Record<string, unknown>, IMeshMeta> | undefined;

    /** Starts the broker and its plugins. */
    start(): Promise<void>;

    /** Stops the broker. */
    stop(): Promise<void>;

    /** Manual wiring (called by plugins) */
    setNetwork(network: IMeshNetwork): void;
    setRegistry(registry: IServiceRegistry): void;
}
