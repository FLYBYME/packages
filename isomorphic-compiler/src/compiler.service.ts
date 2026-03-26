import { 
    ILogger, 
    IServiceBroker,
    IContext
} from '@flybyme/isomorphic-core';
import { DatabaseMixin } from '@flybyme/isomorphic-database';
import { BuildTable } from './compiler.db';
import { BootClientParamsSchema, PromoteBuildParamsSchema, BuildFromPathParamsSchema } from './compiler.schema';
import { SiteManifestSchema } from '@flybyme/isomorphic-core';
import { boot_client } from './actions/boot_client';
import { build_from_path } from './actions/build_from_path';
import { process_build } from './actions/process_build';
import { promote_build } from './actions/promote_build';
import { ssr_render } from './actions/ssr_render';
import { ICompilerService } from './compiler.interface';
import './compiler.contract';
import { z } from 'zod';

/**
 * CompilerService
 * The "Forge" for the mesh ecosystem.
 */
export class CompilerService extends DatabaseMixin(BuildTable)(class {}) {
    public readonly name = 'mesh.compiler';
    public logger!: ILogger;
    public broker!: IServiceBroker;

    public actions = {
        boot_client: {
            params: BootClientParamsSchema,
            handler: this.boot_client.bind(this)
        },
        build_from_path: {
            params: BuildFromPathParamsSchema,
            handler: this.build_from_path.bind(this)
        },
        process_build: {
            params: z.object({ buildId: z.string(), appId: z.string(), manifestId: z.string(), manifest: SiteManifestSchema, watch: z.boolean().optional() }),
            handler: this.process_build.bind(this)
        },
        promote_build: {
            params: PromoteBuildParamsSchema,
            handler: this.promote_build.bind(this)
        },
        ssr_render: {
            params: z.object({ componentPath: z.string(), props: z.record(z.any()).optional() }),
            handler: this.ssr_render.bind(this)
        }
    };

    /**
     * boot_client
     */
    async boot_client(ctx: IContext<z.infer<typeof BootClientParamsSchema>>) {
        return boot_client.call(this as unknown as ICompilerService, ctx);
    }

    /**
     * build_from_path
     */
    async build_from_path(ctx: IContext<z.infer<typeof BuildFromPathParamsSchema>>) {
        return build_from_path.call(this as unknown as ICompilerService, ctx);
    }

    /**
     * process_build
     */
    async process_build(ctx: IContext<{ buildId: string; appId: string; manifestId: string; manifest: z.infer<typeof SiteManifestSchema>; watch?: boolean }>) {
        return process_build.call(this as unknown as ICompilerService, ctx);
    }

    /**
     * promote_build
     */
    async promote_build(ctx: IContext<z.infer<typeof PromoteBuildParamsSchema>>) {
        return promote_build.call(this as unknown as ICompilerService, ctx);
    }

    /**
     * ssr_render
     */
    async ssr_render(ctx: IContext<{ componentPath: string; props?: Record<string, unknown> }>) {
        return ssr_render.call(this as unknown as ICompilerService, ctx);
    }

    async started() {
        this.logger.info('[mesh.compiler] Forge Compiler Service started.');
    }
}

export default CompilerService;
