import {
    IServiceBroker,
    IMeshApp,
    ILogger,
    IMeshNetwork,
    IServiceRegistry,
    IContext,
    IMeshPacket,
    IServiceActionRegistry,
    IServiceEventRegistry,
    IBrokerPlugin,
    IServiceSchema,
    IActionDefinition,
    IMiddleware,
    IMeshMeta,
    SafeTimer,
    TimerHandle

} from '../interfaces';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { ContextStack } from './ContextStack';

/**
 * Internal interfaces for safe structural typing without 'any'.
 */
interface HasOptionalOff { off?(topic: string, handler: (payload: unknown) => void): void; }

/**
 * Metadata for local actions.
 */
interface LocalAction {
    handler: (ctx: IContext<Record<string, unknown>, Record<string, unknown>>) => Promise<unknown>;
    highSecurity?: boolean;
}


/**
 * ServiceBroker — The "OS Kernel" that routes requests locally or remotely.
 * Production-Grade implementation with Bipartite Pipeline.
 */
export class ServiceBroker implements IServiceBroker {
    public readonly actionSchemas = new Map<string, {
        params?: z.ZodTypeAny,
        returns?: z.ZodTypeAny,
        mutates?: boolean,
        timeout?: number
    }>();
    private localServices = new Map<string, LocalAction>();
    private services: IServiceSchema[] = [];
    private isStarted: boolean = false;

    // Bipartite Pipeline
    private globalMiddleware: IMiddleware[] = [];
    private localMiddleware: IMiddleware[] = [];

    private plugins: IBrokerPlugin[] = [];
    private pendingListeners: { topic: string, handler: (payload: unknown, packet: IMeshPacket<unknown>) => void }[] = [];

    public logger: ILogger;
    public registry!: IServiceRegistry;
    public network!: IMeshNetwork;
    public resiliency = {} as Record<string, unknown>;

    // RPC Correlation
    private pendingRequests = new Map<string, {
        resolve: (val: unknown) => void,
        reject: (err: Error) => void,
        timeout: TimerHandle
    }>();

    constructor(public readonly app: IMeshApp) {
        this.logger = app.getProvider<ILogger>('logger') || app.logger;
    }

    public pipe(plugin: IBrokerPlugin): this {
        this.plugins.push(plugin);
        plugin.onRegister(this);
        return this;
    }

    public setNetwork(network: IMeshNetwork): void {
        this.network = network;
        this.setupNetworkListeners();
        
        // Apply pending listeners
        for (const { topic, handler } of this.pendingListeners) {
            this.network.onMessage(topic, handler);
        }
        this.pendingListeners = [];
    }

    public setRegistry(registry: IServiceRegistry): void {
        this.registry = registry;
    }

    private setupNetworkListeners() {
        if (!this.network) return;
        this.network.onMessage('*', async (_data: unknown, packet: IMeshPacket) => {
            if (packet.type === 'RESPONSE' || packet.type === 'RESPONSE_ERROR') {
                const correlationId = (packet.meta?.correlationID || packet.id) as string;
                const pending = this.pendingRequests.get(correlationId);
                this.logger.debug(`[ServiceBroker] Processor: Received response for ${correlationId}. Pending: ${!!pending}`);
                if (pending) {
                    SafeTimer.clearTimeout(pending.timeout);
                    this.pendingRequests.delete(correlationId);
                    try {
                        if (packet.type === 'RESPONSE_ERROR') {
                            const errorData = packet.error;
                            pending.reject(new Error(errorData?.message || 'Remote RPC Error'));
                        } else {
                            pending.resolve(packet.data);
                        }
                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        this.logger.error(`[ServiceBroker] Unhandled exception in RPC response handler for ${correlationId}:`, { error: error.message });
                    }
                }
            }
        });
    }

    public use(mw: IMiddleware): void {
        this.globalMiddleware.push(mw);
    }

    public useLocal(mw: IMiddleware): void {
        this.localMiddleware.push(mw);
    }

