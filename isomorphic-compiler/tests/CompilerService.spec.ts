import { MeshApp, BrokerModule } from '@flybyme/isomorphic-core';
import { DatabaseModule, MockDatabaseAdapter } from '@flybyme/isomorphic-database';
import { CompilerService } from '../src/compiler.service';
import { ManifestService } from '../src/manifest.service';

describe('CompilerService', () => {
    let app: MeshApp;

    beforeEach(async () => {
        app = new MeshApp({ nodeID: 'test-node' });
        app.use(new BrokerModule());
        app.use(new DatabaseModule({ adapterType: 'mock' }));
        
        await app.start();
        await app.registerService(new ManifestService());
        await app.registerService(new CompilerService());
    });

    afterEach(async () => {
        await app.stop();
    });

    it('should initialize a build (boot_client)', async () => {
        const testManifest: any = {
        app: { 
            id: 'test-app', 
            name: 'Test App',
            shortName: 'Test',
            themeColor: '#000000',
            background: '#ffffff',
            display: 'standalone',
            icons: [],
            seo: {
                defaultTitle: 'Test App',
                titleTemplate: '%s | Test App',
                defaultDescription: 'A test application'
            }
        },
        mesh: { 
            network: { endpoints: [] },
            telemetry: { logLevel: 'info' }
        },
        state: { stores: [] },
        security: { },
        telemetry: { },
        routing: {
            routes: [],
            notFoundComponent: 'NotFound',
            errorBoundaryComponent: 'Error'
        },
        navigation: { main: [], userMenu: [] },
        i18n: { defaultLocale: 'en', supportedLocales: ['en'] }
    };

        const res = await app.getProvider<any>('broker').call('mesh.compiler.boot_client', {
            appId: 'test-app',
            manifest: testManifest
        }) as any;
        expect(res.appId).toBe('test-app');
        expect(res.buildId).toBeDefined();

        // Wait a bit for the background process to complete to avoid late logs
        await new Promise(resolve => setTimeout(resolve, 500));
    });
});
