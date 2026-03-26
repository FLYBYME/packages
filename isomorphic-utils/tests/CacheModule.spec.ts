import { MeshApp } from '@flybyme/isomorphic-core';
import { CacheModule } from '../src/modules/CacheModule';
import { MemoryCache } from '../src/cache/MemoryCache';

describe('CacheModule', () => {
    let app: MeshApp;

    beforeEach(() => {
        app = new MeshApp({ nodeID: 'test-node' });
    });

    test('should register cache provider in DI container', async () => {
        const module = new CacheModule();
        app.use(module);
        
        // Boot phase
        await (module as any).onInit(app);

        const cache = app.getProvider<MemoryCache>('cache');
        expect(cache).toBeDefined();
        expect(cache).toBeInstanceOf(MemoryCache);
    });

    test('should allow custom provider via constructor', async () => {
        const customProvider = new MemoryCache();
        const module = new CacheModule({ provider: customProvider });
        app.use(module);

        await (module as any).onInit(app);

        const cache = app.getProvider<MemoryCache>('cache');
        expect(cache).toBe(customProvider);
    });
});
