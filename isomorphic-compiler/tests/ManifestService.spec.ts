import { MeshApp, BrokerModule, SiteManifest } from '@flybyme/isomorphic-core';
import { DatabaseModule, MockDatabaseAdapter } from '@flybyme/isomorphic-database';
import { ManifestService } from '../src/manifest.service';

describe('ManifestService', () => {
    let app: MeshApp;
    let service: ManifestService;

    const mockManifest: any = {
        app: {
            id: 'test-app',
            name: 'Test App',
            shortName: 'Test',
            themeColor: '#000000',
            background: '#ffffff',
            display: 'standalone',
            icons: [],
            seo: {
                defaultTitle: 'Test',
                titleTemplate: '%s | Test',
                defaultDescription: 'Test app'
            }
        },
        mesh: { 
            network: { endpoints: [] },
            telemetry: { logLevel: 'info' }
        },
        state: { stores: [] },
        security: {
            authProvider: 'jwt',
            unauthorizedRedirectPath: '/login'
        },
        telemetry: {},
        routing: {
            notFoundComponent: 'NotFound',
            errorBoundaryComponent: 'Error',
            routes: []
        },
        navigation: { main: [], userMenu: [] },
        i18n: { defaultLocale: 'en', supportedLocales: ['en'] }
    };

    beforeEach(async () => {
        app = new MeshApp({ nodeID: 'test-node' });
        app.use(new BrokerModule());
        app.use(new DatabaseModule({ adapterType: 'mock', enforceTenancy: false }));
        
        await app.start();
        service = new ManifestService();
        await app.registerService(service);
    });

    afterEach(async () => {
        await app.stop();
    });

    it('should register a manifest', async () => {
        const res = await app.getProvider<any>('broker').call('mesh.manifest.register', mockManifest, { meta: { tenant_id: 'test-tenant' } });
        expect(res.success).toBe(true);
        expect(res.appId).toBe('test-app');
    });

    it('should retrieve a registered manifest', async () => {
        await app.getProvider<any>('broker').call('mesh.manifest.register', mockManifest, { meta: { tenant_id: 'test-tenant' } });
        const manifest = await app.getProvider<any>('broker').call('mesh.manifest.resolve', { appId: 'test-app' }, { meta: { tenant_id: 'test-tenant' } });
        expect(manifest).toBeDefined();
        expect(manifest.app.id).toBe('test-app');
    });
});
