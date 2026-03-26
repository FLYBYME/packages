import { spawn } from 'child_process';
import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createMeshApp, IServiceBroker, LogLevel } from '@flybyme/isomorphic-core';

/**
 * mesh-dev command.
 * Boots all packages in the monorepo using their build/dev scripts.
 * Refactored for Phase 5: Continuous Build Watcher & Compiler RPC.
 */
export async function runDevMode(packages: string[]) {
    console.log(chalk.cyan('🚀 Starting Mesh Monorepo in Dev Mode...\n'));

    // 1. Initialize a temporary broker to communicate with the compiler
    const devApp = createMeshApp({
        nodeID: 'mesh-cli-dev-watcher',
        logLevel: LogLevel.INFO
    });

    try {
        await devApp.start();
        await devApp.getProvider<IServiceBroker>('broker');
        console.log(chalk.green('✓ CLI Watcher connected to mesh broker.'));

        // 2. Start package watchers (Legacy behavior)
        packages.forEach(pkg => {
            const proc = spawn('npm', ['run', 'build', '--', '--watch'], {
                cwd: pkg,
                shell: true
            });

            const pkgName = pkg.split('/').pop();

            proc.stdout.on('data', (data) => {
                console.log(chalk.gray(`[${pkgName}] `) + data.toString().trim());
            });

            proc.stderr.on('data', (data) => {
                console.error(chalk.red(`[${pkgName}] `) + data.toString().trim());
            });
        });

        // 3. Initialize High-Level Watcher for UI & Apps
        const watchDirs = [
            path.resolve(process.cwd(), 'packages/isomorphic-ui/src'),
            // Add other relevant app directories here if needed
        ];

        console.log(chalk.yellow(`[Watch] Monitoring UI & App directories...`));

        watchDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                let timeout: NodeJS.Timeout;
                fs.watch(dir, { recursive: true }, async (eventType, filename) => {
                    // Debounce rebuilds to avoid thrashing
                    clearTimeout(timeout);
                    timeout = setTimeout(async () => {
                        console.log(chalk.yellow(`\n[Watch] Change detected: ${filename}`));
                        Date.now();

                        try {
                            // Trigger Compiler Boot (re-bundle the UI)
                            // console.log(chalk.blue(`[Compiler] Dispatching build request for ${DXManifest.app.id}...`));
                            
                            // const result = await broker.call<{ success: boolean; buildId?: string; error?: string }>('mesh.compiler.boot_client', {
                            //     manifest: DXManifest
                            // });

                            // if (result.success && result.buildId) {
                            //     console.log(chalk.green(`✓ Build Queued (ID: ${result.buildId})`));
                                
                            //     // Optional: In a full implementation, we'd wait for '$dev.build.finished'
                            //     // For now, we promote immediately if the compiler supports it or wait.
                            //     await broker.call('mesh.compiler.promote_build', { buildId: result.buildId });
                            //     console.log(chalk.green(`✓ Build Promoted to production. (${Date.now() - start}ms)`));
                            // } else {
                            //     console.log(chalk.red(`✘ Compiler failed: ${result.error || 'Check compiler logs.'}`));
                            // }
                        } catch (err: unknown) {
                            console.log(chalk.red(`✘ RPC Failed: ${(err as Error).message}`));
                        }
                    }, 1000);
                });
            }
        });

    } catch (err: unknown) {
        console.error(chalk.red('\n✘ CLI Watcher crashed:'), err);
        process.exit(1);
    }
}
