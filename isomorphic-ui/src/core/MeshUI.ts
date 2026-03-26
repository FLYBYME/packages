import { createMeshApp, BrokerModule, IServiceBroker, IServiceRegistry, ILogger } from '@flybyme/isomorphic-core';
import { NetworkModule, WSTransport, JSONSerializer } from '@flybyme/isomorphic-mesh';
import { RegistryModule } from '@flybyme/isomorphic-registry';
import { TelemetryModule } from '@flybyme/isomorphic-telemetry';

import { BrokerDOM } from '../BrokerDOM';
import { ReactiveState } from './ReactiveState';
import { VirtualRouter } from './VirtualRouter';
import { AppShell } from './AppShell';
import { SiteManifest } from './InternalTypes';
import { RouteConfig } from '../types/router.types';

/**
 * MeshUI Orchestrator
 * The "Engine" of the framework. A single bootstrap() call automates the complex setup tasks.
 */
export class MeshUI {
    private static logger = BrokerDOM.getLogger().child({ component: 'MeshUI' });

    /**
     * Bootstraps the entire application with zero-config.
     * 1. Initializes the Mesh App with common modules.
     * 2. Sets up ReactiveState and binds to BrokerDOM.
     * 3. Initializes the Virtual Router.
     * 4. Mounts the root AppShell automatically.
     */
    public static async bootstrap(manifest: SiteManifest) {
        this.logger.info(`Bootstrapping ${manifest.app?.name || 'Application'}...`);

        // 1. Extract environment config (provided by the delivery service or env)
        const env = (typeof window !== 'undefined' && (window as unknown as { __MESH_ENV__: Record<string, string> }).__MESH_ENV__) || {};
        const gatewayUrl = env.MESH_GATEWAY_URL || 'ws://192.168.1.21:5020';

        // 1.5 Determine if we should be silent during bootstrap
        const logOpts = manifest.mesh?.telemetry?.logging || {};
        const consoleEnabled = logOpts.enabled !== false && (logOpts.drains?.includes('console') ?? true);

        if (!consoleEnabled) {
            (globalThis as unknown as Record<string, unknown>).MESH_SILENT = true;
        }

        // 2. Mesh Network Initialization
        const app = createMeshApp({
            nodeID: env.NODE_ID,
            namespace: manifest.app?.namespace || 'default',
            modules: [
                new BrokerModule(),
                new RegistryModule(),
                new TelemetryModule(manifest.mesh.telemetry),
                new NetworkModule({
                    transports: [new WSTransport(new JSONSerializer())],
                    bootstrapNodes: [gatewayUrl],
                    ...manifest.mesh.network
                })
            ]
        });

        // Expose app to window for debugging
        (window as unknown as { app: unknown }).app = app;

        await app.start();
        const broker = app.getProvider<IServiceBroker>('broker');

        // 3. State Engine Initialization
        const stateService = new ReactiveState({
            $router: { current: null },
            $registry: { nodes: {} },
            $app: {
                header: { actions: {} },
                sidebar: { extra: {} },
                footer: { content: {} }
            },
            ...(manifest.initialState || {})
        }, broker);

        // Bridge Registry to Reactive State
        const registry = app.getProvider<IServiceRegistry>('registry');
        if (registry) {
            const updateRegistryState = () => {
                const nodesArr = registry.getNodes();
                const nodesMap: Record<string, unknown> = {};
                for (const node of nodesArr) {
                    // Normalize the node format slightly if needed, or pass raw
                    nodesMap[node.nodeID] = {
                        ...node,
                        nodeID: node.nodeID,
                        type: node.type || 'Worker',
                        status: node.available ? 'Running' : 'Offline',
                        lastHeartbeat: node.timestamp ? Date.now() - node.timestamp : undefined,
                        metrics: {
                            cpu: Math.round((node.cpu as number || 0)),
                            ram: Math.round(((node.activeRequests as number || 0) / 100) * 100)
                        }
                    };
                }
                stateService.set('$registry.nodes', nodesMap);
            };

            registry.on('changed', updateRegistryState);
            registry.on('heartbeat', updateRegistryState);
            registry.on('local:changed', updateRegistryState); // Subscribe to local metric changes
            updateRegistryState();
        }

        // 4. BrokerDOM Calibration
        // Pass broker, undefined, and state to connect the UI layer to the core.
        BrokerDOM.initialize(broker, undefined, stateService, app.logger);
        BrokerDOM.setManifest(manifest);

        // Re-initialize MeshUI logger to pick up the final configured logger
        (this as unknown as { logger: ILogger }).logger = BrokerDOM.getLogger().child({ component: 'MeshUI' });

        // 5. Virtual Router Bootstrapping
        if (manifest.routing && manifest.routing.routes) {
            VirtualRouter.init(manifest.routing.routes as unknown as RouteConfig[]);
        }

        // 6. Final DOM Mount
        if (typeof document !== 'undefined') {
            const rootElement = document.getElementById('mesh-root-app');
            if (rootElement) {
                const shell = new AppShell();
                BrokerDOM.mount(rootElement, shell);
                this.logger.info('Application mounted successfully.');
            } else {
                this.logger.error('Bootstrapping failed: Could not find #mesh-root-app in the document.');
            }
        }
    }
}
