import { SiteManifest } from '@flybyme/isomorphic-core';

export function synthesize_bootstrap(manifest: SiteManifest): string {
    return `
import { createMeshApp, BrokerModule } from '@flybyme/isomorphic-core';
import { NetworkModule, WSTransport, JSONSerializer } from '@flybyme/isomorphic-mesh';

const manifest = ${JSON.stringify(manifest)};

async function bootstrap() {
    const app = createMeshApp({
        nodeID: manifest.app.id || 'client-node',
        modules: [
            new BrokerModule()
        ]
    });

    const targetUri = manifest.mesh?.network?.endpoints?.[0]?.url || 'ws://192.168.1.21:5020';
    const serializer = new JSONSerializer();
    
    // Connect to the gateway via WebSocket
    const wsTransport = new WSTransport(serializer, targetUri);

    app.use(new NetworkModule({
        transports: [wsTransport],
        bootstrapNodes: [targetUri]
    }));

    try {
        await app.start();
        console.log('[MeshApp] Core network runtime initialized for ' + manifest.app.name);

        // Expose the app and broker globally for the UI layer to consume
        window.$mesh = app;
        window.$broker = app.getProvider('broker');
        window.$manifest = manifest;

        // Dispatch an event so the UI framework knows it can start interacting with the mesh
        window.dispatchEvent(new CustomEvent('mesh:ready', { 
            detail: { app, broker: window.$broker, manifest } 
        }));
    } catch (err) {
        console.error('[MeshApp] Failed to start core network:', err);
    }
}

bootstrap();
`;
}