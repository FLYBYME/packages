import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';

export interface NeDBConfig {
    filename?: string;
    inMemoryOnly?: boolean;
}

interface INeDBCursor<T = unknown> extends Promise<T[]> {
    projection(proj: object): this;
    skip(n: number): this;
    limit(n: number): this;
}

interface INeDBDatastore {
    find<T = unknown>(query: object): INeDBCursor<T>;
    count(query: object): Promise<number>;
    insert<T = unknown>(doc: T): Promise<T & { _id: string }>;
    update(query: object, update: object, options?: { multi?: boolean }): Promise<number>;
    remove(query: object, options?: { multi?: boolean }): Promise<number>;
}

interface INeDBStatic {
    create(config: object): INeDBDatastore;
}

export class NeDBAdapter implements IDatabaseAdapter {
    public readonly name = 'native-nedb';
    private collections: Map<string, INeDBDatastore> = new Map();

    constructor(private readonly config: NeDBConfig) {}

    async init(): Promise<void> {
        // NeDB usually initializes per collection.
        // For NeDB, we'll load them on demand in getCollection
    }

    async disconnect(): Promise<void> {
        this.collections.clear();
    }

    private async getCollection(name: string): Promise<INeDBDatastore> {
        if (!this.collections.has(name)) {
            try {
                // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
                // @ts-expect-error
                const Datastore = (await import('nedb-promises')).default as unknown as INeDBStatic;
                const ds = Datastore.create({
                    filename: this.config.filename ? `${this.config.filename}_${name}` : undefined,
                    inMemoryOnly: this.config.inMemoryOnly,
                    autoload: true
                });
                this.collections.set(name, ds);
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                throw new Error(`Failed to load NeDB for collection ${name}: ${error.message}`);
            }
        }
        const ds = this.collections.get(name);
        if (!ds) throw new Error(`Failed to retrieve collection ${name}`);
        return ds;
    }

    private translateAST(ast: QueryAST): object {
        const filter: Record<string, unknown> = {};
        
        if (ast.tenantId) {
            filter.tenant_id = ast.tenantId;
        }

        for (const f of ast.filters) {
            const colName = f.column === 'id' ? '_id' : f.column;
            const mgOp = this.mapOperator(f.operator);
            if (mgOp === '$eq') {
                filter[colName] = f.value;
            } else {
                const existing = filter[colName] as Record<string, unknown> | undefined;
                if (!existing) {
                    filter[colName] = { [mgOp]: f.value };
                } else {
                    existing[mgOp] = f.value;
                }
            }
        }

        return filter;
    }

    private mapOperator(op: string): string {
        switch (op) {
            case '=': return '$eq';
            case '!=': return '$ne';
            case '>': return '$gt';
            case '<': return '$lt';
            case '>=': return '$gte';
            case '<=': return '$lte';
            default: return '$eq';
        }
    }

    async find<T = unknown>(ast: QueryAST): Promise<T[]> {
        const filter = this.translateAST(ast);
        const col = await this.getCollection(ast.table);
        
        let cursor = col.find(filter);
        
        if (ast.select && ast.select.length > 0) {
            const projection: Record<string, number> = {};
            for (const field of ast.select) {
                projection[field === 'id' ? '_id' : field] = 1;
            }
            cursor = cursor.projection(projection);
        }

        if (ast.offset !== undefined) cursor = cursor.skip(ast.offset);
        if (ast.limit !== undefined) cursor = cursor.limit(ast.limit);

        const rows = await cursor as unknown as unknown[];
        
        return rows.map((r: unknown) => {
            const { _id, ...rest } = r as { _id: string };
            return { id: String(_id), ...rest };
        }) as T[];
    }

    async count(ast: QueryAST): Promise<number> {
        const filter = this.translateAST(ast);
        const col = await this.getCollection(ast.table);
        return col.count(filter);
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...cleanData } = data as unknown as Record<string, unknown>;
        const col = await this.getCollection(table);
        const res = await col.insert(cleanData);
        return { changes: 1, lastInsertId: String(res._id) };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...cleanData } = data as unknown as Record<string, unknown>;
        const filter = this.translateAST(ast);
        const col = await this.getCollection(ast.table);
        const res = await col.update(filter, { $set: cleanData }, { multi: true });
        return { changes: res };
    }

    async delete(ast: QueryAST): Promise<DatabaseResult> {
        const filter = this.translateAST(ast);
        const col = await this.getCollection(ast.table);
        const res = await col.remove(filter, { multi: true });
        return { changes: res };
    }
}

