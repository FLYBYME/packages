import * as fs from 'fs/promises';
import { createReadStream, watch } from 'fs';
import { IFileSystemProvider } from '../types/fs.interfaces';
import { VirtualNode } from '../fs.schema';
import { IMeshStream, MeshError, IServiceBroker } from '@flybyme/isomorphic-core';
import { MeshStream } from '@flybyme/isomorphic-streams';
import * as path from 'path';

/**
 * NodeFSProvider — Native filesystem provider for Node.js environments.
 */
export class NodeFSProvider implements IFileSystemProvider {
    public readonly name = 'local-fs';
    private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    constructor(private rootDir: string, private broker?: IServiceBroker) {
        this.rootDir = path.resolve(rootDir);
        this.setupWatcher();
    }

    private getAbsolutePath(p: string): string {
        const resolved = path.resolve(this.rootDir, p.startsWith('/') ? p.substring(1) : p);
        if (!resolved.startsWith(this.rootDir)) {
            throw new MeshError({ 
                message: `Directory Traversal Attempt: Path ${p} is outside root directory`, 
                code: 'PERMISSION_DENIED', 
                status: 403 
            });
        }
        return resolved;
    }

    async readFile(p: string): Promise<Uint8Array> {
        const absPath = this.getAbsolutePath(p);
        const stats = await fs.stat(absPath);
        
        if (stats.size > this.MAX_FILE_SIZE) {
            throw new MeshError({ 
                message: `File too large for atomic read (${stats.size} bytes). Use readStream instead.`, 
                code: 'FILE_TOO_LARGE', 
                status: 413 
            });
        }

        const buffer = await fs.readFile(absPath);
        return new Uint8Array(buffer);
    }

    readStream(p: string): IMeshStream<Uint8Array> {
        const absPath = this.getAbsolutePath(p);
        const meshStream = new MeshStream<Uint8Array>({});
        
        const nodeStream = createReadStream(absPath);
        
        nodeStream.on('data', (chunk) => {
            const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
            meshStream.write(new Uint8Array(data)).catch((err: unknown) => {
                nodeStream.destroy();
                const message = err instanceof Error ? err.message : String(err);
                meshStream.error(new MeshError({ message, code: 'STREAM_WRITE_ERROR', status: 500 }));
            });
        });

        nodeStream.on('end', () => {
            meshStream.end();
        });

        nodeStream.on('error', (err) => {
            meshStream.error(new MeshError({ message: err.message, code: 'FS_READ_ERROR', status: 500 }));
        });

        return meshStream;
    }

    async writeFile(p: string, data: Uint8Array): Promise<void> {
        const absPath = this.getAbsolutePath(p);
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, data);
    }

    async mkdir(p: string, options?: { recursive?: boolean }): Promise<void> {
        const absPath = this.getAbsolutePath(p);
        await fs.mkdir(absPath, options);
    }

    async readdir(p: string): Promise<VirtualNode[]> {
        const absPath = this.getAbsolutePath(p);
        const entries = await fs.readdir(absPath, { withFileTypes: true });
        
        return Promise.all(entries.map(async entry => {
            const entryPath = path.join(p, entry.name);
            return this.stat(entryPath);
        }));
    }

    async stat(p: string): Promise<VirtualNode> {
        const absPath = this.getAbsolutePath(p);
        const stats = await fs.stat(absPath);
        
        const type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'symlink';
        
        return {
            id: `fs_${Math.random().toString(36).substr(2, 9)}`, // In 
            name: path.basename(p),
            path: p,
            type,
            size: stats.size,
            metadata: {
                ownerID: 'root', // Mocked
                createdAt: stats.birthtimeMs,
                updatedAt: stats.mtimeMs,
                permissions: {
                    owner: 'root',
                    group: 'root',
                    mode: 644
                }
            }
        };
    }

    async unlink(p: string): Promise<void> {
        const absPath = this.getAbsolutePath(p);
        await fs.unlink(absPath);
    }

    async rmdir(p: string, options?: { recursive?: boolean }): Promise<void> {
        const absPath = this.getAbsolutePath(p);
        await fs.rmdir(absPath, options);
    }

    private setupWatcher(): void {
        try {
            watch(this.rootDir, { recursive: true }, (event, filename) => {
                if (this.broker && filename) {
                    this.broker.emit('$fs.changed', { 
                        path: '/' + filename.replace(/\\/g, '/'), 
                        nodeID: this.broker.app.nodeID,
                        type: event
                    });
                }
            });
        } catch {
            // Silently fail if watching isn't supported or fails (e.g. too many watchers)
        }
    }

    async exists(p: string): Promise<boolean> {
        try {
            await fs.access(this.getAbsolutePath(p));
            return true;
        } catch {
            return false;
        }
    }
}
