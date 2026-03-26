import { IMeshModule, IMeshApp } from '@flybyme/isomorphic-core';
import { ICacheProvider } from '../interfaces/ICacheProvider';
import { MemoryCache } from '../cache/MemoryCache';

export interface CacheModuleOptions {
    provider?: ICacheProvider;
}

/**
 * CacheModule — Standardized module for pluggable caching.
 */
export class CacheModule implements IMeshModule {
    public readonly name = 'cache-module';
    private provider: ICacheProvider;

    constructor(options: CacheModuleOptions = {}) {
        this.provider = options.provider || new MemoryCache();
    }

    onInit(app: IMeshApp): void {
        console.log('[CacheModule] Initializing cache provider...');
        app.registerProvider('cache', this.provider);
    }
}
