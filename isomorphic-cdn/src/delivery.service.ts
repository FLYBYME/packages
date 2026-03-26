import {
    IServiceSchema,
    ILogger,
    IServiceBroker,
    IContext,
    IMeshApp,
    MeshError,
    SiteManifestRecord,
    SiteManifest
} from '@flybyme/isomorphic-core';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { z } from 'zod';

/**
 * DeliveryService
 * Edge service for serving mesh applications with SSR, env injection, and cache busting.
 */
export class DeliveryService implements IServiceSchema {
    public readonly name = 'cdn.delivery';
    public logger!: ILogger;
    public broker!: IServiceBroker;
    private app!: IMeshApp;
    private server?: http.Server;
    private outputPath: string = '.builds';

    async onInit(app: IMeshApp) {
        this.app = app;
        this.logger = app.logger.child({ service: this.name });
        this.broker = app.getProvider<IServiceBroker>('broker');
        this.outputPath = process.env.MESH_CDN_OUTPUT_PATH || '.builds';
    }

    public setOutputPath(path: string) {
        this.outputPath = path;
    }

    public actions = {
        render: {
            params: z.object({
                appId: z.string(),
                path: z.string().default('/'),
                gatewayUrl: z.string().optional()
            }),
            handler: this.render.bind(this)
        }
    };

