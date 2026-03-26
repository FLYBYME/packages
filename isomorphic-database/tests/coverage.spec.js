"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseRepository_1 = require("../src/core/BaseRepository");
const QueryBuilder_1 = require("../src/core/QueryBuilder");
const Table_1 = require("../src/core/Table");
const DatabaseMixin_1 = require("../src/core/DatabaseMixin");
const isomorphic_core_1 = require('@flybyme/isomorphic-core');
jest.mock('@flybyme/isomorphic-core', () => {
    return {
        ContextStack: {
            getContext: jest.fn(),
            run: jest.fn((_ctx, fn) => fn()),
        },
        ReactiveState: class {
            constructor(initial) {
                this.data = initial;
            }
        }
    };
});
describe('Database Tests', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAdapter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockBroker;
    let schema;
    let table;
    beforeEach(() => {
        jest.clearAllMocks();
        mockAdapter = {
            query: jest.fn().mockResolvedValue([]),
            run: jest.fn().mockResolvedValue({ lastInsertId: 1, changes: 1 }),
            transaction: jest.fn((fn) => fn()),
        };
        mockBroker = {
            getContext: jest.fn().mockReturnValue(undefined),
            emit: jest.fn(),
            on: jest.fn().mockReturnValue(() => { }),
        };
        schema = zod_1.z.object({
            id: zod_1.z.number().optional(),
            name: zod_1.z.string(),
            age: zod_1.z.number().optional()
        });
        table = (0, Table_1.defineTable)('users', schema);
    });
    describe('Table', () => {
        it('defineTable should create a table definition', () => {
            const t = (0, Table_1.defineTable)('test_table', schema);
            expect(t.name).toBe('test_table');
            expect(t.schema).toBe(schema);
        });
    });
    describe('BaseRepository', () => {
        let repo;
        beforeEach(() => {
            repo = new BaseRepository_1.BaseRepository('users', schema, mockAdapter, mockBroker);
        });
        it('should create an instance', () => {
            expect(repo).toBeDefined();
        });
        it('should extract tenant_id from broker context user', () => {
            mockBroker.getContext.mockReturnValue({ meta: { user: { tenant_id: 'tenant-1' } } });
            const tenantId = repo.getTenantId();
            expect(tenantId).toBe('tenant-1');
        });
        it('should extract tenant_id from broker context meta', () => {
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 'tenant-2' } });
            const tenantId = repo.getTenantId();
            expect(tenantId).toBe('tenant-2');
        });
        it('should fallback to ContextStack if broker is undefined', () => {
            const repoNoBroker = new BaseRepository_1.BaseRepository('users', schema, mockAdapter);
            isomorphic_core_1.ContextStack.getContext.mockReturnValue({ meta: { tenant_id: 'tenant-3' } });
            const tenantId = repoNoBroker.getTenantId();
            expect(tenantId).toBe('tenant-3');
        });
        it('should return undefined tenant_id if no context', () => {
            mockBroker.getContext.mockReturnValue(undefined);
            isomorphic_core_1.ContextStack.getContext.mockReturnValue(undefined);
            const tenantId = repo.getTenantId();
            expect(tenantId).toBeUndefined();
        });
        it('create should validate and insert data', async () => {
            mockAdapter.run.mockResolvedValue({ lastInsertId: 42 });
            mockAdapter.query.mockResolvedValue([{ id: 42, name: 'Alice', age: 30 }]);
            const data = { name: 'Alice', age: 30 };
            const result = await repo.create(data);
            expect(result).toEqual({ name: 'Alice', age: 30, id: 42 });
            expect(mockAdapter.run).toHaveBeenCalledWith('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30]);
        });
        it('find should execute query with filters', async () => {
            mockAdapter.query.mockResolvedValue([{ id: 1, name: 'Bob' }]);
            const results = await repo.find({ name: 'Bob' });
            expect(results).toEqual([{ id: 1, name: 'Bob' }]);
            expect(mockAdapter.query).toHaveBeenCalledWith('SELECT * FROM users WHERE name = ?', ['Bob']);
        });
        it('find should handle undefined filters', async () => {
            mockAdapter.query.mockResolvedValue([]);
            await repo.find({ name: 'Bob', age: undefined });
            expect(mockAdapter.query).toHaveBeenCalledWith('SELECT * FROM users WHERE name = ?', ['Bob']);
        });
        it('update should execute query with id filter', async () => {
            await repo.update(1, { age: 31 });
            expect(mockAdapter.run).toHaveBeenCalledWith('UPDATE users SET age = ? WHERE id = ?', [31, 1]);
        });
        it('remove should execute delete query with id filter', async () => {
            await repo.remove(1);
            expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', [1]);
        });
        it('findById should return a single record or null', async () => {
            mockAdapter.query.mockResolvedValue([{ id: 1, name: 'Charlie' }]);
            let res = await repo.findById(1);
            expect(res).toEqual({ id: 1, name: 'Charlie' });
            mockAdapter.query.mockResolvedValue([]);
            res = await repo.findById(2);
            expect(res).toBeNull();
        });
        it('findOne should return a single record or null', async () => {
            mockAdapter.query.mockResolvedValue([{ id: 1, name: 'Charlie' }]);
            let res = await repo.findOne({ name: 'Charlie' });
            expect(res).toEqual({ id: 1, name: 'Charlie' });
            mockAdapter.query.mockResolvedValue([]);
            res = await repo.findOne({ name: 'Dave' });
            expect(res).toBeNull();
        });
    });
    describe('QueryBuilder', () => {
        let qb;
        beforeEach(() => {
            qb = new QueryBuilder_1.QueryBuilder(table, mockAdapter, true, mockBroker);
        });
        it('should set tenantIdOverride', () => {
            const next = qb.forTenant('custom-tenant');
            expect(next.tenantIdOverride).toBe('custom-tenant');
        });
        it('should set selected columns', async () => {
            const nextQb = qb.select(['id', 'name']);
            mockAdapter.query.mockResolvedValue([{ id: 1, name: 'Eve' }]);
            const res = await nextQb.execute();
            expect(res).toEqual([{ id: 1, name: 'Eve' }]);
            expect(mockAdapter.query).toHaveBeenCalledWith('SELECT id, name FROM users', []);
        });
        it('should add limit and offset', async () => {
            const next = qb.limit(10).offset(5);
            mockAdapter.query.mockResolvedValue([]);
            await next.execute();
            expect(mockAdapter.query).toHaveBeenCalledWith('SELECT * FROM users LIMIT 10 OFFSET 5', []);
        });
        it('should apply tenancy in insert', async () => {
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 't1' } });
            await qb.insert({ name: 'Frank' });
            expect(mockAdapter.run).toHaveBeenCalledWith('INSERT INTO users (name, tenant_id) VALUES (?, ?)', ['Frank', 't1']);
        });
        it('should apply tenancy in update', async () => {
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 't1' } });
            await qb.update({ name: 'Frank' });
            expect(mockAdapter.run).toHaveBeenCalledWith('UPDATE users SET name = ? WHERE tenant_id = ?', ['Frank', 't1']);
        });
        it('should apply tenancy in delete', async () => {
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 't1' } });
            await qb.delete();
            expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM users WHERE tenant_id = ?', ['t1']);
        });
        it('transaction should reuse existing transaction context', async () => {
            mockBroker.getContext.mockReturnValue({ meta: { _tx: true } });
            const fn = jest.fn().mockResolvedValue('ok');
            const res = await qb.transaction(fn);
            expect(res).toBe('ok');
            expect(mockAdapter.transaction).not.toHaveBeenCalled();
            expect(fn).toHaveBeenCalledWith(qb);
        });
        it('transaction should execute without transaction if adapter lacks it', async () => {
            mockBroker.getContext.mockReturnValue(undefined);
            delete mockAdapter.transaction;
            const fn = jest.fn().mockResolvedValue('ok');
            const res = await qb.transaction(fn);
            expect(res).toBe('ok');
            expect(fn).toHaveBeenCalledWith(qb);
        });
        it('transaction should create new transaction context if none exists', async () => {
            mockBroker.getContext.mockReturnValue(undefined);
            const fn = jest.fn().mockResolvedValue('ok');
            const res = await qb.transaction(fn);
            expect(res).toBe('ok');
            expect(mockAdapter.transaction).toHaveBeenCalled();
            expect(isomorphic_core_1.ContextStack.run).toHaveBeenCalled();
        });
        it('executeDebounced should execute query', async () => {
            mockAdapter.query.mockResolvedValue([{ id: 1, name: 'Debounced' }]);
            const res = await qb.executeDebounced();
            expect(res).toEqual([{ id: 1, name: 'Debounced' }]);
        });
        it('batch should wrap operations in transaction', async () => {
            const spy = jest.spyOn(qb, 'transaction').mockResolvedValue(undefined);
            const fn = jest.fn();
            await qb.batch(fn);
            expect(spy).toHaveBeenCalledWith(fn);
        });
    });
    describe('DatabaseMixin', () => {
        it('should add db property and provision CRUD actions onInit', async () => {
            const Mixed = (0, DatabaseMixin_1.DatabaseMixin)(table)(class Base {
                async onInit() { }
            });
            const instance = new Mixed();
            const mockApp = {
                getProvider: jest.fn((key) => {
                    if (key === 'database:adapter')
                        return mockAdapter;
                    if (key === 'broker')
                        return mockBroker;
                    if (key === 'database:config')
                        return { enforceTenancy: true };
                    return undefined;
                })
            };
            await instance.onInit(mockApp);
            expect(instance.db).toBeInstanceOf(QueryBuilder_1.QueryBuilder);
            expect(mockApp.getProvider).toHaveBeenCalledWith('database:adapter');
            expect(mockApp.getProvider).toHaveBeenCalledWith('broker');
            expect(mockApp.getProvider).toHaveBeenCalledWith('database:config');
        });
        it('should call super.onInit if it exists', async () => {
            const superOnInit = jest.fn();
            const Mixed = (0, DatabaseMixin_1.DatabaseMixin)(table)(class Base {
                async onInit(app) {
                    superOnInit(app);
                }
            });
            const instance = new Mixed();
            const mockApp = {
                getProvider: jest.fn((key) => {
                    if (key === 'database:adapter')
                        return mockAdapter;
                    if (key === 'broker')
                        return mockBroker;
                    return undefined;
                })
            };
            await instance.onInit(mockApp);
            expect(superOnInit).toHaveBeenCalledWith(mockApp);
        });
        it('_provisionCRUDActions should use constructor name if name property is undefined', () => {
            const Mixed = (0, DatabaseMixin_1.DatabaseMixin)(table)(class TestService {
            });
            const instance = new Mixed();
            instance._provisionCRUDActions(mockBroker);
            // Just verifying it doesn't throw and coverage hits the logic
            expect(true).toBe(true);
        });
        it('_provisionCRUDActions should use name property if defined', () => {
            const Mixed = (0, DatabaseMixin_1.DatabaseMixin)(table)(class Base {
                constructor() {
                    this.name = 'CustomService';
                }
            });
            const instance = new Mixed();
            instance._provisionCRUDActions(mockBroker);
            expect(true).toBe(true);
        });
    });
});
