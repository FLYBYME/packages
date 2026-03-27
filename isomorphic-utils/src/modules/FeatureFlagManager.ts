import { IFeatureFlagManager } from '../interfaces/IFeatureFlagManager';
import { ICacheProvider } from '../interfaces/ICacheProvider';

export interface IBrokerCaller {
    call(action: any, params: any, options?: any): Promise<any>;
}

/**
 * FeatureFlagManager — Handles feature flags with local caching and RPC fallbacks.
 */
export class FeatureFlagManager implements IFeatureFlagManager {
    private flags: Record<string, boolean> = {};
    private cache: ICacheProvider;
    private broker?: IBrokerCaller;
    private readonly CACHE_PREFIX = 'ff:';

    constructor(cache: ICacheProvider, defaultFlags: Record<string, boolean> = {}) {
        this.cache = cache;
        this.flags = { ...defaultFlags };
    }

    setBroker(broker: IBrokerCaller): void {
        this.broker = broker;
    }

    isEnabled(flag: string, _context?: Record<string, unknown>): boolean {
        // 1. Check local memory state
        if (this.flags[flag] !== undefined) {
            return this.flags[flag];
        }

        // 2. If not found, attempt to fetch from backend (async fallback)
        // Note: isEnabled is synchronous by interface, so we trigger a background fetch
        this.fetchFlag(flag);

        return false; // Default to false while fetching
    }

    private async fetchFlag(flag: string): Promise<void> {
        if (!this.broker) return;

        try {
            const result = await this.broker.call('$flags.fetch', { flag });
            this.updateFlag(flag, result.enabled);
        } catch {
            // Silently fail or log
        }
    }

    getFlags(): Record<string, boolean> {
        return { ...this.flags };
    }

    sync(flags: Record<string, boolean>): void {
        this.flags = { ...this.flags, ...flags };
        // Persist all to cache
        for (const [key, value] of Object.entries(flags)) {
            this.cache.set(this.CACHE_PREFIX + key, value);
        }
    }

    /** Update a single flag and persist to cache */
    public updateFlag(flag: string, enabled: boolean): void {
        this.flags[flag] = enabled;
        this.cache.set(this.CACHE_PREFIX + flag, enabled);
    }

    /** Load flags from cache into memory */
    public async loadFromCache(): Promise<void> {
        // In a real implementation, we might want a list of flag keys to iterate
        // For now, we rely on the sync() method being called initially
    }
}
