import { IMeshModule, IMeshApp, IServiceBroker, ILogger } from '@flybyme/isomorphic-core';
import { DatabasePlugin, DatabasePluginConfig } from '../DatabasePlugin';

/**
 * DatabaseModule — Connects the database engine to the MeshApp shell.
 * Refactored to use the Pipeline/Middleware pattern via DatabasePlugin.
 */
export class DatabaseModule implements IMeshModule {
    public readonly name = 'database';
    public logger!: ILogger;
    public serviceBroker!: IServiceBroker;
    private plugin!: DatabasePlugin;
    private isReady = false;
    
    constructor(private config: DatabasePluginConfig) {
        this.plugin = new DatabasePlugin(this.config);
    }

    async onInit(app: IMeshApp): Promise<void> {
        this.logger = app.logger;
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');

        if (!this.serviceBroker) {
            this.logger.warn('[DatabaseModule] ServiceBroker not found during onInit. DatabasePlugin may not be installed.');
        }

        // Self-Install: Pipe into the broker
        if (this.serviceBroker) {
            this.serviceBroker.pipe(this.plugin);
            this.logger.info('[DatabaseModule] DatabasePlugin successfully piped into ServiceBroker.');
        }

        // For backward compatibility / standard DI
        app.registerProvider('database:adapter', this.plugin.adapter);
        app.registerProvider('database:config', this.config);
        app.registerProvider('database:module', this);
    }

    async onStart(): Promise<void> {
        // Initialization handled by the plugin's onStart hook
        this.isReady = true;
    }

    async health(): Promise<boolean> {
        return this.isReady;
    }

    public watch(table: string, onMutated: () => void): () => void {
        return this.plugin.watch(table, onMutated);
    }

    public invalidate(table: string): void {
        this.plugin.invalidate(table);
    }

    public get enforceTenancy(): boolean {
        return this.config.enforceTenancy !== false;
    }
}
