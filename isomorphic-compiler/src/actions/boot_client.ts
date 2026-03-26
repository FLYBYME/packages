import { IContext, SiteManifest } from '@flybyme/isomorphic-core';
import { BootClientParamsSchema } from '../compiler.schema';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import * as path from 'path';
import * as fs from 'fs';

import { ICompilerService } from '../compiler.interface';

/**
 * boot_client
 * Entry point for a cold build request.
 * Creates a build record and triggers background processing.
 */
export async function boot_client(
    this: ICompilerService,
    ctx: IContext<z.infer<typeof BootClientParamsSchema>>
) {
    const manifest = ctx.params.manifest as SiteManifest;
    const appId = manifest.app.id;
    const manifestId = nanoid(8);

    this.logger.debug(`[mesh.compiler] Booting client build for ${appId}`);
    
    // 1. Create a persistent record in the database
    let buildId: string;
    try {
        const record = await this.db.create({
            appId,
            manifestId,
            status: 'running',
            createdAt: Date.now()
        });
        buildId = record.id;
        this.logger.debug(`[mesh.compiler] Initialized build record ${buildId} in DB.`);
    } catch (err) {
        this.logger.error(`[mesh.compiler] Failed to initialize build record:`, { error: err });
        throw new Error('Database error during build initialization');
    }

    const buildDir = path.join(process.cwd(), '.builds', appId, buildId);

    // Ensure build directory exists
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    // 2. Trigger background process
    // In a real scenario, this might go to a Job Queue.
    // For now, we call it directly or via the broker for decoupling.
    ctx.call('mesh.compiler.process_build', {
        buildId,
        appId,
        manifestId,
        manifest // Passing manifest for simplicity in this implementation
    }).catch(err => {
        this.logger.error(`[mesh.compiler] Build ${buildId} failed background processing:`, { error: err });
    });

    return {
        success: true,
        appId,
        buildId,
        buildDir,
        indexUrl: `/apps/${appId}/index.html`
    };
}
