import { z } from 'zod';
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
    IContext,
    IMeshApp,
    SafeTimer,
    TimerHandle
} from '@flybyme/isomorphic-core';
import {
    KVEntrySchema,
    KVSetRequest,
    KVGetRequest,
    KVSetRequestSchema,
    KVGetRequestSchema
} from './kv.schema';
import { IKVEntry, IKVStorageAdapter } from './kv.interfaces';
import { KVRouter } from './core/KVRouter';

const KVTable = defineTable('kv_store', KVEntrySchema);

/**
 * KVService — Distributed L2 Cache Service.
 * Implements Consistent Hashing and Tenant Isolation.
 */
export class KVService extends DatabaseMixin(KVTable)(class { }) {
    public readonly name = 'kv';
    private router!: KVRouter;
    private replicationFactor = 3;
    private cleanupInterval?: TimerHandle;

    public actions = {
        get: {
            handler: this.get.bind(this),
            params: KVGetRequestSchema,
            rest: { method: 'GET', path: '/:key' }
        },
        set: {
            handler: this.set.bind(this),
            params: KVSetRequestSchema,
            rest: { method: 'POST', path: '/' }
        },
        delete: {
            handler: this.delete.bind(this),
            params: z.object({ key: z.string() }),
            rest: { method: 'DELETE', path: '/:key' }
        },
        replicate: {
            handler: this.replicate.bind(this),
            params: KVEntrySchema
        }
    };

    constructor(private storage: IKVStorageAdapter) {
        super();
    }

    async onInit(app: IMeshApp): Promise<void> {
        await super.onInit(app);

        this.router = new KVRouter(this.broker);

        // Load settings from contract registries if available
        const settings = this.broker.getSetting<Record<string, unknown>>('kv') || {};
        this.replicationFactor = (settings.replicationFactor as number) || 3;

        const cleanupMs = (settings.cleanupIntervalMs as number) || 60000;
        this.cleanupInterval = setInterval(() => {
            this.storage.cleanup().catch(err => {
                this.broker.logger.error(`KV Cleanup Task Failed: ${err.message}`);
            });
        }, cleanupMs);
        SafeTimer.unref(this.cleanupInterval);
    }

    /**
     * Tenant Isolation: Partition keys by tenant_id.
     */
    private getScopedKey(ctx: IContext<unknown>, key: string): string {
        const tenantId = ctx.meta.user?.tenant_id || ctx.meta.tenant_id || 'global';
        return `${tenantId}:${key}`;
    }

    /**
     * kv.get — Retrieves a cache entry.
     */
    async get<T>(ctx: IContext<KVGetRequest>): Promise<IKVEntry<T> | null> {
        const scopedKey = this.getScopedKey(ctx, ctx.params.key);

        // Is local node responsible?
        if (this.router.isLocalResponsible(scopedKey, this.replicationFactor)) {
            return this.storage.get<T>(scopedKey);
        }

        // Otherwise, route to primary node
        const targets = this.router.getTargetNodes(scopedKey, this.replicationFactor);
        const primary = targets[0];

        if (primary && primary !== this.broker.app.nodeID) {
            const result = await this.broker.call('kv.get', ctx.params, { nodeID: primary });
            return result as IKVEntry<T> | null;
        }

        return null;
    }

    /**
     * kv.set — Persists a cache entry and triggers replication.
     */
    async set(ctx: IContext<KVSetRequest>): Promise<{ success: boolean }> {
        const scopedKey = this.getScopedKey(ctx, ctx.params.key);
        const ttlMs = ctx.params.ttlMs || 3600000; // Default 1 hour

        const entry: IKVEntry<unknown> = {
            key: scopedKey,
            value: ctx.params.value,
            ttl: Date.now() + ttlMs,
            version: Date.now(),
            ownerID: this.broker.app.nodeID
        };

        const targets = this.router.getTargetNodes(scopedKey, this.replicationFactor);

        // 1. Store locally if we are on the ring segment
        if (targets.includes(this.broker.app.nodeID)) {
            await this.storage.set(entry);
        }

        // 2. Dispatch fire-and-forget replication to neighbors
        for (const nodeID of targets) {
            if (nodeID !== this.broker.app.nodeID) {
                this.broker.call('kv.replicate', entry, { nodeID }).catch(() => { });
            }
        }

        return { success: true };
    }

    /**
     * kv.replicate — Internal action for peer-to-peer replication.
     */
    async replicate(ctx: IContext<IKVEntry<unknown>>): Promise<{ success: boolean }> {
        // Basic conflict resolution: higher version wins
        const existing = await this.storage.get(ctx.params.key);
        if (existing && existing.version >= ctx.params.version) {
            return { success: true };
        }

        await this.storage.set(ctx.params);
        return { success: true };
    }

    /**
     * kv.delete — Removes an entry globally.
     */
    async delete(ctx: IContext<{ key: string }>): Promise<{ success: boolean }> {
        const scopedKey = this.getScopedKey(ctx, ctx.params.key);
        const targets = this.router.getTargetNodes(scopedKey, this.replicationFactor);

        if (targets.includes(this.broker.app.nodeID)) {
            await this.storage.delete(scopedKey);
        }

        for (const nodeID of targets) {
            if (nodeID !== this.broker.app.nodeID) {
                this.broker.call('kv.delete', ctx.params, { nodeID }).catch(() => { });
            }
        }

        return { success: true };
    }

    public async stop(): Promise<void> {
        if (this.cleanupInterval) {
            SafeTimer.clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
}