    public getContext(): IContext<Record<string, unknown>, Record<string, unknown>> | undefined {
        return ContextStack.getContext() as IContext<Record<string, unknown>, Record<string, unknown>> | undefined;
    }

    public on<T = unknown>(topic: string, handler: (payload: T, packet: IMeshPacket<T>) => void): (() => void) {
        if (!this.network) {
            this.pendingListeners.push({ topic, handler: handler as (payload: unknown, packet: IMeshPacket<unknown>) => void });
            return () => {
                this.pendingListeners = this.pendingListeners.filter(l => l.handler !== handler);
                this.off(topic, handler);
            };
        }
        this.network.onMessage(topic, handler);
        return () => this.off(topic, handler);
    }

    public off<T = unknown>(topic: string, handler: (payload: T, packet: IMeshPacket<T>) => void): void {
        const net = this.network as HasOptionalOff;
        if (typeof net.off === 'function') net.off(topic, handler as (payload: unknown) => void);
    }

    public async registerService(service: IServiceSchema): Promise<void> {
        const serviceName = service.name || (service.constructor.name !== 'Object' ? service.constructor.name.replace('Service', '').toLowerCase() : undefined);
        if (!serviceName) throw new Error('[ServiceBroker] Service name must be provided');

        // Store the service instance
        this.services.push(service);

        // 1. Invoke initialization hooks
        if ('onInit' in service && typeof service.onInit === 'function') {
            await service.onInit(this.app);
        }
        if (typeof service.created === 'function') {
            await service.created(this.app);
        }

        const schemaActions = (service.actions || {}) as Record<string, IActionDefinition<unknown, unknown>>;
        // Removed problematic cast: const serviceDict = service as Record<string, unknown>;

        for (const actionNameKey of Object.keys(schemaActions)) {
            const actionDef = schemaActions[actionNameKey];
            // Access handler directly from service object, or use actionDef.handler
            const handler = service[actionNameKey as keyof IServiceSchema] || actionDef.handler;

            if (typeof handler === 'function') {
                const actionName = `${serviceName}.${actionNameKey}`;

                // Populate schema registry for runtime validation and mutation tracking
                this.actionSchemas.set(actionName, {
                    params: actionDef.params,
                    returns: actionDef.returns,
                    mutates: actionDef.mutates,
                    timeout: actionDef.timeout
                });

                this.localServices.set(actionName, {
                    handler: handler.bind(service) as (ctx: IContext<Record<string, unknown>, Record<string, unknown>>) => Promise<unknown>,
                    highSecurity: (actionDef as { highSecurity?: boolean }).highSecurity === true
                });
            } else {
                this.logger.warn(`[ServiceBroker] Action '${actionNameKey}' defined in schema for service '${serviceName}' but no handler found.`);
            }
        }

        // Feature: Registry Sync (Crucial for discovery)
        if (this.registry) {
            this.registry.registerService(service);
        }

        // 2. If the broker is ALREADY running, start the service immediately
        if (this.isStarted && typeof service.started === 'function') {
            await service.started();
        }
    }

    public async call<K extends keyof IServiceActionRegistry>(
        action: K,
        params: IServiceActionRegistry[K] extends { params: infer P } ? P : never,
        options?: { nodeID?: string; timeout?: number }
    ): Promise<IServiceActionRegistry[K] extends { returns: infer R } ? R : never> {
        const opts = options as { nodeID?: string; timeout?: number; parentContext?: any } | undefined;
        return this.internalCall(
            action, 
            params as Record<string, unknown>, 
            opts, 
            opts?.parentContext
        ) as any;
    }

    public emit<K extends keyof IServiceEventRegistry>(event: K, payload: unknown): void {
        if (!this.network) return;
        this.network.send('*', event as string, payload);
    }

