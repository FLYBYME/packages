import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';

export interface MongoConfig {
    uri: string;
    dbName: string;
}

export class MongoDBAdapter implements IDatabaseAdapter {
    public readonly name = 'native-mongodb';
    private client: any;
    private db: any;
    private ObjectId: any;

    constructor(private readonly config: MongoConfig) {}

    async init(): Promise<void> {
        try {
            // @ts-ignore
            const { MongoClient, ObjectId } = await import('mongodb');
            this.ObjectId = ObjectId;
            this.client = new MongoClient(this.config.uri);
            await this.client.connect();
            this.db = this.client.db(this.config.dbName);
        } catch (error) {
            throw new Error(`Failed to initialize MongoDBAdapter: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }

    private translateAST(ast: QueryAST): object {
        const filter: any = {};
        
        if (ast.tenantId) {
            filter.tenant_id = ast.tenantId;
        }

        for (const f of ast.filters) {
            const colName = f.column === 'id' ? '_id' : f.column;
            let value = f.value;

            if (colName === '_id' && typeof value === 'string' && this.ObjectId.isValid(value)) {
                value = new this.ObjectId(value);
            }

            const mgOp = this.mapOperator(f.operator);
            if (mgOp === '$eq') {
                filter[colName] = value;
            } else {
                if (!filter[colName]) filter[colName] = {};
                filter[colName][mgOp] = value;
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
        const options: any = {};
        
        if (ast.limit !== undefined) options.limit = ast.limit;
        if (ast.offset !== undefined) options.skip = ast.offset;
        
        if (ast.select && ast.select.length > 0) {
            options.projection = {};
            for (const col of ast.select) {
                options.projection[col === 'id' ? '_id' : col] = 1;
            }
        }

        const col = this.db.collection(ast.table);
        const rows = await col.find(filter, options).toArray();
        
        return rows.map((r: any) => {
            const { _id, ...rest } = r;
            return { id: String(_id), ...rest };
        }) as T[];
    }

    async count(ast: QueryAST): Promise<number> {
        const filter = this.translateAST(ast);
        return this.db.collection(ast.table).countDocuments(filter);
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        const { id, ...cleanData } = data as any;
        const col = this.db.collection(table);
        const res = await col.insertOne(cleanData);
        return { changes: 1, lastInsertId: String(res.insertedId) };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        const { id, ...cleanData } = data as any;
        const filter = this.translateAST(ast);
        const col = this.db.collection(ast.table);
        const res = await col.updateMany(filter, { $set: cleanData });
        return { changes: res.modifiedCount };
    }

    async delete(ast: QueryAST): Promise<DatabaseResult> {
        const filter = this.translateAST(ast);
        const col = this.db.collection(ast.table);
        const res = await col.deleteMany(filter);
        return { changes: res.deletedCount };
    }
}

