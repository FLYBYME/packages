import { z } from 'zod';
import { BaseRepository, FilterObject } from './BaseRepository';
import { TableDefinition, IDatabaseAdapter } from './Table';
import { IMeshApp, IServiceBroker, IContext, ILogger } from '@flybyme/isomorphic-core';

export interface IBaseService {
    onInit?(app: IMeshApp): Promise<void>;
    name?: string;
    actions?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GConstructor<T = object> = new (...args: any[]) => T;

/** Standard CRUD Schemas for Registry Augmentation */
export const CRUDSchemas = {
    create: z.record(z.unknown()),
    get: z.object({ id: z.string() }),
    list: z.object({ limit: z.number().optional(), offset: z.number().optional() }).passthrough(),
    find: z.record(z.unknown()),
    count: z.record(z.unknown()),
    remove: z.object({ id: z.string() })
};

/** 
 * CRUDActions Helper — Generates the types for auto-provisioned actions.
 */
export type CRUDActions<
    TPrefix extends string, 
    TSchema extends z.AnyZodObject, 
    TCreateSchema = TSchema,
    TUpdateSchema = Record<string, unknown>,
    TFindSchema = Record<string, unknown>
> = {
    [K in `${TPrefix}.create`]: { params: TCreateSchema, returns: TSchema };
} & {
    [K in `${TPrefix}.get`]: { params: typeof CRUDSchemas.get, returns: TSchema };
} & {
    [K in `${TPrefix}.list`]: { params: typeof CRUDSchemas.list, returns: z.ZodArray<TSchema> };
} & {
    [K in `${TPrefix}.find`]: { params: TFindSchema, returns: z.ZodArray<TSchema> };
} & {
    [K in `${TPrefix}.count`]: { params: TFindSchema, returns: z.ZodNumber };
} & {
    [K in `${TPrefix}.update`]: { params: TUpdateSchema, returns: z.ZodNumber };
} & {
    [K in `${TPrefix}.remove`]: { params: typeof CRUDSchemas.remove, returns: z.ZodNumber };
};

/**
 * DatabaseMixin — Auto-provisions 'this.db' (BaseRepository) and CRUD actions for services.
 */
export function DatabaseMixin<
    T extends z.AnyZodObject,
    N extends string,
    TExtra extends TableDefinition<z.AnyZodObject, string>[]
>(
    primaryTable: TableDefinition<T, N>,
    ...extraTables: TExtra
) {
    type AllTables = [TableDefinition<T, N>, ...TExtra];
    type DbsType = {
        [K in AllTables[number] as K['name']]: BaseRepository<K['schema']>;
    };

    return <TBase extends GConstructor<IBaseService>>(Base: TBase) => {
        return class extends Base {
            public db!: BaseRepository<T>;
            public broker!: IServiceBroker;
            public _tables = [primaryTable, ...extraTables];
            public dbs: DbsType = {} as DbsType;
            public _initialized = false;

            async onInit(app: IMeshApp): Promise<void> {
                if (this._initialized) return;
                this._initialized = true;

                if (super.onInit) {
                    await super.onInit(app);
                }

                const adapter = app.getProvider<IDatabaseAdapter>('database:adapter');
                const broker = app.getProvider<IServiceBroker>('broker');
                this.broker = broker;

                const serviceName = this.name || (this.constructor.name !== 'Object' ? this.constructor.name.replace('Service', '').toLowerCase() : 'unknown');
                const parentLogger = app.getProvider<ILogger>('logger') || app.logger;
                // @ts-expect-error - Some services might not declare logger, but we inject it anyway
                this.logger = parentLogger.child({ service: serviceName });

                const config = app.getProvider<Record<string, unknown>>('database:config');
                const enforceTenancy = config?.enforceTenancy !== false;

                this.db = new BaseRepository(primaryTable.name, primaryTable.schema, adapter, broker, enforceTenancy);
                (this.dbs as Record<string, BaseRepository<z.AnyZodObject>>)[primaryTable.name] = this.db;

                for (const table of extraTables) {
                    (this.dbs as Record<string, BaseRepository<z.AnyZodObject>>)[table.name] = new BaseRepository(table.name, table.schema, adapter, broker, enforceTenancy);
                }

                this._provisionCRUDActions();
            }

            public _provisionCRUDActions(): void {
                if (!this.actions) this.actions = {};
                const serviceActions = this.actions as Record<string, unknown>;
                const serviceName = this.name || (this.constructor.name !== 'Object' ? this.constructor.name.replace('Service', '').toLowerCase() : undefined);

                const register = <TS extends z.AnyZodObject>(tableName: string, repo: BaseRepository<TS>, isPrimary: boolean) => {
                    const prefix = isPrimary ? '' : `${tableName}.`;
                    const eventPrefix = isPrimary ? (serviceName || tableName) : `${serviceName || 'db'}.${tableName}`;

                    const crudHandlers = {
                        create: async (ctx: IContext<Record<string, unknown>>) => {
                            const now = Date.now();
                            const incoming = { ...(ctx.params as Record<string, unknown>) };
                            delete incoming.id;
                            const params: Record<string, unknown> = {
                                ...incoming,
                                createdAt: incoming.createdAt ? Number(incoming.createdAt) : now,
                                updatedAt: incoming.updatedAt ? Number(incoming.updatedAt) : now
                            };
                            const item = await repo.create(params as z.infer<TS>);
                            ctx.emit(`${eventPrefix}.created`, item as Record<string, unknown>);
                            return item;
                        },
                        get: async (ctx: IContext<Record<string, unknown>>) => {
                            const { id } = ctx.params;
                            if (!id || typeof id !== 'string') throw new Error('ID is required');
                            return await repo.findById(id);
                        },
                        find: async (ctx: IContext<Record<string, unknown>>) => {
                            return await repo.find(ctx.params as FilterObject<TS>);
                        },
                        list: async (ctx: IContext<Record<string, unknown>>) => {
                            const { limit, offset, ...filters } = ctx.params || {};
                            return await repo.find(filters as FilterObject<TS>, { 
                                limit: limit ? Number(limit) : undefined, 
                                offset: offset ? Number(offset) : undefined 
                            });
                        },
                        count: async (ctx: IContext<Record<string, unknown>>) => {
                            return await repo.count(ctx.params as FilterObject<TS>);
                        },
                        update: async (ctx: IContext<Record<string, unknown>>) => {
                            const { id, ...data } = ctx.params;
                            if (!id || typeof id !== 'string') throw new Error('ID is required for update');
                            const payload = {
                                ...data,
                                updatedAt: data.updatedAt ? Number(data.updatedAt) : Date.now()
                            };
                            const changes = await repo.update(id, payload as Partial<z.infer<TS>>);
                            if (changes.changes > 0) {
                                const updated = await repo.findById(id);
                                if (updated) {
                                    ctx.emit(`${eventPrefix}.updated`, updated as Record<string, unknown>);
                                }
                            }
                            return changes;
                        },
                        remove: async (ctx: IContext<Record<string, unknown>>) => {
                            const { id } = ctx.params;
                            if (!id || typeof id !== 'string') throw new Error('ID is required for removal');
                            const item = await repo.findById(id);
                            const changes = await repo.remove(id);
                            if (changes.changes > 0 && item) {
                                ctx.emit(`${eventPrefix}.removed`, item);
                            }
                            return changes;
                        }
                    };

                    for (const [actionName, handler] of Object.entries(crudHandlers)) {
                        const fullName = `${prefix}${actionName}`;
                        if (!serviceActions[fullName]) {
                            serviceActions[fullName] = {
                                handler: handler.bind(this)
                            };
                        }
                    }
                };

                register(primaryTable.name, this.db, true);
                for (const table of extraTables) {
                    register(table.name, (this.dbs as Record<string, BaseRepository<z.AnyZodObject>>)[table.name], false);
                }
            }
        };
    };
}
