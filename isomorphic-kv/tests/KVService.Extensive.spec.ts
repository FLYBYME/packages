import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { KVService } from '../src/kv.service';
import { LRUStorageAdapter } from '../src/adapters/LRUStorageAdapter';

describe('KVService Extensive', () => {
    let service: KVService;
    let adapter: LRUStorageAdapter;
    let mockBroker: any;
    let mockApp: any;

    beforeEach(async () => {
        adapter = new LRUStorageAdapter();
        service = new KVService(adapter);
        
        mockBroker = {
            app: { nodeID: 'node1' } as any,
            on: jest.fn(),
            emit: jest.fn(),
            call: jest.fn<() => Promise<any>>().mockResolvedValue({ success: true }),
            registry: {
                getNodes: jest.fn().mockReturnValue([{ nodeID: 'node1' }, { nodeID: 'node2' }, { nodeID: 'node3' }, { nodeID: 'node4' }])
            },
            logger: { error: jest.fn() },
            getSetting: jest.fn().mockReturnValue({ replicationFactor: 3 })
        };

        const mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1),
            child: jest.fn().mockReturnThis()
        };

        mockApp = {
            nodeID: 'node1',
            logger: mockLogger,
            getProvider: jest.fn().mockImplementation((p) => {
                if (p === 'database:adapter') return { run: jest.fn(), query: jest.fn() };
                if (p === 'broker') return mockBroker;
                if (p === 'logger') return mockLogger;
                return {};
            })
        };

        await service.onInit(mockApp);
    });

    afterEach(async () => {
        await service.stop();
    });

    it('should partition keys by tenant_id', async () => {
        const ctxA = { params: { key: 'foo', value: 'bar' }, meta: { user: { tenant_id: 'tenant-a' } } };
        const ctxB = { params: { key: 'foo', value: 'baz' }, meta: { user: { tenant_id: 'tenant-b' } } };
        
        await service.set(ctxA as any);
        await service.set(ctxB as any);
        
        const resA = await service.get({ params: { key: 'foo' }, meta: { user: { tenant_id: 'tenant-a' } } } as any);
        const resB = await service.get({ params: { key: 'foo' }, meta: { user: { tenant_id: 'tenant-b' } } } as any);
        
        expect(resA?.value).toBe('bar');
        expect(resB?.value).toBe('baz');
    });

    it('should replicate to neighbors on hash ring', async () => {
        const ctx = { 
            params: { key: 'replicate-me', value: 'data' }, 
            meta: { user: { tenant_id: 't1' } } 
        };
        
        await service.set(ctx as any);
        
        expect(mockBroker.call).toHaveBeenCalledWith(
            'kv.replicate', 
            expect.any(Object), 
            expect.objectContaining({ nodeID: expect.any(String) })
        );
    });

    it('should handle versioning in replication', async () => {
        const key = 't1:vers';
        await adapter.set({ key, value: 'old', version: 10, ttl: Date.now() + 1000, ownerID: 'node2' });
        
        const replicateCtx = {
            params: { key, value: 'new', version: 5, ttl: Date.now() + 1000, ownerID: 'node3' }
        };
        
        await service.replicate(replicateCtx as any);
        const current = await adapter.get(key);
        expect(current?.value).toBe('old'); // Version 10 > 5
        
        const newerCtx = {
            params: { key, value: 'newest', version: 15, ttl: Date.now() + 1000, ownerID: 'node3' }
        };
        await service.replicate(newerCtx as any);
        const updated = await adapter.get(key);
        expect(updated?.value).toBe('newest'); // Version 15 > 10
    });

    it('should delete from local and replica nodes', async () => {
        const key = 'delete-me';
        const ctx = { params: { key }, meta: { user: { tenant_id: 't1' } } };
        
        await service.set(ctx as any);
        await service.delete(ctx as any);
        
        const scopedKey = 't1:delete-me';
        const res = await adapter.get(scopedKey);
        expect(res).toBeNull();
        
        expect(mockBroker.call).toHaveBeenCalledWith(
            'kv.delete', 
            expect.any(Object), 
            expect.objectContaining({ nodeID: expect.any(String) })
        );
    });

    it('should respect write TTL', async () => {
        const ctx = { 
            params: { key: 'short-lived', value: 'temp', ttlMs: 10 }, 
            meta: { user: { tenant_id: 't1' } } 
        };
        
        await service.set(ctx as any);
        const scopedKey = 't1:short-lived';
        
        await new Promise(resolve => setTimeout(resolve, 50));
        const res = await adapter.get(scopedKey);
        expect(res).toBeNull();
    });
});
