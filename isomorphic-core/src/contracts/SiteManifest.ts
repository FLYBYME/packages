import { z } from 'zod';

// --- Navigation & Menus ---

export type NavigationItem = {
    label: string;
    path?: string;
    icon?: string;
    roles?: string[];
    children?: NavigationItem[];
};

export const NavigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() => z.object({
    label: z.string(),
    path: z.string().optional(),
    icon: z.string().optional(),
    roles: z.array(z.string()).optional(),
    children: z.array(NavigationItemSchema).optional(),
}));

export const NavigationSchema = z.object({
    main: z.array(NavigationItemSchema),
    userMenu: z.array(NavigationItemSchema),
});

export type NavigationConfig = z.infer<typeof NavigationSchema>;

// --- Identity & PWA ---

export const AppIconSchema = z.object({
    src: z.string(),
    sizes: z.string(),
    type: z.string(),
    purpose: z.enum(['any', 'maskable', 'monochrome']).optional(),
});

export type AppIcon = z.infer<typeof AppIconSchema>;

export const AppSeoConfigSchema = z.object({
    defaultTitle: z.string(),
    titleTemplate: z.string(),
    defaultDescription: z.string(),
    openGraph: z.object({
        type: z.string(),
        siteName: z.string(),
        defaultImage: z.string().optional(),
    }).optional(),
});

export type AppSeoConfig = z.infer<typeof AppSeoConfigSchema>;

export const AppIdentityConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    themeColor: z.string(),
    background: z.string(),
    display: z.enum(['fullscreen', 'standalone', 'minimal-ui', 'browser']),
    icons: z.array(AppIconSchema),
    seo: AppSeoConfigSchema,
    namespace: z.string().optional(),
});

export type AppIdentityConfig = z.infer<typeof AppIdentityConfigSchema>;

// --- Network & Mesh Topology ---

export const NetworkEndpointSchema = z.object({
    url: z.string(),
    type: z.enum(['ws', 'http', 'tcp', 'nats']),
    priority: z.number(),
});

export type NetworkEndpoint = z.infer<typeof NetworkEndpointSchema>;

export const OfflineStrategyConfigSchema = z.object({
    strategy: z.enum(['queue-and-replay', 'cache-first', 'drop']),
    maxQueueSize: z.number(),
    whitelistActions: z.array(z.string()).optional(),
    onSyncConflict: z.enum(['server-wins', 'client-wins', 'manual']),
});

export type OfflineStrategyConfig<TActionKeys = string> = z.infer<typeof OfflineStrategyConfigSchema> & {
    whitelistActions?: TActionKeys[];
};

export const NetworkConfigSchema = z.object({
    endpoints: z.array(NetworkEndpointSchema),
    offline: OfflineStrategyConfigSchema.optional(),
});

export type NetworkConfig<TActionKeys = string> = {
    endpoints: NetworkEndpoint[];
    offline?: OfflineStrategyConfig<TActionKeys>;
};

// --- Reactive State & Persistence ---

export const StoragePersistenceSchema = z.enum(['localStorage', 'sessionStorage', 'indexedDB', 'memory']);
export type StoragePersistence = z.infer<typeof StoragePersistenceSchema>;

export const StateStoreDefinitionSchema = z.object({
    name: z.string(),
    initial: z.unknown(),
    persistence: StoragePersistenceSchema,
    encrypt: z.boolean().optional(),
    ttlMs: z.number().optional(),
});

export type StateStoreDefinition<TStateKeys = string> = z.infer<typeof StateStoreDefinitionSchema> & {
    name: TStateKeys;
};

export const StateManifestConfigSchema = z.object({
    engine: z.enum(['reactive', 'snapshot']).optional(),
    stores: z.array(StateStoreDefinitionSchema),
});

export type StateManifestConfig<TStateKeys = string> = {
    engine?: 'reactive' | 'snapshot';
    stores: StateStoreDefinition<TStateKeys>[];
};

// --- Build & Optimization (Compiler Directives) ---

export const esbuildLoaderSchema = z.enum(['js', 'jsx', 'ts', 'tsx', 'css', 'json', 'text', 'base64', 'file', 'dataurl', 'binary', 'copy']);
export type esbuildLoader = z.infer<typeof esbuildLoaderSchema>;

