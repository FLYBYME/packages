import { generate_index_html } from '../src/methods/generate_index_html';
import { SiteManifest } from '@flybyme/isomorphic-core';

describe('HTML Generation', () => {
    const mockManifest: SiteManifest = {
        app: {
            id: 'test',
            name: 'Test App',
            shortName: 'Test',
            themeColor: '#000000',
            background: '#ffffff',
            display: 'standalone',
            icons: [],
            seo: {
                defaultTitle: 'Test App',
                titleTemplate: '%s | Test App',
                defaultDescription: 'Description'
            }
        },
        assets: {
            globalStyles: [
                'https://cdn.example.com/style.css',
                'assets/local.css'
            ]
        },
        build: {
            minify: false,
            sourcemap: true,
            srcDir: '.',
            entryPoint: './src/index.ts'
        },
        mesh: { 
            network: { endpoints: [] },
            telemetry: { logLevel: 'info' }
        },
        state: { stores: [] },
        security: { authProvider: 'jwt', unauthorizedRedirectPath: '/login' },
        routing: {
            routes: [],
            notFoundComponent: './NotFound.ts',
            errorBoundaryComponent: './Error.ts'
        },
        navigation: { main: [], userMenu: [] },
        i18n: { defaultLocale: 'en', supportedLocales: ['en'] }
    };

    it('should include global styles and bundle CSS if it exists', () => {
        const bundlePath = './bundle/main.js';
        const assets = ['main.js', 'main.css'];
        const html = generate_index_html(mockManifest, bundlePath, assets);

        expect(html).toContain('<link rel="stylesheet" href="https://cdn.example.com/style.css">');
        expect(html).toContain('<link rel="stylesheet" href="assets/local.css">');
        // Match base URL with potential query parameter (cache buster)
        expect(html).toMatch(/<link rel="stylesheet" href="\.\/bundle\/main\.css(\?v=[\d]+)?">/);
    });

    it('should NOT include bundle CSS if it does not exist', () => {
        const bundlePath = './bundle/main.js';
        const assets = ['main.js'];
        const html = generate_index_html(mockManifest, bundlePath, assets);

        expect(html).toContain('<link rel="stylesheet" href="https://cdn.example.com/style.css">');
        expect(html).toContain('<link rel="stylesheet" href="assets/local.css">');
        expect(html).not.toContain('<link rel="stylesheet" href="./bundle/main.css">');
    });
});
