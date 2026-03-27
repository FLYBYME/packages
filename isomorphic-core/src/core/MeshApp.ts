import {
    IMeshApp,
    IMeshModule,
    AppConfig,
    IProviderToken,
    IContext,
    ILogger,
    IServiceBroker,
    IServiceSchema,
    IServiceRegistry,
    IServiceActionRegistry,
    IMiddleware
} from '../interfaces';
import { BootOrchestrator } from './BootOrchestrator';

// Define a default logger that explicitly implements ILogger
const defaultLogger: ILogger = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (msg: string, ...args: any[]) => {
        if ((globalThis as Record<string, unknown>).MESH_SILENT) return;
        console.debug(msg, ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (msg: string, ...args: any[]) => {
        if ((globalThis as Record<string, unknown>).MESH_SILENT) return;
        console.info(msg, ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (msg: string, ...args: any[]) => {
        if ((globalThis as Record<string, unknown>).MESH_SILENT) return;
        console.warn(msg, ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (msg: string, ...args: any[]) => {
        if ((globalThis as Record<string, unknown>).MESH_SILENT) return;
        console.error(msg, ...args);
    },
    getLevel: () => 1, // Default to INFO
    child: (_context: Record<string, unknown>): ILogger => {
        // For simplicity, child logger just returns the same logger instance.
        // A more sophisticated implementation might handle context propagation.
        return defaultLogger;
    }
};

/**
 * MeshApp — The "Motherboard" shell that provides DI and lifecycle management.
 */
export class MeshApp implements IMeshApp {
    public readonly nodeID: string;
    public readonly namespace: string;
    public readonly config: AppConfig;
    public readonly logger: ILogger;

    protected modules: IMeshModule[] = [];
    protected pendingMiddleware: ((ctx: IContext<Record<string, unknown>, Record<string, unknown>>, next: () => Promise<unknown>) => Promise<unknown>)[] = [];
    protected providers = new Map<string, unknown>();
    protected pendingServices: IServiceSchema[] = [];
    public orchestrator: BootOrchestrator;

    constructor(config: AppConfig) {
        this.nodeID = config.nodeID;
        this.namespace = config.namespace || 'default';
        this.config = config;
        this.orchestrator = new BootOrchestrator(this as IMeshApp);

        // Use the default logger if config.logger is not provided
        this.logger = config.logger || defaultLogger;
        // Ensure logger is prefixed with nodeID for better context
        this.logger = this.logger.child({ nodeID: this.nodeID, namespace: this.namespace });

        this.registerProvider<ILogger>('logger', this.logger);
        this.registerProvider<IMeshApp>('app', this);
    }

    public get registry(): IServiceRegistry {
        return this.getProvider<IServiceRegistry>('registry');
    }

    public getConfig(): AppConfig {
        return this.config;
    }

    public use(moduleOrMiddleware: IMeshModule | ((ctx: IContext<Record<string, unknown>, Record<string, unknown>>, next: () => Promise<unknown>) => Promise<unknown>)): this {
        if (typeof moduleOrMiddleware === 'function') {
            if (this.hasProvider('broker')) {
                const broker = this.getProvider<IServiceBroker>('broker');
                broker.use(moduleOrMiddleware as IMiddleware); // Type narrowing middleware is complex, cast to any temporarily but interface is strict
            } else {
                this.pendingMiddleware.push(moduleOrMiddleware);
            }
        } else {
            this.modules.push(moduleOrMiddleware);
        }
        return this;
    }

    public async registerService(service: IServiceSchema): Promise<this> {
        if (this.hasProvider('broker')) {
            const broker = this.getProvider<IServiceBroker>('broker');
            await broker.registerService(service);
        } else {
            this.pendingServices.push(service);
        }
        return this;
    }

    private getTokenKey<T>(token: IProviderToken<T>): string {
        if (typeof token === 'string' || typeof token === 'symbol') {
            return token.toString();
        }
        // Force explicit identifiers if available to prevent minification mangling.
        if (typeof token === 'function' || (typeof token === 'object' && token !== null)) {
            if ('id' in token && token.id) return String(token.id);
            if ('name' in token && typeof token.name === 'string' && token.name !== 'Function' && token.name !== 'Object') return token.name;
        }

        throw new Error(`[MeshApp] Invalid provider token. Use a string, symbol, or a class/function with a stable name/id.`);
    }

    public hasProvider<T>(token: IProviderToken<T>): boolean {
        try {
            const key = this.getTokenKey(token);
            return this.providers.has(key);
        } catch {
            return false;
        }
    }

    public registerProvider<T>(token: IProviderToken<T>, provider: T): void {
        const key = this.getTokenKey(token);
        this.providers.set(key, provider);

        if (key === 'broker') {
            const broker = provider as IServiceBroker;
            while (this.pendingMiddleware.length > 0) {
                broker.use(this.pendingMiddleware.shift()!);
            }
            while (this.pendingServices.length > 0) {
                const service = this.pendingServices.shift();
                if (service) {
                    broker.registerService(service).catch(err => {
                        this.logger.error(`[MeshApp] Failed to register pending service: ${service.name}`, { error: err.message });
                    });
                }
            }
        }
    }

    public getProvider<T>(token: IProviderToken<T>): T {
        const key = this.getTokenKey(token);
        const provider = this.providers.get(key);
        if (provider === undefined) {
            throw new Error(`[MeshApp] Provider not found for token: ${key}`);
        }
        return provider as T;
    }

    public async start(): Promise<void> {
        this.logger.info('MeshApp starting...');
        await this.orchestrator.executeBootSequence(this.modules);
        this.logger.info('MeshApp started successfully.');
    }

    public async call<K extends keyof IServiceActionRegistry>(
        action: K,
        params: IServiceActionRegistry[K] extends { params: infer P } ? P : never,
        options?: { nodeID?: string; timeout?: number }
    ): Promise<IServiceActionRegistry[K] extends { returns: infer R } ? R : never> {
        const broker = this.getProvider<IServiceBroker>('broker');
        return (broker as any).call(action, params, options);
    }

    public async publish<T = unknown>(topic: string, data: T): Promise<void> {
        if (this.hasProvider('broker')) {
            const broker = this.getProvider<IServiceBroker>('broker');
            broker.emit(topic, data);
        } else {
            // Potentially queue or log
            this.logger.warn(`[MeshApp] Cannot publish to ${topic}, broker not initialized.`);
        }
    }

    public emit(event: string, payload: unknown): void {
        const broker = this.getProvider<IServiceBroker>('broker');
        broker.emit(event, payload);
    }

    public async stop(): Promise<void> {
        this.logger.info('MeshApp stopping...');
        await this.orchestrator.executeTeardown(this.modules);
        this.logger.info('MeshApp stopped.');
    }
}

/**
 * Factory for creating a MeshApp instance.
 */
export function createMeshApp(config: AppConfig & { modules?: IMeshModule[] }): MeshApp {
    const app = new MeshApp(config);
    if (config.modules) {
        for (const mod of config.modules) {
            app.use(mod);
        }
    }
    return app;
}
