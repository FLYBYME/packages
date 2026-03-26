import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NodeFSProvider } from '../src/providers/NodeFSProvider';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('NodeFSProvider', () => {
    let provider: NodeFSProvider;
    const testRoot = path.join(__dirname, 'test-root');

    beforeAll(async () => {
        await fs.mkdir(testRoot, { recursive: true });
    });

    afterAll(async () => {
        await fs.rm(testRoot, { recursive: true, force: true });
    });

    beforeEach(() => {
        provider = new NodeFSProvider(testRoot);
    });

    it('should prevent directory traversal in getFullPath', async () => {
        await expect(provider.writeFile('../../etc/passwd', new Uint8Array([1, 2, 3])))
            .rejects.toThrow(/outside root directory/i);
    });

    it('should write and read files', async () => {
        const data = new TextEncoder().encode('hello world');
        await provider.writeFile('hello.txt', data);
        const read = await provider.readFile('hello.txt');
        expect(new TextDecoder().decode(read)).toBe('hello world');
    });

    it('should list directory contents', async () => {
        await fs.writeFile(path.join(testRoot, 'list.txt'), 'data');
        const list = await provider.readdir('.');
        expect(list.some(f => f.name === 'list.txt')).toBe(true);
    });

    it('should return node stats', async () => {
        await fs.writeFile(path.join(testRoot, 'stat-me.txt'), 'content');
        const stats = await provider.stat('stat-me.txt');
        expect(stats.name).toBe('stat-me.txt');
        expect(stats.type).toBe('file');
        expect(stats.size).toBeGreaterThan(0);
    });

    it('should throw MeshError for non-existent files', async () => {
        await expect(provider.stat('missing.txt')).rejects.toThrow();
    });
});