    /**
     * render
     * Performs SSR, injects environment variables, and applies cache busting to assets.
     */
    async render(ctx: IContext<{ appId: string; path: string; gatewayUrl?: string }>) {
        const { appId, path: reqPath, gatewayUrl } = ctx.params;

        this.logger.info(`[cdn.delivery] Rendering request for ${appId} at ${reqPath}`);

        // 1. Get Manifest
        let manifest = await ctx.call('mesh.manifest.resolve', { appId }) as SiteManifest | undefined;

        if (!manifest && appId === 'default') {
            const list = await ctx.call('mesh.manifest.list', { limit: 1 }) as SiteManifestRecord[];
            if (list && list.length > 0) {
                const record = list[0];
                this.logger.debug(`[cdn.delivery] Falling back to first manifest: ${record.id}`);
                manifest = (typeof record.data === 'string' ? JSON.parse(record.data) : record.data) as SiteManifest;
            }
        }

        if (!manifest) {
            throw new MeshError({ message: `Manifest not found for ${appId}`, code: 'NOT_FOUND', status: 404 });
        }

        const actualAppId = manifest.app.id;

        // 2. Resolve Component for Path
        let componentPath = manifest.routing?.notFoundComponent || 'NotFound';
        const route = manifest.routing?.routes?.find(r => r.path === reqPath);
        if (route) {
            componentPath = route.component;
        }

        // 3. Perform SSR via Compiler
        let renderedHtml = '<div id="mesh-root-app"></div>';
        const shouldSSR = manifest.build?.ssr !== false;

        if (shouldSSR) {
            this.logger.info(`[cdn.delivery] Requesting SSR for ${componentPath} from compiler...`);
            try {
                renderedHtml = await ctx.call('mesh.compiler.ssr_render', {
                    componentPath,
                    props: {}
                }, { timeout: 5000 }) as string;
                this.logger.debug(`[cdn.delivery] SSR Succeeded. Length: ${renderedHtml.length}`);
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                this.logger.error(`[cdn.delivery] SSR Failed or Timed Out for ${componentPath}: ${error.message}. Serving fallback shell.`);
                renderedHtml = `<div id="mesh-root-app"></div>`;
            }
        } else {
            this.logger.info(`[cdn.delivery] SSR disabled for ${appId}. Serving client-side shell.`);
        }

        // 4. Fetch index.html template AND current build ID
        const { html: rawHtml, buildId } = await this.fetchHtml(actualAppId, manifest);

        // 5. Inject Environment & Cache Busters
        const env = {
            MESH_GATEWAY_URL: gatewayUrl || process.env.MESH_GATEWAY_URL || 'ws://localhost:5020',
            NODE_ID: `browser-cdn-${Math.random().toString(36).substring(2, 9)}`,
            APP_ID: actualAppId,
            MANIFEST: manifest
        };

        let injectedHtml = rawHtml.replace(
            '</head>',
            `<script>window.__MESH_ENV__ = ${JSON.stringify(env)};</script></head>`
        );

        // Cache Busting: Append ?v=BUILD_ID to local JS, CSS, and JSON assets
        injectedHtml = injectedHtml.replace(
            /(src|href)=["']([^"']*\.(?:js|css|json))["']/gi,
            `$1="$2?v=${buildId}"`
        );

        // 6. Inject SSR Content
        const rootDivRegex = /<div id=["']mesh-root-app["']>\s*<\/div>/;
        if (rootDivRegex.test(injectedHtml)) {
            this.logger.info(`[cdn.delivery] Found root div in template. Replacing...`);
            injectedHtml = injectedHtml.replace(rootDivRegex, renderedHtml);
        } else {
            this.logger.warn(`[cdn.delivery] Root div NOT FOUND in template. Trying fallback injection.`);
            injectedHtml = injectedHtml.replace('</body>', `${renderedHtml}</body>`);
        }

        return { html: injectedHtml };
    }

    private async fetchHtml(appId: string, manifest?: SiteManifest): Promise<{ html: string, buildId: string }> {
        let actualAppId = appId;
        if (appId === 'default' && manifest) {
            actualAppId = manifest.app.id;
        }

        const buildsDir = path.join(process.cwd(), this.outputPath, actualAppId);
        const fallbackBuildId = Date.now().toString();

        if (fs.existsSync(buildsDir)) {
            const builds = fs.readdirSync(buildsDir).filter(f => !f.startsWith('.'));

            if (builds.length > 0) {
                // Find the most recent build folder to use as the cache buster
                const latestBuild = builds.map(b => ({
                    name: b,
                    time: fs.statSync(path.join(buildsDir, b)).mtime.getTime()
                })).sort((a, b) => b.time - a.time)[0].name;

                const indexPath = path.join(buildsDir, latestBuild, 'index.html');
                if (fs.existsSync(indexPath)) {
                    return {
                        html: fs.readFileSync(indexPath, 'utf-8'),
                        buildId: latestBuild
                    };
                }
            }
        }

        this.logger.warn(`[cdn.delivery] Could not find compiled index.html for ${actualAppId}. Serving fallback.`);
        return {
            html: `<html><body><div id="mesh-root-app"></div></body></html>`,
            buildId: fallbackBuildId
        };
    }

    async started() {
        const port = Number(process.env.PORT) || 3000;
        this.server = http.createServer(async (req, res) => {
            const start = Date.now();
            const url = req.url || '/';
            const appId = req.headers['x-app-id'] as string || 'default';

            const logRequest = (status: number) => {
                const duration = Date.now() - start;
                this.logger.info(`[HTTP] ${req.method} ${url} ${status} - ${duration}ms`);
            };

            let actualAppId = appId;
            try {
                const manifest = await this.broker.call('mesh.manifest.resolve', { appId }) as SiteManifest;
                if (manifest) {
                    actualAppId = manifest.app.id;
                } else if (appId === 'default') {
                    // Fallback to first available manifest if 'default' is requested but not explicitly registered
                    const list = await this.broker.call('mesh.manifest.list', { limit: 1 }) as SiteManifestRecord[];
                    if (list && list.length > 0) {
                        const firstManifest = (typeof list[0].data === 'string' ? JSON.parse(list[0].data) : list[0].data) as SiteManifest;
                        actualAppId = firstManifest.app.id;
                    }
                }
            } catch {
                // Ignore if manifest service not ready
            }

            // Asset Handling
            const isAssetPath = url.includes('/bundles/') ||
                url.includes('/cdn/') ||
                url.includes('.') ||
                url === '/manifest.json' ||
                url === '/favicon.ico';

            if (isAssetPath) {
                try {
                    const asset = await this.fetchAsset(actualAppId, url);
                    if (asset) {
                        const hasVersion = url.includes('?v=');

                        res.writeHead(200, {
                            'Content-Type': asset.contentType,
                            // Aggressive cache if versioned, standard cache if not
                            'Cache-Control': hasVersion
                                ? 'public, max-age=31536000, immutable'
                                : 'public, max-age=60'
                        });
                        res.end(asset.content);
                        logRequest(200);
                        return;
                    }
                } catch (_e) {
                    this.logger.error(`[cdn.delivery] Asset fetch error: ${url} ${_e}`);
                }

                res.writeHead(404);
                res.end('Asset Not Found');
                logRequest(404);
                return;
            }

            // Page Rendering
            try {
                // Extract the IP or Domain the tablet used to connect (e.g., 192.168.1.50:3000)
                const hostHeader = req.headers.host || 'localhost';
                const hostname = hostHeader.split(':')[0];

                // Dynamically build the Gateway URL using the correct IP, pointing to port 5020
                const dynamicGatewayUrl = process.env.MESH_GATEWAY_URL || `ws://${hostname}:5020`;

                const result = await this.broker.call('cdn.delivery.render', {
                    appId,
                    path: url,
                    gatewayUrl: dynamicGatewayUrl
                }) as { html: string };

                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(result.html);
                logRequest(200);
            } catch (err) {
                const error = err instanceof MeshError ? err : (err instanceof Error ? err : new Error(String(err)));
                const status = (error as { status?: number }).status || 500;
                res.writeHead(status);
                res.end(error.message || 'Internal Server Error');
                logRequest(status);
            }
        });

        this.server.listen(port, () => {
            this.logger.debug(`[cdn.delivery] HTTP server listening on port ${port}`);
        });
    }

    private async fetchAsset(appId: string, url: string): Promise<{ content: Buffer, contentType: string } | null> {
        // Strip the query string to find the physical file on disk
        const [cleanUrl] = url.split('?');
        this.logger.debug(`[cdn.delivery] Resolving asset: ${cleanUrl} (Original: ${url})`);

        let actualAppId = appId;
        if (appId === 'default') {
            const manifest = await this.broker.call('mesh.manifest.resolve', { appId: 'default' }) as SiteManifest;
            if (manifest) {
                actualAppId = manifest.app.id;
            } else {
                // Fallback: Use first available manifest if 'default' doesn't exist
                const list = await this.broker.call('mesh.manifest.list', { limit: 1 }) as SiteManifestRecord[];
                if (list && list.length > 0) {
                    const firstManifest = (typeof list[0].data === 'string' ? JSON.parse(list[0].data) : list[0].data) as SiteManifest;
                    actualAppId = firstManifest.app.id;
                }
            }
        }

        const buildsDir = path.join(process.cwd(), this.outputPath, actualAppId);
        if (!fs.existsSync(buildsDir)) return null;

        const builds = fs.readdirSync(buildsDir).filter(f => !f.startsWith('.'));
        if (builds.length === 0) return null;

        const latestBuild = builds.map(b => ({
            name: b,
            time: fs.statSync(path.join(buildsDir, b)).mtime.getTime()
        })).sort((a, b) => b.time - a.time)[0].name;

        const buildRoot = path.join(buildsDir, latestBuild);

        const cleanPath = cleanUrl
            .replace(new RegExp(`^/bundles/${actualAppId}/`), '')
            .replace(new RegExp(`^/bundle/`), '')
            .replace(/^\/cdn\//, '')
            .replace(/^\.\//, '');

        const possiblePaths = [
            path.join(buildRoot, cleanPath),
            path.join(buildRoot, 'bundle', cleanPath),
            path.join(buildRoot, path.basename(cleanPath)),
            path.join(buildRoot, 'bundle', path.basename(cleanPath))
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                const ext = path.extname(p).toLowerCase();
                const contentType =
                    ext === '.js' ? 'application/javascript' :
                        ext === '.css' ? 'text/css' :
                            ext === '.json' ? 'application/json' :
                                ext === '.map' ? 'application/json' :
                                    ext === '.png' ? 'image/png' :
                                        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                                            ext === '.svg' ? 'image/svg+xml' :
                                                ext === '.ico' ? 'image/x-icon' :
                                                    'application/octet-stream';

                return {
                    content: fs.readFileSync(p),
                    contentType
                };
            }
        }

        return null;
    }

    async stopped() {
        if (this.server) {
            this.server.close();
        }
    }
}

export default DeliveryService;