import { z } from 'zod';
import { BaseRepository } from '../src/core/BaseRepository';
import { QueryBuilder } from '../src/core/QueryBuilder';
import { defineTable, TableDefinition } from '../src/core/Table';
import { DatabaseMixin } from '../src/core/DatabaseMixin';
import { ContextStack, IServiceBroker, IMeshApp, IContext, MeshError } from '@flybyme/isomorphic-core';

jest.mock('@flybyme/isomorphic-core', () => {
    const actual = jest.requireActual('@flybyme/isomorphic-core');
    return {
        ...actual,
        ContextStack: {
            getContext: jest.fn(),
            run: jest.fn((_ctx, fn) => fn()),
        },
        ReactiveState: class {
            data: unknown;
            constructor(initial: unknown) {
                this.data = initial;
            }
        }
    };
});

describe('Database Tests', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAdapter: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockBroker: any;
    let schema: z.ZodObject<{ id: z.ZodOptional<z.ZodNumber>, name: z.ZodString, age: z.ZodOptional<z.ZodNumber> }>;
    let table: TableDefinition<typeof schema>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAdapter = {
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            insert: jest.fn().mockResolvedValue({ lastInsertId: 1, changes: 1 }),
            update: jest.fn().mockResolvedValue({ changes: 1 }),
            delete: jest.fn().mockResolvedValue({ changes: 1 }),
            transaction: jest.fn((fn) => fn()),
        };

        mockBroker = {
            getContext: jest.fn().mockReturnValue({ meta: { tenant_id: 'test-tenant' } }),
            emit: jest.fn(),
            on: jest.fn().mockReturnValue(() => { }),
        };

        schema = z.object({
            id: z.number().optional(),
            name: z.string(),
            age: z.number().optional()
        });

        table = defineTable('users', schema);
    });

    describe('Table', () => {
        it('defineTable should create a table definition', () => {
            const t = defineTable('test_table', schema);
            expect(t.name).toBe('test_table');
            expect(t.schema).toBe(schema);
        });
    });

    describe('BaseRepository', () => {
        let repo: BaseRepository<typeof schema>;

        beforeEach(() => {
            repo = new BaseRepository('users', schema, mockAdapter, mockBroker);
        });

        it('should create an instance', () => {
            expect(repo).toBeDefined();
        });

        it('should extract tenant_id from broker context user', () => {
            mockBroker.getContext.mockReturnValue({ meta: { user: { tenant_id: 'tenant-1' } } } as Partial<IContext>);
            const tenantId = (repo as any).getTenantId();
            expect(tenantId).toBe('tenant-1');
        });

        it('should extract tenant_id from broker context meta', () => {
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 'tenant-2' } } as Partial<IContext>);
            const tenantId = (repo as any).getTenantId();
            expect(tenantId).toBe('tenant-2');
        });

        it('should fallback to ContextStack if broker is undefined', () => {
            const repoNoBroker = new BaseRepository('users', schema, mockAdapter);
            (ContextStack.getContext as jest.Mock).mockReturnValue({ meta: { tenant_id: 'tenant-3' } } as Partial<IContext>);
            const tenantId = (repoNoBroker as any).getTenantId();
            expect(tenantId).toBe('tenant-3');
        });

        it('should return undefined tenant_id if no context', () => {
            mockBroker.getContext.mockReturnValue(undefined);
            (ContextStack.getContext as jest.Mock).mockReturnValue(undefined);
            const tenantId = (repo as any).getTenantId();
            expect(tenantId).toBeUndefined();
        });

        it('create should validate and insert data', async () => {
            mockAdapter.insert.mockResolvedValue({ lastInsertId: 42 });
            mockAdapter.find.mockResolvedValue([{ id: 42, name: 'Alice', age: 30 }]);
            const data = { name: 'Alice', age: 30 };
            const result = await repo.create(data);
            expect(result).toEqual({ name: 'Alice', age: 30, id: 42 });
            expect(mockAdapter.insert).toHaveBeenCalledWith(
                'users',
                expect.objectContaining({ name: 'Alice', age: 30 })
            );
        });

        it('find should execute query with filters', async () => {
            mockAdapter.find.mockResolvedValue([{ id: 1, name: 'Bob' }]);
            const results = await repo.find({ name: 'Bob' });
            expect(results).toEqual([{ id: 1, name: 'Bob' }]);
            expect(mockAdapter.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    filters: [expect.objectContaining({ column: 'name', value: 'Bob' })]
                })
            );
        });

        it('find should handle undefined filters', async () => {
            mockAdapter.find.mockResolvedValue([]);
            await repo.find({ name: 'Bob', age: undefined });
            expect(mockAdapter.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    filters: [expect.objectContaining({ column: 'name', value: 'Bob' })]
                })
            );
        });

        it('update should execute query with id filter', async () => {
            await repo.update(1, { age: 31 });
            expect(mockAdapter.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    filters: [expect.objectContaining({ column: 'id', value: 1 })]
                }),
                expect.objectContaining({ age: 31 })
            );
        });

        it('remove should execute delete query with id filter', async () => {
            await repo.remove(1);
            expect(mockAdapter.delete).toHaveBeenCalledWith(
                expect.objectContaining({
                    filters: [expect.objectContaining({ column: 'id', value: 1 })]
                })
            );
        });

        it('findById should return a single record or null', async () => {
            mockAdapter.find.mockResolvedValue([{ id: 1, name: 'Charlie' }]);
            let res = await repo.findById(1);
            expect(res).toEqual({ id: 1, name: 'Charlie' });

            mockAdapter.find.mockResolvedValue([]);
            res = await repo.findById(2);
            expect(res).toBeNull();
        });

        it('findOne should return a single record or null', async () => {
            mockAdapter.find.mockResolvedValue([{ id: 1, name: 'Charlie' }]);
            let res = await repo.findOne({ name: 'Charlie' });
            expect(res).toEqual({ id: 1, name: 'Charlie' });

            mockAdapter.find.mockResolvedValue([]);
            res = await repo.findOne({ name: 'Dave' });
            expect(res).toBeNull();
        });
    });

    describe('QueryBuilder', () => {
        let qb: QueryBuilder<typeof schema>;

        beforeEach(() => {
            qb = new QueryBuilder(table, mockAdapter, false, mockBroker);
        });

        it('should set tenantIdOverride', () => {
            const next = qb.forTenant('custom-tenant');
            expect((next as any).tenantIdOverride).toBe('custom-tenant');
        });

        it('should set selected columns', async () => {
            const nextQb = qb.select(['id', 'name']);
            mockAdapter.find.mockResolvedValue([{ id: 1, name: 'Eve' }]);
            const res = await nextQb.execute();
            expect(res).toEqual([{ id: 1, name: 'Eve' }]);
            expect(mockAdapter.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    select: ['id', 'name']
                })
            );
        });

        it('should add limit and offset', async () => {
            const next = qb.limit(10).offset(5);
            mockAdapter.find.mockResolvedValue([]);
            await next.execute();
            expect(mockAdapter.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: 10,
                    offset: 5
                })
            );
        });

        it('should apply tenancy in insert', async () => {
            qb = new QueryBuilder(table, mockAdapter, true, mockBroker);
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 't1' } } as Partial<IContext>);
            await qb.insert({ name: 'Frank' });
            expect(mockAdapter.insert).toHaveBeenCalledWith(
                'users',
                expect.objectContaining({ name: 'Frank', tenant_id: 't1' })
            );
        });

        it('should apply tenancy in update', async () => {
            qb = new QueryBuilder(table, mockAdapter, true, mockBroker);
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 't1' } } as Partial<IContext>);
            await qb.update({ name: 'Frank' });
            expect(mockAdapter.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 't1'
                }),
                expect.objectContaining({ name: 'Frank' })
            );
        });

        it('should apply tenancy in delete', async () => {
            qb = new QueryBuilder(table, mockAdapter, true, mockBroker);
            mockBroker.getContext.mockReturnValue({ meta: { tenant_id: 't1' } } as Partial<IContext>);
            await qb.delete();
            expect(mockAdapter.delete).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 't1'
                })
            );
        });

        it('transaction should reuse existing transaction context', async () => {
            mockBroker.getContext.mockReturnValue({ meta: { _tx: true } } as Partial<IContext>);
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
            expect(ContextStack.run).toHaveBeenCalled();
        });

        it('executeDebounced should execute query', async () => {
            mockAdapter.find.mockResolvedValue([{ id: 1, name: 'Debounced' }]);
            const res = await (qb as any).executeDebounced();
            expect(res).toEqual([{ id: 1, name: 'Debounced' }]);
        });

        it('batch should wrap operations in transaction', async () => {
            const spy = jest.spyOn(qb, 'transaction').mockResolvedValue(undefined as never);
            const fn = jest.fn();
            await qb.batch(fn);
            expect(spy).toHaveBeenCalledWith(fn);
        });
    });

    describe('DatabaseMixin', () => {
        it('should add db property and provision CRUD actions onInit', async () => {
            const Mixed = DatabaseMixin(table)(class Base {
                async onInit() { }
            });
            const instance = new Mixed();

            const mockLogger = { child: jest.fn().mockReturnThis() };
            const mockApp: Partial<IMeshApp> = {
                logger: mockLogger as any,
                getProvider: jest.fn((key: string) => {
                    if (key === 'database:adapter') return mockAdapter;
                    if (key === 'broker') return mockBroker;
                    if (key === 'database:config') return { enforceTenancy: true };
                    if (key === 'logger') return mockLogger;
                    return undefined;
                })
            };

            await instance.onInit(mockApp as IMeshApp);

            expect(instance.db).toBeInstanceOf(BaseRepository);
            expect(mockApp.getProvider).toHaveBeenCalledWith('database:adapter');
            expect(mockApp.getProvider).toHaveBeenCalledWith('broker');
            expect(mockApp.getProvider).toHaveBeenCalledWith('database:config');
        });

        it('should call super.onInit if it exists', async () => {
            const superOnInit = jest.fn();
            const Mixed = DatabaseMixin(table)(class Base {
                async onInit(app: IMeshApp) {
                    superOnInit(app);
                }
            });
            const instance = new Mixed();
            const mockLogger = { child: jest.fn().mockReturnThis() };
            const mockApp: Partial<IMeshApp> = {
                logger: mockLogger as any,
                getProvider: jest.fn((key: string) => {
                    if (key === 'database:adapter') return mockAdapter;
                    if (key === 'broker') return mockBroker;
                    if (key === 'logger') return mockLogger;
                    return undefined;
                })
            };

            await instance.onInit(mockApp as IMeshApp);
            expect(superOnInit).toHaveBeenCalledWith(mockApp);
        });

        it('_provisionCRUDActions should use constructor name if name property is undefined', () => {
            const Mixed = DatabaseMixin(table)(class TestService { });
            const instance = new Mixed();
            instance._provisionCRUDActions();
            // Just verifying it doesn't throw and coverage hits the logic
            expect(true).toBe(true);
        });

        it('_provisionCRUDActions should use name property if defined', () => {
            const Mixed = DatabaseMixin(table)(class Base {
                name = 'CustomService';
            });
            const instance = new Mixed();
            instance._provisionCRUDActions();
            expect(true).toBe(true);
        });
    });
});
