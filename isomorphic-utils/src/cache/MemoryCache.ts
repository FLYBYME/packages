import { ICacheProvider } from '../interfaces/ICacheProvider';

interface CacheEntry<T> {
    value: T;
    expiresAt: number | null;
}

/**
 * MemoryCache — In-memory caching implementation with TTL support.
 */
export class MemoryCache implements ICacheProvider {
    private storage = new Map<string, CacheEntry<unknown>>();

    async get<T>(key: string): Promise<T | null> {
        const entry = this.storage.get(key);

        if (!entry) return null;

        // Check for expiration
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.storage.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        const expiresAt = ttlMs ? Date.now() + ttlMs : null;
        this.storage.set(key, { value, expiresAt });
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async clear(): Promise<void> {
        this.storage.clear();
    }

    /**
     * Internal: Cleanup expired entries to prevent memory leaks.
     * Can be called periodically if needed.
     */
    public prune(): void {
        const now = Date.now();
        for (const [key, entry] of this.storage.entries()) {
            if (entry.expiresAt !== null && now > entry.expiresAt) {
                this.storage.delete(key);
            }
        }
    }
}
