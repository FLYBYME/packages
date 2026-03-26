import { BuildOptions as EsbuildBuildOptions, Plugin as EsbuildPlugin } from 'esbuild';
import { SiteManifest } from '@flybyme/isomorphic-core';
import * as path from 'path';

/**
 * get_esbuild_config
 * Generates an esbuild configuration tailored for the mesh environment.
 */
export function get_esbuild_config(manifest: SiteManifest, entryPoint: string, outdir: string, buildId?: string): EsbuildBuildOptions {
    const build = manifest.build || {};
    const isBrowser = true;

    // Resolve the application's source root
    let appSrcDir = process.cwd();
    if (build.srcDir) {
        const rawSrcDir = build.srcDir;
        appSrcDir = path.isAbsolute(rawSrcDir)
            ? rawSrcDir
            : path.resolve(process.cwd(), rawSrcDir);
    }

    const nodeBuiltIns = [
        'path', 'fs', 'os', 'crypto', 'stream', 'buffer', 'util', 'events',
        'http', 'https', 'url', 'querystring', 'zlib', 'tls', 'net', 'dns',
        'child_process', 'worker_threads', 'cluster', 'perf_hooks', 'fs/promises',
        'node:tls', 'node:http', 'node:https', 'node:net', 'node:fs', 'node:path',
        'node:crypto', 'node:stream', 'node:buffer', 'node:util', 'node:events',
        'node:url', 'node:querystring', 'node:zlib', 'node:dns', 'node:child_process'
    ];

    const serverOnlyPackages = ['express', 'ws', 'nats', 'better-sqlite3'];

    // Null-Shim Plugin for ESBuild
    const nullShimPlugin: EsbuildPlugin = {
        name: 'null-shim',
        setup(build) {
            const filter = new RegExp(`^(${[...nodeBuiltIns, ...serverOnlyPackages].join('|')})$`);

            build.onResolve({ filter }, args => {
                return { path: args.path, namespace: 'null-shim' };
            });

            build.onLoad({ filter: /.*/, namespace: 'null-shim' }, () => {
                return {
                    // Use a CommonJS Proxy to satisfy both named and default imports
                    contents: `
                        const stub = new Proxy({}, { 
                            get: () => function() { return stub; } 
                        });
                        module.exports = stub;
                    `,
                    loader: 'js',
                };
            });
        },
    };

    return {
        entryPoints: [entryPoint],
        bundle: true,
        outdir,
        entryNames: buildId ? `main-${buildId}` : 'main',
        format: build.format || 'esm',
        target: build.target || 'es2018',
        minify: build.minify ?? true,
        sourcemap: build.sourcemap ?? true,
        splitting: build.splitting ?? false,
        publicPath: build.publicPath || '/',
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser', 'import', 'require'],
        define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
            '__MESH_APP_ID__': JSON.stringify(manifest.app.id),
            ...(build.define || {})
        },
        loader: {
            '.png': 'file',
            '.jpg': 'file',
            '.svg': 'dataurl',
            '.css': 'css',
            ...(build.loaders || {})
        },
        alias: {
            '@app': appSrcDir,
            ...(build.aliases || {})
        },
        plugins: isBrowser ? [nullShimPlugin] : [],
        external: isBrowser ? [] : nodeBuiltIns,
        inject: build.inject || []
    };
}
