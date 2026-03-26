import { 
    PostgresAdapter,
    MongoDBAdapter,
    NeDBAdapter,
} from '../src';
import { QueryAST } from '../src/interfaces/IDatabaseAdapter';

// Mock pg
const mockPgQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockPgPool = {
    query: mockPgQuery,
    end: jest.fn(),
    connect: jest.fn().mockResolvedValue({
        query: mockPgQuery,
        release: jest.fn()
    })
};
jest.mock('pg', () => ({
    Pool: jest.fn(() => mockPgPool)
}), { virtual: true });

// Mock mongodb
const mockMongoToArray = jest.fn().mockResolvedValue([]);
const mockMongoCol = {
    find: jest.fn().mockReturnValue({ toArray: mockMongoToArray }),
    countDocuments: jest.fn().mockResolvedValue(0),
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'mg123' }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
};
const mockMongoDb = {
    collection: jest.fn().mockReturnValue(mockMongoCol)
};
const mockMongoClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue(mockMongoDb),
    close: jest.fn().mockResolvedValue(undefined)
};
jest.mock('mongodb', () => ({
    MongoClient: jest.fn(() => mockMongoClient),
    ObjectId: {
        isValid: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('mock-object-id')
    }
}), { virtual: true });

// Mock nedb-promises
const mockNedbCursor = {
    projection: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation(function(resolve) {
        return Promise.resolve([]).then(resolve);
    })
};
const mockNedbDatastore = {
    find: jest.fn().mockReturnValue(mockNedbCursor),
    count: jest.fn().mockResolvedValue(0),
    insert: jest.fn().mockResolvedValue({ _id: 'ne123' }),
    update: jest.fn().mockResolvedValue(1),
    remove: jest.fn().mockResolvedValue(0)
};
jest.mock('nedb-promises', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => mockNedbDatastore)
    }
}), { virtual: true });

describe('Database Adapters Extensive', () => {
    const astFilterAndSelect: QueryAST = {
        table: 'users',
        select: ['id', 'name'],
        tenantId: 't1',
        filters: [
            { column: 'age', operator: '>', value: 18 },
            { column: 'status', operator: '=', value: 'active' }
        ],
        limit: 10,
        offset: 5
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPgQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    describe('PostgresAdapter', () => {
        it('should correctly build query bindings from AST', async () => {
            const adapter = new PostgresAdapter({ connectionString: 'postgres://localhost:5432/db' });
            await adapter.init();
            await adapter.find(astFilterAndSelect);

            expect(mockPgQuery).toHaveBeenCalledWith(
                'SELECT "id", "name" FROM "users" WHERE "tenant_id" = $1 AND "age" > $2 AND "status" = $3 LIMIT 10 OFFSET 5',
                ['t1', 18, 'active']
            );
        });

        it('should perform inserts with parameterized values and auto-migration', async () => {
            mockPgQuery.mockImplementation((sql: string) => {
                if (sql.includes('INSERT INTO')) {
                    return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
                }
                if (sql.includes('information_schema.columns')) {
                    return Promise.resolve({ rows: [{ column_name: 'id' }, { column_name: 'name' }, { column_name: 'role' }], rowCount: 3 });
                }
                return Promise.resolve({ rows: [], rowCount: 0 });
            });

            const adapter = new PostgresAdapter({ connectionString: 'postgres://localhost:5432/db' });
            await adapter.init();
            
            const res = await adapter.insert('users', { name: 'Alice', role: 'admin' });
            expect(mockPgQuery).toHaveBeenCalledWith(
                'INSERT INTO "users" ("id", "name", "role") VALUES ($1, $2, $3) RETURNING id',
                [expect.any(String), 'Alice', 'admin']
            );
            expect(res.lastInsertId).toBe(1);
        });

        it('should parameterize updates correctly', async () => {
            mockPgQuery.mockImplementation((sql: string) => {
                if (sql.includes('UPDATE')) {
                    return Promise.resolve({ rows: [], rowCount: 5 });
                }
                if (sql.includes('information_schema.columns')) {
                    return Promise.resolve({ rows: [{ column_name: 'id' }, { column_name: 'status' }], rowCount: 2 });
                }
                return Promise.resolve({ rows: [], rowCount: 0 });
            });

            const adapter = new PostgresAdapter({ connectionString: 'postgres://localhost:5432/db' });
            await adapter.init();

            const res = await adapter.update({ table: 'users', filters: [{ column: 'id', operator: '=', value: 10 }] }, { status: 'inactive' });
            expect(mockPgQuery).toHaveBeenCalledWith(
                'UPDATE "users" SET "status" = $1 WHERE "id" = $2',
                ['inactive', 10]
            );
            expect(res.changes).toBe(5);
        });
    });

    describe('MongoDBAdapter', () => {
        it('should map filter AST to MongoDB selectors', async () => {
            const adapter = new MongoDBAdapter({ uri: 'mongodb://localhost:27017', dbName: 'test' });
            await adapter.init();
            await adapter.find(astFilterAndSelect);

            expect(mockMongoCol.find).toHaveBeenCalledWith(
                {
                    tenant_id: 't1',
                    age: { $gt: 18 },
                    status: 'active'
                },
                { projection: { _id: 1, name: 1 }, limit: 10, skip: 5 }
            );
        });

        it('should map flat inserts and convert _id resolving', async () => {
            const adapter = new MongoDBAdapter({ uri: 'mongodb://localhost:27017', dbName: 'test' });
            await adapter.init();
            const res = await adapter.insert('users', { name: 'Bob' });
            expect(mockMongoCol.insertOne).toHaveBeenCalledWith({ name: 'Bob' });
            expect(res.lastInsertId).toBe('mg123');
        });
    });

    describe('NeDBAdapter', () => {
        it('should map filter AST and chain correctly', async () => {
            const adapter = new NeDBAdapter({ inMemoryOnly: true });
            await adapter.init();
            await adapter.find(astFilterAndSelect);

            expect(mockNedbDatastore.find).toHaveBeenCalledWith(
                {
                    tenant_id: 't1',
                    age: { $gt: 18 },
                    status: 'active'
                }
            );
            expect(mockNedbCursor.projection).toHaveBeenCalledWith({ _id: 1, name: 1 });
            expect(mockNedbCursor.limit).toHaveBeenCalledWith(10);
            expect(mockNedbCursor.skip).toHaveBeenCalledWith(5);
        });
    });
});
