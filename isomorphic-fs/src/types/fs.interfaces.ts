import { IMeshStream } from '@flybyme/isomorphic-core';
import { VirtualNode } from '../fs.schema';

/**
 * IFileSystemProvider — The adapter interface required for any storage backend.
 */
export interface IFileSystemProvider {
    readonly name: string;
    
    readFile(path: string): Promise<Uint8Array>;
    readStream(path: string): IMeshStream<Uint8Array>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    readdir(path: string): Promise<VirtualNode[]>;
    stat(path: string): Promise<VirtualNode>;
    unlink(path: string): Promise<void>;
    rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    
    exists(path: string): Promise<boolean>;
}

/**
 * IMeshFileMeta — Strictly typed metadata (permissions, timestamps, owner ID).
 * Included in VirtualNode.
 */
// (Meta is already defined in fs.schema.ts)
