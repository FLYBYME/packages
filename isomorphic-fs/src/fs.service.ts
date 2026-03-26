import { z } from 'zod';
import { IContext, MeshError, IServiceBroker } from '@flybyme/isomorphic-core';
import { DatabaseMixin, defineTable, QueryBuilder } from '@flybyme/isomorphic-database';
import { StreamPlugin } from '@flybyme/isomorphic-streams';
import { MeshFileSystem } from './core/MeshFileSystem';
import { ReadFileParams, WriteFileParams, ReadDirParams, StatParams, VirtualNode } from './fs.schema';

interface IFSService {
    db: QueryBuilder<typeof MetadataSchema>;
    broker: IServiceBroker;
}

interface IDbService {
    dbs: Record<string, QueryBuilder<z.ZodObject<z.ZodRawShape>>>;
}

const LockSchema = z.object({
    id: z.string().optional(),
    path: z.string(),
    nodeID: z.string(),
    expiresAt: z.number()
});

const LockTable = defineTable('fs_locks', LockSchema);

const MetadataSchema = z.object({
    id: z.string(),
    path: z.string(),
    type: z.enum(['file', 'directory', 'symlink']),
    name: z.string(),
    size: z.number(),
    ownerID: z.string(),
    createdAt: z.number(),
    updatedAt: z.number()
});

const MetadataTable = defineTable('fs_nodes', MetadataSchema);

/**
 * FSService — Virtual File System with integrated multi-tenancy and distributed locking.
 */
export class FSService extends DatabaseMixin(MetadataTable, LockTable)(class {}) {
    public readonly name = 'fs';

    public actions = {
        readFile: { handler: this.readFile.bind(this), rest: 'GET /readFile' },
        writeFile: { handler: this.writeFile.bind(this), rest: 'POST /writeFile', mutates: true },
        readDir: { handler: this.readdir.bind(this), rest: 'GET /readdir' },
        stat: { handler: this.stat.bind(this), rest: 'GET /stat' },
        mkdir: { handler: this.mkdir.bind(this), rest: 'POST /mkdir', mutates: true },
        unlink: { handler: this.unlink.bind(this), rest: 'DELETE /unlink', mutates: true },
        rmdir: { handler: this.rmdir.bind(this), rest: 'DELETE /rmdir', mutates: true },
        openStream: { handler: this.openStream.bind(this), rest: 'POST /openStream' },
        lock: { handler: this.lock.bind(this), rest: 'POST /lock', mutates: true },
        unlock: { handler: this.unlock.bind(this), rest: 'POST /unlock', mutates: true }
    };

    private get locks(): QueryBuilder<typeof LockSchema> {
        return (this as unknown as IDbService).dbs['fs_locks'] as QueryBuilder<typeof LockSchema>;
    }

    constructor(private vfs: MeshFileSystem, private streams?: StreamPlugin) {
        super();
    }

    async readFile(ctx: IContext<z.infer<typeof ReadFileParams>>): Promise<{ data: Uint8Array | string }> {
        const data = await this.vfs.readFile(ctx.params.path);
        
        if (ctx.params.encoding === 'utf8') {
            return { data: Buffer.from(data).toString('utf8') };
        } else if (ctx.params.encoding === 'base64') {
            return { data: Buffer.from(data).toString('base64') };
        }
        
        return { data };
    }

    async writeFile(ctx: IContext<z.infer<typeof WriteFileParams>>): Promise<{ success: boolean }> {
        await this.checkLock(ctx.params.path, ctx.nodeID);

        let buffer: Uint8Array;
        if (typeof ctx.params.data === 'string') {
            buffer = new Uint8Array(Buffer.from(ctx.params.data, 'base64'));
        } else {
            buffer = ctx.params.data;
        }

        await this.vfs.writeFile(ctx.params.path, buffer);

        try {
            const stats = await this.vfs.stat(ctx.params.path);
            await (this as unknown as IFSService).db.insert({
                id: stats.id,
                path: ctx.params.path,
                name: stats.name,
                type: stats.type as 'file' | 'directory' | 'symlink',
                size: stats.size,
                ownerID: (ctx.meta as Record<string, { id?: string }>).user?.id || 'root',
                createdAt: stats.metadata.createdAt,
                updatedAt: stats.metadata.updatedAt
            });
        } catch (err) {
            await this.vfs.unlink(ctx.params.path).catch(() => {});
            throw err;
        }

        return { success: true };
    }

