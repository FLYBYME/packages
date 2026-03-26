import { MemoryCache } from '../src/cache/MemoryCache';

describe('MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
        cache = new MemoryCache();
    });

    test('should set and get values', async () => {
        await cache.set('foo', 'bar');
        const value = await cache.get<string>('foo');
        expect(value).toBe('bar');
    });

    test('should return null for missing keys', async () => {
        const value = await cache.get<string>('missing');
        expect(value).toBeNull();
    });

    test('should evict values after TTL expires', async () => {
        await cache.set('ttl-key', 'expired', 10); // 10ms TTL
        
        // Wait 20ms
        await new Promise(resolve => setTimeout(resolve, 20));
        
        const value = await cache.get<string>('ttl-key');
        expect(value).toBeNull();
    });

    test('should delete keys', async () => {
        await cache.set('delete-me', 123);
        await cache.delete('delete-me');
        const value = await cache.get<number>('delete-me');
        expect(value).toBeNull();
    });

    test('should clear all keys', async () => {
        await cache.set('a', 1);
        await cache.set('b', 2);
        await cache.clear();
        expect(await cache.get('a')).toBeNull();
        expect(await cache.get('b')).toBeNull();
    });

    test('should prune expired entries', async () => {
        await cache.set('short', 1, 10);
        await cache.set('long', 2, 1000);
        
        await new Promise(resolve => setTimeout(resolve, 20));
        cache.prune();
        
        // We can't directly check map size without exposing it or using a spy,
        // but we can check that 'short' is gone and 'long' remains.
        expect(await cache.get('short')).toBeNull();
        expect(await cache.get('long')).toBe(2);
    });
});
