import { IContext, SiteManifest } from '@flybyme/isomorphic-core';
import { BuildFromPathParamsSchema } from '../compiler.schema';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import * as path from 'path';
import * as fs from 'fs';
import { ICompilerService } from '../compiler.interface';

export async function build_from_path(
    this: ICompilerService,
    ctx: IContext<z.infer<typeof BuildFromPathParamsSchema>>
) {
    const manifestPath = path.resolve(process.cwd(), ctx.params.manifestPath);

    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    this.logger.info(`[mesh.compiler] Loading manifest from path: ${manifestPath}`);

    // Register ts-node compiler on the fly to require the typescript manifest file
    // Note: We avoid polluting global space heavily, but require('ts-node/register') is safe if already loaded
    if (!(process as any)[Symbol.for('ts-node.register.instance')]) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('ts-node').register({ transpileOnly: true });
    }

    // Bust the require cache so we get the fresh manifest every time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    delete require.cache[require.resolve(manifestPath)];

    let importedModule: any;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        importedModule = require(manifestPath);
    } catch (err) {
        throw new Error(`Failed to load manifest at ${manifestPath}: ${err}`);
    }

    // Find the exported manifest object. We look for 'default' or any exported object with 'app' and 'mesh' (or 'network' for compatibility).
    let manifest: SiteManifest | undefined;
    if (importedModule.default && importedModule.default.app && (importedModule.default.mesh || importedModule.default.network)) {
        manifest = importedModule.default;
    } else {
        const key = Object.keys(importedModule).find(k => importedModule[k]?.app && (importedModule[k]?.mesh || importedModule[k]?.network));
        if (key) {
            manifest = importedModule[key];
        }
    }

    if (!manifest) {
        throw new Error(`Valid SiteManifest not found in exports of ${manifestPath}`);
    }

    const appId = manifest.app.id;
    const manifestId = nanoid(8);

    this.logger.debug(`[mesh.compiler] Dynamically loaded manifest for ${appId}`);

    // 1. Register the manifest into the mesh system so the CDN and routing can find it
    try {
        await ctx.call('mesh.manifest.register', manifest as any);
        this.logger.debug(`[mesh.compiler] Successfully registered manifest ${appId} into the mesh.`);
    } catch (err) {
        this.logger.error(`[mesh.compiler] Failed to register manifest into the mesh:`, err as Error);
        // Continue anyway to attempt build
    }

    // 2. Create a persistent record in the database
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

    const baseBuildsDir = ctx.params.outputPath || manifest.build?.outputPath || '.builds';
    const buildDir = path.join(process.cwd(), baseBuildsDir, appId, buildId);

    // Ensure build directory exists
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    // 3. Trigger background process build
    ctx.call('mesh.compiler.process_build', {
        buildId,
        appId,
        manifestId,
        manifest: manifest as any,
        watch: ctx.params.watch,
        buildDir
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