export const BuildOptionsSchema = z.object({
    target: z.string().optional(),
    format: z.enum(['esm', 'iife', 'cjs']).optional(),
    splitting: z.boolean().optional(),
    minify: z.boolean().optional(),
    sourcemap: z.boolean().optional(),
    publicPath: z.string().optional(),
    loaders: z.record(esbuildLoaderSchema).optional(),
    aliases: z.record(z.string()).optional(),
    define: z.record(z.string()).optional(),
    inject: z.array(z.string()).optional(),
    drop: z.array(z.enum(['console', 'debugger'])).optional(),
    externals: z.array(z.string()).optional(),
    srcDir: z.string().optional(),
    entryPoint: z.string().optional(),
    ssr: z.boolean().optional(),
    outputPath: z.string().optional(),
});

export type BuildOptions = z.infer<typeof BuildOptionsSchema>;

// --- Static & Styling Asset Management ---

export const AssetOptionsSchema = z.object({
    globalStyles: z.array(z.string()).optional(),
    copyPatterns: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
    assetNames: z.string().optional(),
    customCss: z.string().optional(),
});

export type AssetOptions = z.infer<typeof AssetOptionsSchema>;

// --- HTML Template & Meta Generation ---

export const HtmlOptionsSchema = z.object({
    templatePath: z.string().optional(),
    preload: z.array(z.string()).optional(),
    prefetch: z.array(z.string()).optional(),
    externalScripts: z.array(z.object({
        src: z.string(),
        async: z.boolean().optional(),
        defer: z.boolean().optional(),
        type: z.string().optional(),
    })).optional(),
    metaTags: z.record(z.string()).optional(),
});

export type HtmlOptions = z.infer<typeof HtmlOptionsSchema>;

// --- Routing & Layouts ---

