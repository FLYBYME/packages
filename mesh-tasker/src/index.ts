import {
    createMeshApp,
    BrokerModule,
    IMeshApp,
    SiteManifest
} from '@flybyme/isomorphic-core';
import { RegistryModule } from '@flybyme/isomorphic-registry';
import { NetworkModule, NetworkModuleOptions, WSTransport, JSONSerializer, BaseTransport } from '@flybyme/isomorphic-mesh';
import { AuthModule } from '@flybyme/isomorphic-auth';
import { TelemetryModule } from '@flybyme/isomorphic-telemetry';
import { DatabaseModule } from '@flybyme/isomorphic-database';

import { ILogger } from '@flybyme/isomorphic-core';

export interface MeshTaskerConfig {
    nodeID?: string;
    port?: number;
    role?: string;
    bootstrapNodes?: string[];
    transports?: BaseTransport[];
    dbPath?: string;
    customLogger?: ILogger;
    mesh?: Partial<SiteManifest['mesh']>;
    [key: string]: unknown;
}

/**
 * Unified Mesh Tasker Entry Point.
 * Refactored for Phase 6: Pluggable Transports.
 */
export async function bootstrapMeshTasker(config: MeshTaskerConfig = {}): Promise<IMeshApp> {
    const nodeID = config.nodeID || process.env.NODE_ID || `node-${Math.random().toString(36).substr(2, 5)}`;

    // 1. Instantiate modules
    const registryModule = new RegistryModule({ bucketSize: 20 });
    const authModule = new AuthModule();
    const brokerModule = new BrokerModule();

    // Default to WSTransport (Node version via package.json entry point)
    const serializer = new JSONSerializer();
    const port = config.port !== undefined ? config.port : (Number(process.env.PORT) || 4000);
    const defaultTransports = [new WSTransport(serializer, port)];

    const networkConfig: NetworkModuleOptions = {
        transports: config.transports || defaultTransports,
        bootstrapNodes: config.bootstrapNodes,
        // Only bind port if we are NOT a worker or if explicitly told to
        port: (config.role === 'worker') ? undefined : port,
        ...config.mesh?.network
    };

    const networkModule = new NetworkModule(networkConfig);
    const telemetryModule = new TelemetryModule({ 
        logging: {
            enabled: true,
            drains: ['console', 'mesh']
        },
        isSink: config.role === 'gateway',
        ...config.mesh?.telemetry
    });

    const databaseModule = new DatabaseModule(config.dbPath ? {
        adapterType: 'sqlite',
        adapterConfig: { filename: config.dbPath },
        enforceTenancy: false
    } : {
        adapterType: 'mock',
        enforceTenancy: false
    });

    // 2. Compose the Application
    const app = createMeshApp({
        nodeID,
        modules: [
            telemetryModule,
            brokerModule,
            registryModule,
            authModule,
            networkModule,
            databaseModule
        ]
    });
    
    // 3. Start the application
    await app.start();

    app.logger.info(`Node ${app.nodeID} is fully operational with Pluggable Transports.`);
    return app;
}

if (require.main === module) {
    bootstrapMeshTasker().then(app => {
        process.on('SIGINT', async () => {
            app.logger.warn('Shutting down...');
            await app.stop();
            process.exit(0);
        });
    }).catch(_err => {
        console.error('Fatal error during startup:', _err);
        process.exit(1);
    });
}
