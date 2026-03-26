import { SiteManifest as CoreSiteManifest } from '@flybyme/isomorphic-core';
import type { IServiceActionRegistry, IServiceEventRegistry } from '@flybyme/isomorphic-core';

export type SiteManifest = CoreSiteManifest;
export type RouteConfig = CoreSiteManifest['routing']['routes'][number];

export type { IServiceActionRegistry, IServiceEventRegistry };

/**
 * Defines the standard roles and layouts for this specific instance.
 * These act as the "Source of Truth" for the application's domain.
 */
export type AppRoles = 'admin' | 'operator' | 'guest';
export type AppLayouts = 'default' | 'minimal' | 'sidebar';
export type AppStateKeys = 'session' | 'theme' | 'notifications';

export interface AppSeoConfig {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription?: string;
    canonical?: string;
}

/**
 * Extract Action Keys from the global registry to ensure zero-inference safety.
 */
export type ActionKeys = keyof IServiceActionRegistry & string;
export type EventKeys = keyof IServiceEventRegistry & string;

/**
 * A concrete instantiation of the manifest for this project.
 * Uses the specific roles, state keys, and layouts defined above.
 */
export type AppManifest = SiteManifest;

/**
 * Interface for the Manifest Compiler/Bootstrapper
 */
export interface IManifestCompiler {
    /**
     * Validates the manifest against runtime constraints and schemas.
     */
    validate(manifest: AppManifest): boolean;

    /**
     * Bootstraps the application using the provided manifest.
     * This initializes the broker, state stores, and router.
     */
    boot(manifest: AppManifest): Promise<void>;
}

/**
 * Helper to define a manifest with full type inference.
 * Usage: const manifest = defineManifest({ ... });
 */
export function defineManifest(manifest: AppManifest): AppManifest {
    return manifest;
}