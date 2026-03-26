import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';

export interface NeDBConfig {
    filename?: string;
    inMemoryOnly?: boolean;
}

export class NeDBAdapter implements IDatabaseAdapter {
    public readonly name = 'native-nedb';
    private collections: Map<string, any> = new Map();

    constructor(private readonly config: NeDBConfig) {}

    async init(): Promise<void> {
        // NeDB usually initializes per collection.
        // For NeDB, we'll load them on demand in getCollection
    }

    async disconnect(): Promise<void> {
        this.collections.clear();
    }

    private async getCollection(name: string): Promise<any> {
        if (!this.collections.has(name)) {
            try {
                // @ts-ignore
                const Datastore = (await import('nedb-promises')).default;
                const ds = Datastore.create({
                    filename: this.config.filename ? `${this.config.filename}_${name}` : undefined,
                    inMemoryOnly: this.config.inMemoryOnly,
                    autoload: true
                });
                this.collections.set(name, ds);
            } catch (error) {
                throw new Error(`Failed to load NeDB for collection ${name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return this.collections.get(name);
    }

    private translateAST(ast: QueryAST): object {
        const filter: any = {};
        
        if (ast.tenantId) {
            filter.tenant_id = ast.tenantId;
        }

        for (const f of ast.filters) {
            const colName = f.column === 'id' ? '_id' : f.column;
            const mgOp = this.mapOperator(f.operator);
            if (mgOp === '$eq') {
                filter[colName] = f.value;
            } else {
                if (!filter[colName]) filter[colName] = {};
                filter[colName][mgOp] = f.value;
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
            const projection: any = {};
            for (const field of ast.select) {
                projection[field === 'id' ? '_id' : field] = 1;
            }
            cursor = cursor.projection(projection);
        }

        if (ast.offset !== undefined) cursor = cursor.skip(ast.offset);
        if (ast.limit !== undefined) cursor = cursor.limit(ast.limit);

        const rows = await cursor;
        
        return rows.map((r: any) => {
            const { _id, ...rest } = r;
            return { id: String(_id), ...rest };
        }) as T[];
    }

    async count(ast: QueryAST): Promise<number> {
        const filter = this.translateAST(ast);
        const col = await this.getCollection(ast.table);
        return col.count(filter);
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        const { id, ...cleanData } = data as any;
        const col = await this.getCollection(table);
        const res = await col.insert(cleanData);
        return { changes: 1, lastInsertId: String(res._id) };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        const { id, ...cleanData } = data as any;
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

