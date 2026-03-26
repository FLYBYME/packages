import { z } from 'zod';
import { IContext, ILogger, IServiceBroker, SiteManifestSchema } from '@flybyme/isomorphic-core';
import { DatabaseMixin } from '@flybyme/isomorphic-database';
import { ManifestTable } from './compiler.db';
import './compiler.contract';

/**
 * ManifestService
 * Manages Site Manifests for the Mesh.
 */
export class ManifestService extends DatabaseMixin(ManifestTable)(class { }) {
    public readonly name = 'mesh.manifest';
    public logger!: ILogger;
    public broker!: IServiceBroker;

    public actions = {
        register: {
            params: SiteManifestSchema,
            handler: this.register.bind(this)
        },
        resolve: {
            params: z.object({ appId: z.string() }),
            handler: this.resolve.bind(this)
        },
        validate: {
            params: SiteManifestSchema,
            handler: this.validate.bind(this)
        }
    };

    /**
     * register
     */
    async register(ctx: IContext<z.infer<typeof SiteManifestSchema>>) {
        const manifest = ctx.params;
        const appId = manifest.app.id;

        // Using agnostic upsert pattern
        await this.db.upsert(appId, {
            id: appId,
            appId: appId,
            data: JSON.stringify(manifest),
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        this.logger.debug(`[mesh.manifest] Registered manifest for ${appId}`);
        return { success: true, appId };
    }

    /**
     * resolve
     */
    async resolve(ctx: IContext<{ appId: string }>) {
        const results = await this.db.find({ appId: ctx.params.appId });
        const row = results[0];
        if (!row) return undefined;
        
        return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    }

    /**
     * validate
     */
    async validate(_ctx: IContext<z.infer<typeof SiteManifestSchema>>) {
        // Zod already validated the params at the broker boundary
        return { valid: true };
    }

    async started() {
        this.logger.info('[mesh.manifest] Manifest Service started.');
    }
}

export default ManifestService;