    private async internalCall(actionName: string, params: Record<string, unknown>, options?: { nodeID?: string; timeout?: number }, parentCtx?: IContext<Record<string, unknown>, Record<string, unknown>>): Promise<unknown> {
        const schema = this.actionSchemas.get(actionName);
        // Ensure params are validated against schema if provided
        if (schema?.params && params !== undefined) {
            // If params is truly unknown, parse it. Otherwise, use it directly if already typed.
            try {
                params = schema.params.parse(params);
            } catch (error) {
                throw new Error(`[ServiceBroker] Invalid params for action ${actionName}: ${error}`);
            }
        } else if (params === undefined) {
            params = {}; // Default to empty object if no params provided or expected
        }

        let targetNodeID = options?.nodeID;

        // Feature: Automated Discovery & Load Balancing (Architectural Recommendation)
        if (!targetNodeID && !this.localServices.has(actionName)) {
            if (this.registry) {
                const endpoint = this.registry.selectNode(actionName, {
                    action: actionName,
                    params
                });
                if (endpoint) {
                    targetNodeID = endpoint.nodeID;
                    this.logger.info(`[ServiceBroker] Discovery: Routing '${actionName}' to node ${targetNodeID}`);
                } else {
                    this.logger.warn(`[ServiceBroker] Discovery: No nodes found for '${actionName}' across ${this.registry.getNodes().length} known nodes.`);
                }
            } else {
                this.logger.warn(`[ServiceBroker] Discovery: Registry not available for routing '${actionName}'`);
            }
        }

        const activeCtx = parentCtx || this.getContext();
        const traceId = activeCtx?.traceId || nanoid();
        const parentId = activeCtx?.spanId;
        const spanId = nanoid();

        const timeout = options?.timeout || schema?.timeout;

        // Ensure context params and meta are typed correctly
        const ctx: IContext<Record<string, unknown>, IMeshMeta> = {
            id: nanoid(),
            correlationID: activeCtx?.correlationID || nanoid(),
            actionName,
            params: params as Record<string, unknown>,
            meta: { ...activeCtx?.meta as IMeshMeta, timeout },
            targetNodeID: targetNodeID,
            callerID: activeCtx?.id || null,
            nodeID: this.app.nodeID,
            traceId,
            spanId,
            parentId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            call: (a: any, p: any, o?: any) => (this as any).call(a, p, { ...o, parentContext: ctx }) as any,
            emit: (e: string, p: Record<string, unknown>) => this.emit(e as keyof IServiceEventRegistry, p)
        };

        const result = await this.handlePipeline(ctx);
        if (schema?.returns) {
            return schema.returns.parse(result);
        }
        return result;
    }

    public async handleIncomingRPC(packet: IMeshPacket): Promise<unknown> {
        // Ensure meta is typed as Record<string, unknown>
        const meta = (packet.meta as Record<string, unknown>) || {};
        const targetNodeID = (meta.finalDestinationID as string) || packet.targetNodeID;

        const ctx: IContext<Record<string, unknown>, IMeshMeta> = {
            id: packet.id,
            correlationID: (packet.meta?.correlationID as string) || packet.id,
            actionName: packet.topic,
            params: packet.data as Record<string, unknown>,
            meta: meta as IMeshMeta,
            callerID: packet.senderNodeID,
            nodeID: this.app.nodeID,
            targetNodeID: targetNodeID,
            traceId: (meta.traceId as string) || nanoid(),
            spanId: (meta.spanId as string) || nanoid(),
            parentId: meta.parentId as string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            call: (a: any, p: any, o?: any) => (this as any).call(a, p, { ...o, parentContext: ctx }) as any,
            emit: (e: string, p: Record<string, unknown>) => this.emit(e as keyof IServiceEventRegistry, p)
        };

        const result = await this.handlePipeline(ctx);
        const schema = this.actionSchemas.get(packet.topic);
        if (schema?.returns) {
            return schema.returns.parse(result);
        }
        return result;
    }

