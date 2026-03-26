import { IFileSystemProvider } from '../types/fs.interfaces';
import { VirtualNode } from '../fs.schema';
import { IMeshStream } from '@flybyme/isomorphic-core';

/**
 * MeshFileSystem — The Virtual File System (VFS) controller.
 * Orchestrates calls across different storage providers based on path mounts.
 */
export class MeshFileSystem {
    private mounts: Map<string, IFileSystemProvider> = new Map();
    private defaultProvider: IFileSystemProvider | null = null;

    public mount(path: string, provider: IFileSystemProvider): void {
        this.mounts.set(path, provider);
    }

    public setDefaultProvider(provider: IFileSystemProvider): void {
        this.defaultProvider = provider;
    }

    private resolveProvider(path: string): { provider: IFileSystemProvider, relativePath: string } {
        // Sort mounts by length descending to match most specific path
        const sortedMounts = Array.from(this.mounts.keys()).sort((a, b) => b.length - a.length);
        
        for (const mountPath of sortedMounts) {
            if (path.startsWith(mountPath)) {
                let relativePath = path.substring(mountPath.length);
                if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;
                return { provider: this.mounts.get(mountPath)!, relativePath };
            }
        }

        if (this.defaultProvider) {
            return { provider: this.defaultProvider, relativePath: path };
        }

        throw new Error(`No provider found for path: ${path}`);
    }

    async readFile(path: string): Promise<Uint8Array> {
        const { provider, relativePath } = this.resolveProvider(path);
        return provider.readFile(relativePath);
    }

    readStream(path: string): IMeshStream<Uint8Array> {
        const { provider, relativePath } = this.resolveProvider(path);
        return provider.readStream(relativePath);
    }

    async writeFile(path: string, data: Uint8Array): Promise<void> {
        const { provider, relativePath } = this.resolveProvider(path);
        return provider.writeFile(relativePath, data);
    }

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        const { provider, relativePath } = this.resolveProvider(path);
        return provider.mkdir(relativePath, options);
    }

    async readdir(path: string): Promise<VirtualNode[]> {
        const { provider, relativePath } = this.resolveProvider(path);
        const entries = await provider.readdir(relativePath);
        // Ensure path in entries is the full VFS path
        return entries.map(e => ({
            ...e,
            path: path.endsWith('/') ? path + e.name : path + '/' + e.name
        }));
    }

    async stat(path: string): Promise<VirtualNode> {
        const { provider, relativePath } = this.resolveProvider(path);
        const node = await provider.stat(relativePath);
        return { ...node, path };
    }

    async unlink(path: string): Promise<void> {
        const { provider, relativePath } = this.resolveProvider(path);
        return provider.unlink(relativePath);
    }

    async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        const { provider, relativePath } = this.resolveProvider(path);
        return provider.rmdir(relativePath, options);
    }

    async exists(path: string): Promise<boolean> {
        try {
            const { provider, relativePath } = this.resolveProvider(path);
            return await provider.exists(relativePath);
        } catch {
            return false;
        }
    }
}
