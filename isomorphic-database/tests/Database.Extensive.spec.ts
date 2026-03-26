import { QueryBuilder } from '../src/core/QueryBuilder';
import { DatabaseMixin } from '../src/core/DatabaseMixin';
import { defineTable } from '../src/core/Table';
import { z } from 'zod';
import { ContextStack, IMeshApp, MeshError } from '@flybyme/isomorphic-core';

describe('@flybyme/isomorphic-database Extensive', () => {
    describe('QueryBuilder Safety Guards', () => {
        let mockAdapter: any;
        let table: any;

        beforeEach(() => {
            mockAdapter = {
                find: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                insert: jest.fn().mockResolvedValue({ lastInsertId: 1, changes: 1 }),
                update: jest.fn().mockResolvedValue({ changes: 0 }),
                delete: jest.fn().mockResolvedValue({ changes: 0 })
            };
            table = defineTable('users', z.object({ id: z.number(), name: z.string(), email: z.string() }));
        });

        it('should prevent destructive update without filters or tenant context', async () => {
            const qb = new QueryBuilder(table, mockAdapter);
            await expect(qb.update({ name: 'Bob' })).rejects.toThrow(MeshError);
            await expect(qb.update({ name: 'Bob' })).rejects.toThrow(/Destructive update prevented/);
        });

        it('should allow update with filters', async () => {
            const qb = new QueryBuilder(table, mockAdapter);
            await qb.where('id', '=', 1).update({ name: 'Bob' });
            expect(mockAdapter.update).toHaveBeenCalled();
        });

        it('should allow update with tenant context', async () => {
            const qb = new QueryBuilder(table, mockAdapter);
            await qb.forTenant('t1').update({ name: 'Bob' });
            expect(mockAdapter.update).toHaveBeenCalled();
        });

        it('should prevent destructive delete without filters or tenant context', async () => {
            const qb = new QueryBuilder(table, mockAdapter);
            await expect(qb.delete()).rejects.toThrow(MeshError);
            await expect(qb.delete()).rejects.toThrow(/Destructive delete prevented/);
        });

        it('should allow delete with filters', async () => {
            const qb = new QueryBuilder(table, mockAdapter);
            await qb.where('id', '=', 1).delete();
            expect(mockAdapter.delete).toHaveBeenCalled();
        });

        it('should validate limit and offset are non-negative integers', async () => {
            const qb = new QueryBuilder(table, mockAdapter);
            expect(() => qb.limit(-1)).toThrow(/Limit must be a non-negative integer/);
            expect(() => qb.offset(-1)).toThrow(/Offset must be a non-negative integer/);
            expect(() => qb.limit(1.5)).toThrow(/Limit must be a non-negative integer/);
        });

        it('should throw error if enforceTenancy is active but no tenantId resolved', async () => {
            const qb = new QueryBuilder(table, mockAdapter, true);
            await expect(qb.execute()).rejects.toThrow(/Tenant ID resolution failed/);
        });
    });


    describe('DatabaseMixin Multi-Table', () => {
        it('should provision multiple tables and access via dbs', async () => {
            const T1 = defineTable('t1', z.object({ a: z.number() }));
            const T2 = defineTable('t2', z.object({ b: z.string() }));

            class TestService extends DatabaseMixin(T1, T2)(class {}) {}
            const service = new TestService();

            const mockLogger = { child: jest.fn().mockReturnThis() };
            const mockApp: Partial<IMeshApp> = {
                logger: mockLogger as any,
                getProvider: jest.fn().mockImplementation((p) => {
                    if (p === 'database:adapter') return { find: jest.fn().mockResolvedValue([]) };
                    if (p === 'broker') return { on: jest.fn(), emit: jest.fn() };
                    if (p === 'logger') return mockLogger;
                    return {};
                }) as any
            };

            await (service as any).onInit(mockApp as IMeshApp);

            expect(service.db).toBeDefined(); // First table
            expect((service as any).dbs['t1']).toBeDefined();
            expect((service as any).dbs['t2']).toBeDefined();
            expect((service as any).dbs['t1']).not.toBe((service as any).dbs['t2']);
        });
    });

    describe('Transactions', () => {
        it('should propagate transaction state in ContextStack', async () => {
            const T1 = defineTable('t1', z.object({ a: z.number() }));
            const mockAdapter = {
                transaction: jest.fn(async (fn: any) => await fn())
            };
            const qb = new QueryBuilder(T1, mockAdapter as any);

            await qb.transaction(async (txQb) => {
                const ctx = ContextStack.getContext();
                expect(ctx?.meta._tx).toBe(true);
            });

            expect(mockAdapter.transaction).toHaveBeenCalled();
        });
    });
});
