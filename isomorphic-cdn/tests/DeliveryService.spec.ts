import { MeshApp, BrokerModule, IServiceBroker } from '@flybyme/isomorphic-core';
import { DeliveryService } from '../src/delivery.service';
import { z } from 'zod';

describe('DeliveryService', () => {
    let app: MeshApp;

    beforeEach(async () => {
        app = new MeshApp({ nodeID: 'test-node' });
        app.use(new BrokerModule());
        await app.start();

        const broker = app.getProvider<IServiceBroker>('broker');
        
        // Mock the manifest service by registering a simple service
        await broker.registerService({
            name: 'mesh.manifest',
            actions: {
                get: {
                    params: z.object({ appId: z.string() }),
                    handler: async () => ({
                        app: { id: 'test-app', name: 'Test' },
                        i18n: { defaultLocale: 'en' }
                    })
                }
            }
        });

        await app.registerService(new DeliveryService());
    });

    afterEach(async () => {
        await app.stop();
    });

    test('should render an application with injected environment', async () => {
        const res = await app.getProvider<IServiceBroker>('broker').call('cdn.delivery.render', { appId: 'test-app' }) as any;
        expect(res.html).toContain('window.__MESH_ENV__');
        expect(res.html).toContain('test-app');
    });
});
