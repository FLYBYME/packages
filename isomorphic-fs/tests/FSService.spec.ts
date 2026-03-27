import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { FSService } from '../src/fs.service';
import { IContext, ILogger, IServiceBroker } from '@flybyme/isomorphic-core';
import { MeshFileSystem } from '../src/core/MeshFileSystem';
import { StreamPlugin } from '@flybyme/isomorphic-streams';

describe('FSService', () => {
    let service: FSService;
    let mockVfs: jest.Mocked<MeshFileSystem>;
    let mockDb: any;
    let mockLocks: any;
    let mockStreams: jest.Mocked<StreamPlugin>;
    let mockBroker: Partial<IServiceBroker>;

    beforeEach(() => {
        mockVfs = {
            writeFile: jest.fn<any>().mockResolvedValue(undefined),
            unlink: jest.fn<any>().mockResolvedValue(undefined),
            stat: jest.fn<any>().mockResolvedValue({
                id: 'node1',
                path: '/test.txt',
                name: 'test.txt',
                type: 'file',
                size: 100,
                ownerID: 'root',
                metadata: { createdAt: 1, updatedAt: 2 }
            }),
            mkdir: jest.fn<any>().mockResolvedValue(undefined),
            readStream: jest.fn<any>(),
            readdir: jest.fn<any>()
        } as unknown as jest.Mocked<MeshFileSystem>;

        mockDb = {
            insert: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
            execute: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([])
        };

        mockLocks = {
            where: jest.fn().mockReturnThis(),
            execute: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
            insert: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
            update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
            delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
        };

        mockStreams = {
            createStream: jest.fn().mockReturnValue({ id: 's1', write: jest.fn(), end: jest.fn(), error: jest.fn() })
        } as unknown as jest.Mocked<StreamPlugin>;

        service = new FSService(mockVfs, mockStreams);
        
        // Use property access for internal mocks if needed
        (service as any).db = mockDb;
        (service as any).dbs = { 'fs_nodes': mockDb, 'fs_locks': mockLocks };

        const mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1),
            child: jest.fn().mockReturnThis()
        } as unknown as ILogger;

        mockBroker = {
            app: { 
                nodeID: 'node1',
                logger: mockLogger,
                getProvider: jest.fn(),
                registerProvider: jest.fn()
            } as any
        };
        (service as any).broker = mockBroker;
    });

    it('should rollback physical write if metadata update fails', async () => {
        const ctx = {
            params: { path: '/test.txt', data: 'content' },
            nodeID: 'node1',
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;

        mockDb.insert.mockImplementation(() => { throw new Error('DB DOWN'); });

        await expect(service.writeFile(ctx)).rejects.toThrow('DB DOWN');

        expect(mockVfs.writeFile).toHaveBeenCalled();
        expect(mockVfs.unlink).toHaveBeenCalledWith('/test.txt');
    });

    it('should acquire lock before write and release it if not writing via service', async () => {
        const ctx = {
            params: { path: '/locked.txt', data: 'data' },
            nodeID: 'node1',
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;

        mockLocks.execute.mockResolvedValue([{ nodeID: 'node2', expiresAt: Date.now() + 10000 }]);

        await expect(service.writeFile(ctx)).rejects.toThrow(/Path \/locked.txt is locked by node2/);
    });

    it('should handle unlink with metadata failure desync log', async () => {
        const ctx = {
            params: { path: '/gone.txt' },
            nodeID: 'node1',
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;

        mockDb.delete.mockRejectedValue(new Error('DELETE FAILED'));

        await expect(service.unlink(ctx)).rejects.toThrow('DELETE FAILED');
        expect(mockBroker.app!.logger.error).toHaveBeenCalledWith(expect.stringContaining('Critical Desync'));
    });

    it('should open a stream and pipe data from VFS', async () => {
        const ctx = {
            params: { path: '/stream.txt' },
            callerID: 'node2',
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;
        const mockVfsStream = { on: jest.fn() };
        mockVfs.readStream.mockReturnValue(mockVfsStream as any);

        const result = await service.openStream(ctx);
        expect(result.streamID).toBe('s1');
        expect(mockVfs.readStream).toHaveBeenCalledWith('/stream.txt');
        expect(mockVfsStream.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should allow locking and unlocking', async () => {
        const ctx = {
            params: { path: '/file.txt' },
            nodeID: 'node1',
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;

        await service.lock(ctx);
        expect(mockLocks.insert).toHaveBeenCalled();

        await service.unlock(ctx);
        expect(mockLocks.delete).toHaveBeenCalled();
    });

    it('should update metadata during mkdir', async () => {
        const ctx = { 
            params: { path: '/new-dir', recursive: true }, 
            nodeID: 'node1', 
            meta: { user: { id: 'u1', tenant_id: 't1' } } 
        } as unknown as IContext<any>;

        await service.mkdir(ctx);
        expect(mockVfs.mkdir).toHaveBeenCalledWith('/new-dir', { recursive: true });
        expect(mockDb.insert).toHaveBeenCalledWith(expect.objectContaining({
            path: '/new-dir',
            type: 'directory'
        }));
    });

    it('should return stat from VFS', async () => {
        const ctx = {
            params: { path: '/file.txt' },
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;
        const result = await service.stat(ctx);
        expect(result.name).toBe('test.txt');
        expect(mockVfs.stat).toHaveBeenCalledWith('/file.txt');
    });

    it('should list directory contents from VFS', async () => {
        const ctx = {
            params: { path: '/' },
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;
        mockVfs.readdir.mockResolvedValue([{ name: 'a.txt' } as any]);

        const result = await service.readdir(ctx);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('a.txt');
    });

    it('should reject lock if already held by another node', async () => {
        const ctx = {
            params: { path: '/busy.txt' },
            nodeID: 'node-a',
            meta: { user: { id: 'u1', tenant_id: 't1' } }
        } as unknown as IContext<any>;
        mockLocks.execute.mockResolvedValue([{ nodeID: 'node-b', expiresAt: Date.now() + 5000 }]);

        await expect(service.lock(ctx)).rejects.toThrow(/already locked by node-b/);
    });
});
