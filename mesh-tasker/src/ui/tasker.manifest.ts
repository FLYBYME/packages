import { SiteManifest } from '@flybyme/isomorphic-core';
import { Dashboard } from './pages/Dashboard';
import { ComponentDemo } from './pages/ComponentDemo';
import { Settings } from './pages/Settings';

export const TaskerManifest: SiteManifest = {
    app: {
        id: 'default',
        name: 'Mesh Tasker Board',
        shortName: 'Tasker',
        themeColor: '#4f46e5',
        background: '#020617',
        display: 'standalone',
        icons: [],
        seo: {
            defaultTitle: 'Mesh Tasker',
            titleTemplate: '%s | Mesh Tasker',
            defaultDescription: 'Real-time distributed task management'
        },
        namespace: 'tasker'
    },
    design: {
        tokens: {
            colors: {
                primary: '#4f46e5',
                secondary: '#64748b',
                dark: '#0f172a',
                light: '#f8fafc',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#06b6d4',
                background: '#020617',
                elevated: '#1e293b',
                text: '#f8fafc',
                muted: '#94a3b8'
            },
            spacing: {
                xs: '4px',
                sm: '8px',
                md: '16px',
                lg: '24px',
                xl: '32px'
            },
            typography: {
                sizes: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    md: '1rem',
                    lg: '1.25rem',
                    xl: '1.5rem'
                },
                fonts: {
                    body: 'Inter, sans-serif',
                    heading: 'Outfit, sans-serif',
                    mono: 'monospace'
                }
            }
        }
    },
    assets: {
        globalStyles: [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
            'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather-icons.css'
        ]
    },
    build: {
        minify: false,
        sourcemap: true,
        srcDir: '/home/ubuntu/code/packages/mesh-tasker',
        entryPoint: './src/ui/client.ts',
        ssr: false
    },
    mesh: {
        network: {
            endpoints: [{ url: 'http://192.168.1.21:5020', type: 'ws', priority: 1 }]
        },
        telemetry: {
            logLevel: 'info',
            logging: {
                enabled: true,
                drains: ['mesh']
            },
            metrics: {
                enabled: true,
                console: { enabled: true, intervalMs: 60000 }
            },
            tracing: {
                enabled: true,
                exporters: ['console']
            }
        },
    },
    state: {
        stores: [{ name: 'tasks', initial: [], persistence: 'indexedDB' }]
    },
    security: {
        authProvider: 'jwt',
        unauthorizedRedirectPath: '/login'
    },
    routing: {
        notFoundComponent: './src/ui/pages/NotFound.ts',
        errorBoundaryComponent: './src/ui/pages/CrashScreen.ts',
        routes: [
            {
                path: '/',
                component: Dashboard,
                meta: { layout: 'dashboard', title: 'Task Board' }
            },
            {
                path: '/components',
                component: ComponentDemo,
                meta: { layout: 'dashboard', title: 'Component Library' }
            },
            {
                path: '/settings',
                component: Settings,
                meta: { layout: 'dashboard', title: 'Settings' }
            }
        ]
    },
    navigation: {
        main: [
            { label: 'Task Board', path: '/', icon: 'layout' },
            { label: 'UI Components', path: '/components', icon: 'box' },
            { label: 'Settings', path: '/settings', icon: 'settings' }
        ],
        userMenu: []
    },
    i18n: {
        defaultLocale: 'en',
        supportedLocales: ['en']
    },
    initialState: {
        tasks: [],
        session: null
    }
};
