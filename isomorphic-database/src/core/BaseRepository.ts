import { z } from 'zod';
import { QueryBuilder, TableSchema, ColumnOf } from './QueryBuilder';
import { IDatabaseAdapter, TableDefinition, FilterOperator } from './Table';
import { IServiceBroker, ContextStack } from '@flybyme/isomorphic-core';

/**
 * FilterObject — A standardized object for querying.
 * Supports exact values or operator objects.
 */
export type FilterObject<T extends z.AnyZodObject> = {
    [K in keyof TableSchema<T>]?: TableSchema<T>[K] | {
        [Op in FilterOperator]?: TableSchema<T>[K];
    };
};

/**
 * QueryOptions — Standard options for data retrieval.
 */
export interface QueryOptions<T extends z.AnyZodObject> {
    limit?: number;
    offset?: number;
    select?: Array<ColumnOf<T>>;
    skipTenancy?: boolean;
}

/**
 * BaseRepository — The exclusive public interface for database operations.
 */
export class BaseRepository<T extends z.AnyZodObject> {
    protected table: TableDefinition<T>;

    constructor(
        tableName: string,
        schema: T,
        protected readonly adapter: IDatabaseAdapter,
        protected broker?: IServiceBroker,
        protected readonly enforceTenancy: boolean = true
    ) {
        this.table = { name: tableName, schema };
    }

    /**
     * Creates a new instance of the query builder for this table.
     * Internal use only.
     */
    protected builder(skipTenancy: boolean = false): QueryBuilder<T> {
        const shouldEnforce = this.enforceTenancy && !skipTenancy;
        
        // If we are supposed to enforce tenancy, check if we have a tenant ID.
        // If we don't have one in context, we might be in a system/background task.
        const tid = this.getTenantId();
        const activeTenancy = shouldEnforce && !!tid;

        return new QueryBuilder(this.table, this.adapter, activeTenancy, this.broker);
    }

    /**
     * Extracts the tenant_id from the active ServiceBroker context.
     */
    protected getTenantId(): string | undefined {
        const ctx = this.broker?.getContext() || ContextStack.getContext();
        if (!ctx) return undefined;
        return ctx.meta.user?.tenant_id || ctx.meta.tenant_id;
    }

    /**
     * Translates a FilterObject into a QueryBuilder instance.
     */
    protected translateFilter(filter: FilterObject<T> = {}, skipTenancy: boolean = false): QueryBuilder<T> {
        let qb = this.builder(skipTenancy);
        
        for (const [key, val] of Object.entries(filter)) {
            if (val === undefined) continue;

            if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).some(k => k.startsWith('$') || ['=', '!=', '>', '<', '>=', '<='].includes(k))) {
                // Operator object
                for (const [op, opVal] of Object.entries(val)) {
                    qb = qb.internalWhere(key, op as FilterOperator, opVal);
                }
            } else {
                // Exact value
                qb = qb.internalWhere(key, '=', val);
            }
        }

        return qb;
    }

    /**
     * Create a new record with runtime validation.
     */
    async create(data: Omit<z.input<T>, 'id'> & { id?: string | number }): Promise<TableSchema<T>> {
        const validated = this.table.schema.partial().parse(data);
        
        // Use a builder that knows about tenancy for the insert
        const res = await this.builder().insert(validated as Partial<TableSchema<T>>);
        
        const lookupId = res.id;

        // When retrieving after create, we bypass tenancy check just in case context changed
        // but we still prefer finding it.
        const fullObject = await this.findById(lookupId!, true);
        if (!fullObject) throw new Error(`Failed to retrieve created record ${lookupId}`);
        
        return this.table.schema.parse(fullObject) as TableSchema<T>;
    }

    /**
     * Upsert: Update if exists, Create if not.
     * Agnostic implementation of the SQL concept.
     */
    async upsert(id: string | number, data: z.input<T>): Promise<TableSchema<T>> {
        const existing = await this.findById(id, true);
        if (existing) {
            await this.update(id, data as Partial<TableSchema<T>>);
            return this.findById(id, true) as Promise<TableSchema<T>>;
        } else {
            return this.create({ ...data, id });
        }
    }

    /**
     * Find records matching a filter and options.
     */
    async find(filter: FilterObject<T> = {}, options: QueryOptions<T> = {}): Promise<TableSchema<T>[]> {
        let qb = this.translateFilter(filter, options.skipTenancy);

        if (options.select) qb = qb.select(options.select as any);
        if (options.limit !== undefined) qb = qb.limit(options.limit);
        if (options.offset !== undefined) qb = qb.offset(options.offset);

        const results = await qb.execute();
        return results.map(row => this.table.schema.parse(row)) as TableSchema<T>[];
    }

    /**
     * Find a single record matching a filter.
     */
    async findOne(filter: FilterObject<T>, options: QueryOptions<T> = {}): Promise<TableSchema<T> | null> {
        const results = await this.find(filter, { ...options, limit: 1 });
        return results[0] || null;
    }

    /**
     * Find a single record by its ID.
     */
    async findById(id: string | number, skipTenancy: boolean = false): Promise<TableSchema<T> | null> {
        // @ts-ignore - Assuming 'id' column exists
        return this.findOne({ id } as FilterObject<T>, { skipTenancy });
    }

    /**
     * Update records matching a filter.
     */
    async updateMany(filter: FilterObject<T>, data: Partial<TableSchema<T>>): Promise<{ changes: number }> {
        const validated = this.table.schema.partial().parse(data);
        return await this.translateFilter(filter).update(validated as Partial<TableSchema<T>>);
    }

    /**
     * Update a single record by ID.
     */
    async update(id: string | number, data: Partial<TableSchema<T>>): Promise<{ changes: number }> {
        // @ts-ignore - Assuming 'id' column exists
        return this.updateMany({ id } as FilterObject<T>, data);
    }

    /**
     * Remove records matching a filter.
     */
    async removeMany(filter: FilterObject<T>): Promise<{ changes: number }> {
        return await this.translateFilter(filter).delete();
    }

    /**
     * Remove a single record by ID.
     */
    async remove(id: string | number): Promise<{ changes: number }> {
        // @ts-ignore - Assuming 'id' column exists
        return this.removeMany({ id } as FilterObject<T>);
    }

    /**
     * Count records matching a filter.
     */
    async count(filter: FilterObject<T> = {}): Promise<number> {
        return await this.translateFilter(filter).count();
    }
}