    async readdir(ctx: IContext<z.infer<typeof ReadDirParams>>): Promise<VirtualNode[]> {
        return this.vfs.readdir(ctx.params.path);
    }

    async stat(ctx: IContext<z.infer<typeof StatParams>>): Promise<VirtualNode> {
        return this.vfs.stat(ctx.params.path);
    }

    async mkdir(ctx: IContext<{ path: string, recursive?: boolean }>): Promise<{ success: boolean }> {
        await this.checkLock(ctx.params.path, ctx.nodeID);
        
        await this.vfs.mkdir(ctx.params.path, { recursive: ctx.params.recursive });
        
        const stats = await this.vfs.stat(ctx.params.path);
        await (this as unknown as IFSService).db.insert({
            id: stats.id,
            path: ctx.params.path,
            name: stats.name,
            type: 'directory',
            size: 0,
            ownerID: (ctx.meta as Record<string, { id?: string }>).user?.id || 'root',
            createdAt: stats.metadata.createdAt,
            updatedAt: stats.metadata.updatedAt
        });

        return { success: true };
    }

    async rmdir(ctx: IContext<{ path: string, recursive?: boolean }>): Promise<{ success: boolean }> {
        await this.checkLock(ctx.params.path, ctx.nodeID);
        await this.vfs.rmdir(ctx.params.path, { recursive: ctx.params.recursive });
        await (this as unknown as IFSService).db.where('path', '=', ctx.params.path).delete();
        return { success: true };
    }

    async unlink(ctx: IContext<z.infer<typeof StatParams>>): Promise<{ success: boolean }> {
        await this.checkLock(ctx.params.path, ctx.nodeID);
        
        await this.vfs.unlink(ctx.params.path);

        try {
            await (this as unknown as IFSService).db.where('path', '=', ctx.params.path).delete();
        } catch (err) {
            (this as unknown as IFSService).broker.app.logger.error(`Critical Desync: Physical unlink succeeded but metadata delete failed for ${ctx.params.path}`);
            throw err;
        }

        return { success: true };
    }

    async openStream(ctx: IContext<{ path: string }>): Promise<{ streamID: string }> {
        if (!this.streams) throw new MeshError({ message: 'StreamPlugin not available', code: 'INTERNAL_ERROR', status: 500 });

        const stream = this.streams.createStream({ targetNodeID: ctx.callerID || ctx.nodeID });
        
        const nodeStream = this.vfs.readStream(ctx.params.path);
        nodeStream.on('data', (chunk: Uint8Array) => {
            stream.write(chunk).catch((err: Error) => {
                stream.error(new MeshError({ message: err.message, code: 'STREAM_WRITE_ERROR', status: 500 }));
            });
        });
        nodeStream.on('end', () => stream.end());
        nodeStream.on('error', (err: Error) => stream.error(new MeshError({ message: err.message, code: 'FS_ERROR', status: 500 })));

        return { streamID: stream.id };
    }

    async lock(ctx: IContext<{ path: string, ttl?: number }>): Promise<{ success: boolean }> {
        const ttl = ctx.params.ttl || 30000;
        const expiresAt = Date.now() + ttl;

        const locks = this.locks;
        const existing = await locks.where('path', '=', ctx.params.path).execute();
        
        if (existing.length > 0) {
            if (existing[0].nodeID !== ctx.nodeID && existing[0].expiresAt > Date.now()) {
                throw new MeshError({ code: 'LOCKED', message: `Path ${ctx.params.path} is already locked by ${existing[0].nodeID}`, status: 423 });
            }
            await locks.where('path', '=', ctx.params.path).update({
                nodeID: ctx.nodeID,
                expiresAt
            });
        } else {
            await locks.insert({
                path: ctx.params.path,
                nodeID: ctx.nodeID,
                expiresAt
            });
        }

        return { success: true };
    }

    async unlock(ctx: IContext<{ path: string }>): Promise<{ success: boolean }> {
        await this.locks.where('path', '=', ctx.params.path)
            .where('nodeID', '=', ctx.nodeID)
            .delete();
        return { success: true };
    }

    private async checkLock(path: string, nodeID: string): Promise<void> {
        const locks = await this.locks.where('path', '=', path).execute();
        if (locks.length > 0 && locks[0].nodeID !== nodeID && locks[0].expiresAt > Date.now()) {
            throw new MeshError({ code: 'LOCKED', message: `Path ${path} is locked by ${locks[0].nodeID}`, status: 423 });
        }
    }
}
