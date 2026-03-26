import {
    createMeshApp,
    LoggerModule,
    BrokerModule,
    LogLevel,
    IServiceBroker,
    PrettyLogger
} from '@flybyme/isomorphic-core';
import { RegistryModule } from '@flybyme/isomorphic-registry';
import { NetworkModule, WSTransport, JSONSerializer } from '@flybyme/isomorphic-mesh';
import { TelemetryModule } from '@flybyme/isomorphic-telemetry';
import { CompilerService, ManifestService } from '@flybyme/isomorphic-compiler';
import { DeliveryService } from '@flybyme/isomorphic-cdn';
import { MockDatabaseAdapter } from '@flybyme/isomorphic-database';
import * as path from 'path';

async function main() {
    const logger = new PrettyLogger();
    console.log('[E2E-Orchestrator] 🚀 Booting Mesh for UI Tests...');

    // 1. Gateway Node (Port 5020)
    const gatewayApp = createMeshApp({
        nodeID: 'e2e-gateway',
        modules: [
            new LoggerModule(LogLevel.INFO),
            new TelemetryModule({ enableLogging: false }),
            new BrokerModule(),
            new RegistryModule(),
            new NetworkModule({
                transports: [new WSTransport(new JSONSerializer(), 5020)],
                port: 5020
            })
        ]
    });

    gatewayApp.registerProvider('database:adapter', new MockDatabaseAdapter());
    gatewayApp.registerProvider('database:config', { enforceTenancy: false });

    await gatewayApp.start();
    const gatewayBroker = gatewayApp.getProvider<IServiceBroker>('broker');

    // 2. Worker Node (Port 5021) - Hosts Compiler & Manifest
    const workerApp = createMeshApp({
        nodeID: 'e2e-worker',
        modules: [
            new LoggerModule(LogLevel.ERROR),
            new TelemetryModule({ enableLogging: false }),
            new BrokerModule(),
            new RegistryModule(),
            new NetworkModule({
                transports: [new WSTransport(new JSONSerializer(), 5021)],
                bootstrapNodes: ['ws://127.0.0.1:5020']
            })
        ]
    });

    workerApp.registerProvider('database:adapter', new MockDatabaseAdapter());
    workerApp.registerProvider('database:config', { enforceTenancy: false });

    await workerApp.start();

    // 3. Register Services
    const compiler = new CompilerService();
    const manifest = new ManifestService();
    const delivery = new DeliveryService();

    await workerApp.registerService(compiler);
    await workerApp.registerService(manifest);
    await gatewayApp.registerService(delivery);

    if (compiler.started) await compiler.started();
    if (manifest.started) await manifest.started();
    if (delivery.started) await delivery.started();

    console.log('[E2E-Orchestrator] 🌍 CDN Delivery Service started on port 3000');

    // 4. Wait for Service Discovery
    await gatewayApp.registry.waitForService('mesh.manifest', 5000);
    await gatewayApp.registry.waitForService('mesh.compiler', 5000);

    // 5. Trigger Initial Build for the E2E Test App
    const manifestPath = path.resolve(__dirname, 'test.manifest.ts');
    console.log(`[E2E-Orchestrator] 🔨 Building test app from: ${manifestPath}`);
    
    try {
        const result: any = await gatewayBroker.call('mesh.compiler.build_from_path', {
            manifestPath,
            watch: false // No need for watch in one-off E2E runs unless we want it
        });
        console.log(`[E2E-Orchestrator] 📦 Build completed (ID: ${result.buildId})`);
    } catch (err) {
        console.error('[E2E-Orchestrator] ❌ Build failed:', err);
        process.exit(1);
    }

    console.log('[E2E-Orchestrator] ✅ Ready for Playwright.');

    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('\n[E2E-Orchestrator] 🛑 Shutting down...');
        await gatewayApp.stop();
        await workerApp.stop();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('[E2E-Orchestrator] 💥 Fatal Error:', err);
    process.exit(1);
});
