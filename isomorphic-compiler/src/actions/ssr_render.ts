import { IContext } from '@flybyme/isomorphic-core';
import * as path from 'path';
import * as fs from 'fs';
import { ICompilerService } from '../compiler.interface';
import { BrokerDOM, ReactiveState, IBaseUIProps } from '@flybyme/isomorphic-ui';

export async function ssr_render(
    this: ICompilerService,
    ctx: IContext<{ componentPath: string; props?: IBaseUIProps }>
) {
    const { componentPath, props = {} } = ctx.params;

    // Phase 7: Ensure minimal UI context exists for the render
    try {
        BrokerDOM.getBroker();
    } catch {
        // Initialize minimal shim for SSR process
        BrokerDOM.initialize(this.broker, null as never, new ReactiveState(props));
    }

    // Resolve absolute path
    const absolutePath = path.isAbsolute(componentPath)
        ? componentPath
        : path.resolve(process.cwd(), componentPath);

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Component file not found: ${absolutePath}`);
    }

    // Ensure ts-node is registered with maximum speed settings
    if (!(process as unknown as Record<string, unknown>)[Symbol.for('ts-node.register.instance') as unknown as string]) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('ts-node').register({
            transpileOnly: true,
            skipProject: true,
            compilerOptions: {
                module: 'commonjs',
                target: 'es2020',
                allowJs: true,
                skipLibCheck: true
            }
        });

        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('tsconfig-paths/register');
        } catch { /* ignore */ }
    }

    // Load component
    const startTime = Date.now();
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require(absolutePath);

        // Find component class (default or named export)
        let ComponentClass = module.default || Object.values(module).find(v => typeof v === 'function' && v.prototype?.renderToString);

        if (!ComponentClass && typeof module === 'function') {
            ComponentClass = module;
        }

        if (!ComponentClass) {
            throw new Error(`No valid BrokerComponent found in ${componentPath}`);
        }

        const instance = new ComponentClass(props);

        if (typeof instance.renderToString !== 'function') {
            throw new Error(`Component does not implement renderToString: ${componentPath}`);
        }

        const html = instance.renderToString();
        this.logger.debug(`[mesh.compiler] SSR Render completed in ${Date.now() - startTime}ms: ${componentPath}`);
        return html;
    } catch (err) {
        this.logger.error(`[mesh.compiler] SSR Render failed for ${componentPath}:`, { error: err instanceof Error ? err.message : String(err) });
        throw err;
    }
}
