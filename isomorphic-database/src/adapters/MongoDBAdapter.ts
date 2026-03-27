import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';

export interface MongoConfig {
    uri: string;
    dbName: string;
}

interface IMongoCollection {
    find(query: object, options?: object): { toArray(): Promise<unknown[]> };
    countDocuments(query: object): Promise<number>;
    insertOne(doc: object): Promise<{ insertedId: unknown }>;
    updateMany(query: object, update: object): Promise<{ modifiedCount: number }>;
    deleteMany(query: object): Promise<{ deletedCount: number }>;
}

interface IMongoDb {
    collection(name: string): IMongoCollection;
}

interface IMongoClient {
    connect(): Promise<void>;
    db(dbName: string): IMongoDb;
    close(): Promise<void>;
}

interface IMongoStatic {
    MongoClient: new (uri: string) => IMongoClient;
    ObjectId: {
        new (id: string): unknown;
        isValid(id: string): boolean;
    };
}

export class MongoDBAdapter implements IDatabaseAdapter {
    public readonly name = 'native-mongodb';
    private client?: IMongoClient;
    private db?: IMongoDb;
    private ObjectId?: IMongoStatic['ObjectId'];

    constructor(private readonly config: MongoConfig) {}

    async init(): Promise<void> {
        try {
            // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
            // @ts-ignore - mongodb might not be available at compile time or type mismatch during dynamic import
            const { MongoClient, ObjectId } = await import('mongodb') as unknown as IMongoStatic;
            this.ObjectId = ObjectId;
            this.client = new MongoClient(this.config.uri);
            await this.client.connect();
            this.db = this.client.db(this.config.dbName);
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            throw new Error(`Failed to initialize MongoDBAdapter: ${error.message}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }

    private translateAST(ast: QueryAST): object {
        const filter: Record<string, unknown> = {};
        
        if (ast.tenantId) {
            filter.tenant_id = ast.tenantId;
        }

        for (const f of ast.filters) {
            const colName = f.column === 'id' ? '_id' : f.column;
            let value = f.value;

            if (colName === '_id' && typeof value === 'string' && this.ObjectId?.isValid(value)) {
                value = new this.ObjectId(value);
            }

            const mgOp = this.mapOperator(f.operator);
            if (mgOp === '$eq') {
                filter[colName] = value;
            } else {
                const existing = filter[colName] as Record<string, unknown> | undefined;
                if (!existing) {
                    filter[colName] = { [mgOp]: value };
                } else {
                    existing[mgOp] = value;
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
        if (!this.db) throw new Error('MongoDBAdapter not initialized');
        const filter = this.translateAST(ast);
        const options: Record<string, unknown> = {};
        
        if (ast.limit !== undefined) options.limit = ast.limit;
        if (ast.offset !== undefined) options.skip = ast.offset;
        
        if (ast.select && ast.select.length > 0) {
            const projection: Record<string, number> = {};
            for (const col of ast.select) {
                projection[col === 'id' ? '_id' : col] = 1;
            }
            options.projection = projection;
        }

        const col = this.db.collection(ast.table);
        const rows = await col.find(filter, options).toArray();
        
        return rows.map((r: unknown) => {
            const { _id, ...rest } = r as { _id: unknown };
            return { id: String(_id), ...rest };
        }) as T[];
    }

    async count(ast: QueryAST): Promise<number> {
        if (!this.db) throw new Error('MongoDBAdapter not initialized');
        const filter = this.translateAST(ast);
        return this.db.collection(ast.table).countDocuments(filter);
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        if (!this.db) throw new Error('MongoDBAdapter not initialized');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...cleanData } = data as unknown as Record<string, unknown>;
        const col = this.db.collection(table);
        const res = await col.insertOne(cleanData);
        return { changes: 1, lastInsertId: String(res.insertedId) };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        if (!this.db) throw new Error('MongoDBAdapter not initialized');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...cleanData } = data as unknown as Record<string, unknown>;
        const filter = this.translateAST(ast);
        const col = this.db.collection(ast.table);
        const res = await col.updateMany(filter, { $set: cleanData });
        return { changes: res.modifiedCount };
    }

    async delete(ast: QueryAST): Promise<DatabaseResult> {
        if (!this.db) throw new Error('MongoDBAdapter not initialized');
        const filter = this.translateAST(ast);
        const col = this.db.collection(ast.table);
        const res = await col.deleteMany(filter);
        return { changes: res.deletedCount };
    }
}

