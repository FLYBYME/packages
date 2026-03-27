import { IBrokerPlugin, IServiceBroker, IContext, INextFunction } from '@flybyme/isomorphic-core';
import { IDatabaseAdapter } from './core/Table';
import { MongoDBAdapter, MongoConfig } from './adapters/MongoDBAdapter';
import { PostgresAdapter, PostgresConfig } from './adapters/PostgresAdapter';
import { SQLiteAdapter, SQLiteConfig } from './adapters/SQLiteAdapter';
import { NeDBAdapter, NeDBConfig } from './adapters/NeDBAdapter';
import { MockDatabaseAdapter } from './adapters/MockDatabaseAdapter';

export type AdapterType = 'mongodb' | 'postgres' | 'sqlite' | 'nedb' | 'mock';

export type DatabasePluginConfig = {
    enforceTenancy?: boolean;
    schemaVersion?: string;
    repositories?: Record<string, unknown>;
} & (
    | { adapterType: 'mongodb'; adapterConfig: MongoConfig }
    | { adapterType: 'postgres'; adapterConfig: PostgresConfig }
    | { adapterType: 'sqlite'; adapterConfig: SQLiteConfig }
    | { adapterType: 'nedb'; adapterConfig: NeDBConfig }
    | { adapterType: 'mock'; adapterConfig?: never }
);

/**
 * DatabasePlugin — LOCAL Pipeline middleware for data access.
 * ZERO 'any' casts.
 */
export class DatabasePlugin implements IBrokerPlugin {
    public readonly name = 'database-plugin';
    public readonly adapter: IDatabaseAdapter;
    private listeners = new Map<string, Set<() => void>>();

    constructor(public readonly config: DatabasePluginConfig) {
        this.adapter = this.createAdapter(config.adapterType, config.adapterConfig);
    }

    private createAdapter(type: AdapterType, config: DatabasePluginConfig['adapterConfig']): IDatabaseAdapter {
        if (type === 'mongodb') return new MongoDBAdapter(config as MongoConfig);
        if (type === 'postgres') return new PostgresAdapter(config as PostgresConfig);
        if (type === 'sqlite') return new SQLiteAdapter(config as SQLiteConfig);
        if (type === 'nedb') return new NeDBAdapter(config as NeDBConfig);
        if (type === 'mock') return new MockDatabaseAdapter();
        throw new Error(`Unknown database adapter type: ${type}`);
    }

    onRegister(broker: IServiceBroker): void {
        const app = broker.app;
        
        // Define a strict shape for config metadata
        const config = app.config as { metadata?: Record<string, unknown> };
        const metadata = config.metadata || {};
        metadata.dbSchemaVersion = this.config.schemaVersion;
        config.metadata = metadata;

        // Local Middleware: Only runs for local requests
        broker.useLocal(async (ctx: IContext, next: INextFunction) => {
            // Augmented properties from IContext
            ctx.db = this.adapter;
            if (this.config.repositories) {
                ctx.repos = this.config.repositories as Record<string, { find: (id: string | number) => Promise<unknown | null> }>;
            }
            return await next();
        });

        broker.on('$db.*.mutated', (payload: unknown) => {
            const data = payload as { table: string };
            this.invalidate(data.table);
        });
    }

    async onStart(): Promise<void> {
        await this.adapter.init();
    }

    async onStop?(): Promise<void> {
        await this.adapter.disconnect();
    }

    public watch(table: string, onMutated: () => void): () => void {
        if (!this.listeners.has(table)) this.listeners.set(table, new Set());
        this.listeners.get(table)!.add(onMutated);
        return () => this.listeners.get(table)?.delete(onMutated);
    }

    public invalidate(table: string): void {
        const set = this.listeners.get(table);
        if (set) for (const refresh of set) refresh();
    }
}
