/**
 * ICacheProvider — Strict interface for pluggable caching engines.
 */
export interface ICacheProvider {
    /** Retrieve a value from cache by key */
    get<T>(key: string): Promise<T | null>;

    /** Store a value in cache with optional TTL */
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

    /** Remove a specific key from cache */
    delete(key: string): Promise<void>;

    /** Clear all cached data */
    clear(): Promise<void>;
}
