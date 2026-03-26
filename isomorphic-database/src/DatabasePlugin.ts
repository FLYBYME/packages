import { IBrokerPlugin, IServiceBroker, IContext, INextFunction } from '@flybyme/isomorphic-core';
import { IDatabaseAdapter } from './core/Table';
import { MongoDBAdapter, MongoConfig } from './adapters/MongoDBAdapter';
import { PostgresAdapter, PostgresConfig } from './adapters/PostgresAdapter';
import { SQLiteAdapter, SQLiteConfig } from './adapters/SQLiteAdapter';
import { NeDBAdapter, NeDBConfig } from './adapters/NeDBAdapter';
import { MockDatabaseAdapter } from './adapters/MockDatabaseAdapter';

export type AdapterType = 'mongodb' | 'postgres' | 'sqlite' | 'nedb' | 'mock';

export interface DatabasePluginConfig {
    adapterType: AdapterType;
    adapterConfig?: MongoConfig | PostgresConfig | SQLiteConfig | NeDBConfig | any;
    enforceTenancy?: boolean;
    schemaVersion?: string;
    repositories?: Record<string, unknown>;
}

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

    private createAdapter(type: AdapterType, config: any): IDatabaseAdapter {
        switch (type) {
            case 'mongodb': return new MongoDBAdapter(config);
            case 'postgres': return new PostgresAdapter(config);
            case 'sqlite': return new SQLiteAdapter(config);
            case 'nedb': return new NeDBAdapter(config);
            case 'mock': return new MockDatabaseAdapter();
            default: throw new Error(`Unknown database adapter type: ${type}`);
        }
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
