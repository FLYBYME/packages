import { z } from 'zod';
import {
    BootClientParamsSchema,
    WatchClientParamsSchema,
    PromoteBuildParamsSchema
} from './compiler.schema';
import { SiteManifestSchema } from '@flybyme/isomorphic-core';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        /**
         * The Bundler Action.
         * Triggers a cold build of the manifest in a worker thread.
         */
        'mesh.compiler.boot_client': {
            params: z.infer<typeof BootClientParamsSchema>;
            returns: { success: boolean; indexUrl: string; buildId: string; buildDir: string; error?: string };
        };

        /**
         * Internal Build Processor.
         */
        'mesh.compiler.process_build': {
            params: { 
                buildId: string; 
                appId: string; 
                manifestId: string; 
                manifest: z.infer<typeof SiteManifestSchema>;
                watch?: boolean;
                buildDir: string;
            };
            returns: { success: boolean };
        };

        /**
         * The Development Watcher.
         */
        'mesh.compiler.watch_client': {
            params: z.infer<typeof WatchClientParamsSchema>;
            returns: { success: boolean; sessionId: string };
        };

        /**
         * Promote Build to Production.
         */
        'mesh.compiler.promote_build': {
            params: z.infer<typeof PromoteBuildParamsSchema>;
            returns: { success: boolean; appId: string; activeBuildId: string };
        };

        /**
         * Register a Site Manifest.
         */
        'mesh.manifest.register': {
            params: z.infer<typeof SiteManifestSchema>;
            returns: { success: boolean; appId: string };
        };

        /**
         * Get a Site Manifest.
         */
        'mesh.manifest.get': {
            params: { appId: string };
            returns: z.infer<typeof SiteManifestSchema>;
        };

        /**
         * Build from path.
         */
        'mesh.compiler.build_from_path': {
            params: { manifestPath: string, watch?: boolean, outputPath?: string };
            returns: { success: boolean; appId: string; buildId: string; buildDir: string; indexUrl: string };
        };

        /**
         * Update Build Status.
         */
        'mesh.compiler.update': {
            params: { 
                id: string; 
                status: 'running' | 'success' | 'failed'; 
                errorLog?: string; 
                durationMs?: number; 
                assets?: string;
                indexUrl?: string; 
                buildDir?: string 
            };
            returns: { success: boolean };
        };
    }
}