    /**
     * Bipartite Pipeline Execution Engine.
     */
    public async handlePipeline(ctx: IContext<Record<string, unknown>, Record<string, unknown>>): Promise<unknown> {
        // Removed the explicit cast 'as IContext<unknown, unknown>' as ctx is now correctly typed.
        return await ContextStack.run(ctx, async () => {
            try {
                const finalHandler = async () => {
                    const isLocal = !ctx.targetNodeID || ctx.targetNodeID === this.app.nodeID;
                    if (isLocal) {
                        const action = this.localServices.get(ctx.actionName);
                        if (!action) throw new Error(`[ServiceBroker] Local action not found: ${ctx.actionName}`);
                        return await action.handler(ctx);
                    } else {
                        // Remote call dispatch logic (handled by global middleware or this default)
                        return await this.executeRemote(ctx.targetNodeID!, ctx.actionName, ctx.params, ctx.meta);
                    }
                };

                const isLocalInitially = !ctx.targetNodeID || ctx.targetNodeID === this.app.nodeID;
                const chain = [...this.globalMiddleware];
                if (isLocalInitially) {
                    chain.push(...this.localMiddleware);
                }

                return await this.executeChain(ctx, chain, finalHandler);

            } catch (err) {
                ctx.error = err instanceof Error ? err : new Error(String(err));
                throw ctx.error;
            }
        });
    }

    private async executeChain(
        ctx: IContext<Record<string, unknown>, Record<string, unknown>>,
        chain: IMiddleware[],
        finalHandler: () => Promise<unknown>
    ): Promise<unknown> {
        const executeNext = async (index: number): Promise<unknown> => {
            if (index < chain.length) {
                // Removed redundant cast 'as IContext<unknown, unknown>'
                return await chain[index](ctx, () => executeNext(index + 1));
            }
            return await finalHandler();
        };
        return await executeNext(0);
    }

    public async executeRemote(nodeID: string, actionName: string, params: unknown, meta: Record<string, unknown> = {}): Promise<unknown> {
        if (!this.network) throw new Error('[ServiceBroker] Network not initialized');
        
        // Phase 3: Reuse the original packet ID if provided in meta
        const requestId = (meta.correlationID as string) || (meta.id as string) || nanoid();

        const currentCtx = this.getContext();
        const tracingMeta = {
            traceId: currentCtx?.traceId,
            spanId: currentCtx?.spanId,
            parentId: currentCtx?.parentId
        };

        const schema = this.actionSchemas.get(actionName);
        const timeoutMs = (meta.timeout as number) || schema?.timeout || (this.app.config.rpcTimeout as number) || 10000;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`[ServiceBroker] RPC Timeout calling ${actionName} on ${nodeID} after ${timeoutMs}ms`));
            }, timeoutMs) as unknown as TimerHandle;
            this.pendingRequests.set(requestId, { resolve, reject, timeout });
            this.network.send(nodeID, actionName, params, {
                id: requestId,
                type: 'REQUEST',
                meta: { ...meta, ...tracingMeta, correlationID: requestId },
                senderNodeID: this.app.nodeID,
                topic: actionName
            }).catch(err => {
                SafeTimer.clearTimeout(timeout);
                this.pendingRequests.delete(requestId);
                reject(err instanceof Error ? err : new Error(String(err)));
            });
        });
    }

    public async start(): Promise<void> {
        this.isStarted = true;

        // Start all registered plugins
        for (const plugin of this.plugins) {
            if (plugin.onStart) await plugin.onStart(this);
        }

        // Start all registered services
        for (const service of this.services) {
            if (typeof service.started === 'function') {
                await service.started();
            }
        }
    }

    public async stop(): Promise<void> {
        this.isStarted = false;

        // Stop all registered services
        for (const service of this.services) {
            if (typeof service.stopped === 'function') {
                await service.stopped();
            }
        }

        for (const pending of this.pendingRequests.values()) {
            SafeTimer.clearTimeout(pending.timeout);
            pending.reject(new Error('Broker stopped'));
        }
        this.pendingRequests.clear();

        // Stop all plugins
        for (const plugin of this.plugins) {
            if (plugin.onStop) await plugin.onStop(this);
        }
    }

    public createService(): void { throw new Error('Not implemented'); }
    public getSetting(): void { throw new Error('Not implemented'); }
    public setSetting(): void { throw new Error('Not implemented'); }
}
