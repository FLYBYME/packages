import { z } from 'zod';
import { IContext } from '@flybyme/isomorphic-core';
import * as fs from 'fs';
import * as path from 'path';
import { build as esbuild, context } from 'esbuild'; // Import context
import { synthesize_bootstrap } from '../methods/synthesize_bootstrap';
import { generateNodeShims } from '../methods/generateNodeShims';
import { get_esbuild_config } from '../methods/get_esbuild_config';
import { generate_index_html } from '../methods/generate_index_html';

import { ICompilerService } from '../compiler.interface';
import { SiteManifestSchema, SiteManifest } from '@flybyme/isomorphic-core';

/**
 * process_build
 * Internal logic for synthesizing and bundling the application.
 */
export async function process_build(
    this: ICompilerService,
    ctx: IContext<{ buildId: string; appId: string; manifestId: string; manifest: any; watch?: boolean; buildDir: string }>
) {
    const { buildId, appId, manifest, watch } = ctx.params; // Destructure watch param
    const siteManifest = manifest as SiteManifest;
    const baseBuildsDir = siteManifest.build?.outputPath || '.builds';
    const buildDir = (ctx.params as Record<string, unknown>).buildDir as string || path.join(process.cwd(), baseBuildsDir, appId, buildId);
    const startTime = Date.now();

    try {
        this.logger.info(`[mesh.compiler] Processing build ${buildId}${watch ? ' in watch mode' : ''}...`);

        // 0. Resolve Source Root
        const srcDir = (siteManifest.build as SiteManifest['build'])?.srcDir || '.';
        const absoluteSrcDir = path.resolve(process.cwd(), srcDir);

        // 1. Resolve Entry Point
        let entryFile: string;
        const manifestEntryPoint = (siteManifest.build as SiteManifest['build'])?.entryPoint;

        if (manifestEntryPoint) {
            entryFile = path.resolve(absoluteSrcDir, manifestEntryPoint);
            this.logger.debug(`[mesh.compiler] Using custom entry point: ${entryFile}`);
        } else {
            // Synthesize Files (Legacy/Default)
            const bootstrapCode = synthesize_bootstrap(siteManifest);
            const shimCode = generateNodeShims();

            entryFile = path.join(buildDir, 'bootstrap.ts');
            const shimFile = path.join(buildDir, 'shims.ts');

            fs.writeFileSync(entryFile, bootstrapCode);
            fs.writeFileSync(shimFile, shimCode);
            this.logger.info(`[mesh.compiler] Using synthesized bootstrap entry.`);
        }

        // 2. Run esbuild
        const bundleDir = path.join(buildDir, 'bundle');
        const config = get_esbuild_config(siteManifest, entryFile, bundleDir, buildId);

        // Define post-build steps that need to run after each esbuild completion
        const postBuildFn = async (isWatchBuild: boolean = false) => {
            this.logger.debug(`[mesh.compiler] Starting post-build steps for ${buildId}...`);
            const assets = fs.readdirSync(bundleDir);
            const mainJs = assets.find(f => f.endsWith('.js')) || 'main.js';

            // 3. Handle Assets (Styles, etc.)
            const globalStyles = siteManifest.assets?.globalStyles || [];
            for (const styleRelPath of globalStyles) {
                // Skip if it's an external URL
                if (styleRelPath.startsWith('http://') || styleRelPath.startsWith('https://')) {
                    this.logger.debug(`[mesh.compiler] Skipping external asset copy: ${styleRelPath}`);
                    continue;
                }

                const srcPath = path.resolve(absoluteSrcDir, styleRelPath);
                const destPath = path.join(buildDir, styleRelPath);

                if (fs.existsSync(srcPath)) {
                    fs.mkdirSync(path.dirname(destPath), { recursive: true });
                    fs.copyFileSync(srcPath, destPath);
                    this.logger.debug(`[mesh.compiler] Copied asset: ${styleRelPath}`);
                } else {
                    this.logger.warn(`[mesh.compiler] Asset not found: ${srcPath}`);
                }
            }

            // 4. Generate HTML
            const html = generate_index_html(siteManifest, `./bundle/${mainJs}`, assets);
            fs.writeFileSync(path.join(buildDir, 'index.html'), html);

            // 4.1 Generate PWA manifest.json
            const pwaManifest = {
                short_name: siteManifest.app.shortName || siteManifest.app.name,
                name: siteManifest.app.name,
                icons: siteManifest.app.icons || [],
                start_url: "/",
                display: siteManifest.app.display || "standalone",
                theme_color: siteManifest.app.themeColor || "#000000",
                background_color: siteManifest.app.background || "#ffffff"
            };
            fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(pwaManifest, null, 2));

            // 5. Promote Build
            await ctx.call('mesh.compiler.promote_build', { buildId });

            // 6. Update Database Record
            try {
                await ctx.call('mesh.compiler.update', {
                    id: buildId,
                    status: 'success',
                    durationMs: Date.now() - startTime,
                    assets: JSON.stringify(assets)
                });
                this.logger.debug(`[mesh.compiler] Build record ${buildId} updated to 'success'.`);
            } catch (err: unknown) {
                const updateMsg = err instanceof Error ? err.message : String(err);
                this.logger.error(`[mesh.compiler] Failed to update build record ${buildId}:`, { error: updateMsg });
            }

            if (isWatchBuild) {
                this.logger.info(`[mesh.compiler] Watch build for ${buildId} completed successfully.`);
            } else {
                this.logger.info(`[mesh.compiler] Build ${buildId} completed successfully in ${Date.now() - startTime}ms`);
            }
        };

        if (watch) {
            config.plugins = config.plugins || [];
            config.plugins.push({
                name: 'mesh-compiler-watch-plugin',
                setup(build: { onEnd: (callback: (result: { errors: unknown[] }) => Promise<void>) => void }) {
                    build.onEnd(async (result: { errors: unknown[] }) => {
                        if (result.errors.length > 0) {
                            //this.logger.error(`[mesh.compiler] Watch build for ${buildId} failed with errors.`);
                            // Optionally update DB record to failed here
                            return;
                        }
                        //this.logger.info(`[mesh.compiler] Detected changes, rebuilding ${buildId}...`);
                        await postBuildFn(true); // Pass true for watch build
                    });
                }
            } as never); // Type assertion might be needed if onEnd is not directly available

            try {
                const esbuildContext = await context(config);
                await esbuildContext.watch();
                // Keep the process alive for watching
                this.logger.debug(`[mesh.compiler] Watching for changes in ${entryFile}...`);
                // Note: The build process will now run in watch mode.
                // The caller (e.g., mesh-cli dev command) might need to keep this process running.
                // For now, we just start watching and let the service continue.
            } catch (error) {
                this.logger.error(`[mesh.compiler] Failed to start esbuild watch for ${buildId}: ${error}`);
                throw error; // Re-throw to mark the build as failed
            }
        } else {
            // Regular build
            await esbuild(config);
            await postBuildFn(false); // Pass false for regular build
        }

        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`[mesh.compiler] Build ${buildId} failed:`, { error: message });

        // Update Database Record as Failed
        try {
            await ctx.call('mesh.compiler.update', {
                id: buildId,
                status: 'failed',
                errorLog: JSON.stringify(message),
                durationMs: Date.now() - startTime
            });
        } catch (dbErr) {
            const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
            this.logger.error(`[mesh.compiler] Failed to update failed build record ${buildId}:`, { error: dbErrMsg });
        }

        return { success: false, error: message };
    }
}
