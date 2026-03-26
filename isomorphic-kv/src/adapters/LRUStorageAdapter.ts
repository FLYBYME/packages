import { IKVEntry, IKVStorageAdapter } from '../kv.interfaces';

/**
 * LRUStorageAdapter — In-memory LRU cache adapter.
 */
export class LRUStorageAdapter implements IKVStorageAdapter {
    private cache = new Map<string, IKVEntry<unknown>>();
    private readonly maxSize: number;

    constructor(maxSize: number = 10000) {
        this.maxSize = maxSize;
    }

    async get<T>(key: string): Promise<IKVEntry<T> | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (entry.ttl < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        
        // Maintain LRU order: delete and re-insert
        this.cache.delete(key);
        this.cache.set(key, entry);
        
        return entry as IKVEntry<T>;
    }

    async set<T>(entry: IKVEntry<T>): Promise<void> {
        // Evict if full
        if (this.cache.size >= this.maxSize && !this.cache.has(entry.key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(entry.key, entry);
    }

    async delete(key: string): Promise<boolean> {
        return this.cache.delete(key);
    }

    async cleanup(): Promise<number> {
        const now = Date.now();
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.ttl < now) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
}