/**
 * Generic constructor for components when direct references are used in the manifest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentConstructor = new (...args: any[]) => any;

export const RouteConfigSchema = z.object({
    path: z.string(),
    component: z.union([z.string(), z.unknown()]),
    remoteUrl: z.string().optional(),
    layout: z.string().optional(),
    meta: z.object({
        title: z.string().optional(),
        layout: z.string().optional(),
        breadcrumbs: z.array(z.object({
            label: z.string(),
            route: z.string().optional(),
        })).optional(),
        requiresAuth: z.boolean().optional(),
    }).optional(),
    requireAuth: z.boolean().optional(),
    requireRoles: z.array(z.string()).optional(),
    lazyStrategy: z.enum(['route', 'viewport', 'idle', 'eager']).optional(),
    prefetch: z.object({
        onHover: z.boolean().optional(),
        onEnter: z.string().optional(),
    }).optional(),
    chunkBoundary: z.boolean().optional(),
    bundleWith: z.string().optional(),
});

export type RouteConfig<TRoles = string, TLayouts = string, TComponent = ComponentConstructor> = {
    path: string;
    component: string | TComponent;
    remoteUrl?: string;
    layout?: TLayouts;
    meta?: {
        title?: string;
        layout?: TLayouts;
        breadcrumbs?: Array<{ label: string, route?: string }>;
        requiresAuth?: boolean;
    };
    requireAuth?: boolean;
    requireRoles?: TRoles[];
    lazyStrategy?: 'route' | 'viewport' | 'idle' | 'eager';
    prefetch?: {
        onHover?: boolean;
        onEnter?: string;
    };
    chunkBoundary?: boolean;
    bundleWith?: string;
};

export const RoutingConfigSchema = z.object({
    notFoundComponent: z.union([z.string(), z.unknown()]),
    errorBoundaryComponent: z.union([z.string(), z.unknown()]),
    routes: z.array(RouteConfigSchema),
});

export type RoutingConfig<TRoles = string, TLayouts = string, TComponent = ComponentConstructor> = {
    notFoundComponent: string | TComponent;
    errorBoundaryComponent: string | TComponent;
    routes: RouteConfig<TRoles, TLayouts, TComponent>[];
};

// --- Design System & Theming ---

export const IDesignTokensSchema = z.object({
    colors: z.record(z.string()),
    spacing: z.record(z.string()),
    typography: z.object({
        fonts: z.record(z.string()),
        sizes: z.record(z.string()),
    }),
    breakpoints: z.record(z.string()),
    shadows: z.record(z.string()),
});

export type IDesignTokens = z.infer<typeof IDesignTokensSchema>;

export const IDesignSystemSchema = z.object({
    tokens: IDesignTokensSchema,
    components: z.record(z.object({
        base: z.string().optional(),
        variants: z.record(z.string()).optional(),
        sizes: z.record(z.string()).optional(),
    })).optional(),
});

export type IDesignSystem = z.infer<typeof IDesignSystemSchema>;

// --- Master Manifest ---

export const MeshConfigSchema = z.object({
    network: NetworkConfigSchema,
    telemetry: z.object({
        logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
        logging: z.object({
            enabled: z.boolean().optional(),
            drains: z.array(z.union([z.enum(['console', 'mesh']), z.object({ name: z.string(), push: z.function() })])).optional(),
        }).optional(),
        metrics: z.object({
            enabled: z.boolean().optional(),
            console: z.object({ enabled: z.boolean(), intervalMs: z.number().optional() }).optional(),
            prometheus: z.object({ enabled: z.boolean(), path: z.string().optional() }).optional(),
            datadog: z.object({ enabled: z.boolean(), apiKey: z.string(), intervalMs: z.number().optional() }).optional(),
        }).optional(),
        tracing: z.object({
            enabled: z.boolean().optional(),
            exporters: z.array(z.union([z.enum(['jaeger', 'zipkin', 'console']), z.object({ export: z.function() })])).optional(),
            jaegerEndpoint: z.string().optional(),
            zipkinEndpoint: z.string().optional(),
            flushIntervalMs: z.number().optional(),
        }).optional(),
        enableLogging: z.boolean().optional(),
        crashReporting: z.object({
            enabled: z.boolean(),
            endpointAction: z.string(),
        }).optional(),
    }),
});

export const SiteManifestSchema = z.object({
    app: AppIdentityConfigSchema,
    design: IDesignSystemSchema.optional(),
    mesh: MeshConfigSchema.optional(),
    state: StateManifestConfigSchema,
    build: BuildOptionsSchema.optional(),
    assets: AssetOptionsSchema.optional(),
    html: HtmlOptionsSchema.optional(),
    security: z.object({
        authProvider: z.enum(['jwt', 'oauth2', 'custom']).optional(),
        unauthorizedRedirectPath: z.string().optional(),
    }),
    routing: RoutingConfigSchema,
    navigation: NavigationSchema,
    i18n: z.object({
        defaultLocale: z.string(),
        supportedLocales: z.array(z.string()),
    }),
    initialState: z.record(z.unknown()).optional(),
});

export type SiteManifest<
    TRoles = string,
    TStateKeys = string,
    TLayouts = string,
    TActionKeys = string,
    TComponent = ComponentConstructor
> = {
    app: AppIdentityConfig;
    design?: IDesignSystem;
    mesh: {
        network: NetworkConfig<TActionKeys>;
        telemetry: {
            logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
            logging?: {
                enabled?: boolean;
                drains?: Array<'console' | 'mesh' | { name: string, push: (entry: unknown) => void }>;
            };
            metrics?: {
                enabled?: boolean;
                console?: { enabled: boolean; intervalMs?: number };
                prometheus?: { enabled: boolean; path?: string };
                datadog?: { enabled: boolean; apiKey: string; intervalMs?: number };
            };
            tracing?: {
                enabled?: boolean;
                exporters?: Array<'jaeger' | 'zipkin' | 'console' | { name: string, export: (spans: unknown[]) => Promise<void> }>;
                jaegerEndpoint?: string;
                zipkinEndpoint?: string;
                flushIntervalMs?: number;
            };
            enableLogging?: boolean;
            crashReporting?: {
                enabled: boolean;
                endpointAction: TActionKeys;
            };
        };
    };
    state: StateManifestConfig<TStateKeys>;
    build?: BuildOptions;
    assets?: AssetOptions;
    html?: HtmlOptions;
    security: {
        authProvider?: 'jwt' | 'oauth2' | 'custom';
        unauthorizedRedirectPath?: string;
    };
    routing: RoutingConfig<TRoles, TLayouts, TComponent>;
    navigation: NavigationConfig;
    i18n: {
        defaultLocale: string;
        supportedLocales: string[];
    };
    initialState?: Record<string, unknown>;
};

export const SiteManifestRecordSchema = z.object({
    id: z.string(),
    appId: z.string(),
    data: SiteManifestSchema,
    version: z.number(),
    createdAt: z.number(),
    updatedAt: z.number()
});

export type SiteManifestRecord = z.infer<typeof SiteManifestRecordSchema>;
