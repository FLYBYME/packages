import { IMeshModule, IMeshApp, IServiceBroker } from '@flybyme/isomorphic-core';
import { ICacheProvider } from '../interfaces/ICacheProvider';
import { FeatureFlagManager } from './FeatureFlagManager';

export interface FlagModuleOptions {
    defaultFlags?: Record<string, boolean>;
}

/**
 * FlagModule — Integrates feature flags into the MeshApp and handles mesh updates.
 */
export class FlagModule implements IMeshModule {
    public readonly name = 'flag-module';
    private manager!: FeatureFlagManager;

    constructor(private options: FlagModuleOptions = {}) {}

    onInit(app: IMeshApp): void {
        console.log('[FlagModule] Initializing feature flag manager...');
        
        const cache = app.getProvider<ICacheProvider>('cache');
        this.manager = new FeatureFlagManager(cache, this.options.defaultFlags);

        app.registerProvider('flags', this.manager);
    }

    onBind(app: IMeshApp): void {
        try {
            const broker = app.getProvider<IServiceBroker>('broker');
            this.manager.setBroker(broker);

            // 8. Subscribe to global $flags.updated event
            broker.on('$flags.updated', (data: { flag: string, enabled: boolean }) => {
                console.log(`[FlagModule] Remote flag update received: ${data.flag}=${data.enabled}`);
                this.manager.updateFlag(data.flag, data.enabled);
            });
        } catch {
            console.warn('[FlagModule] Broker not found. Remote sync disabled.');
        }
    }
}
