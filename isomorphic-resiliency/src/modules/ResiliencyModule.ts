import { IMeshModule, IMeshApp, IServiceBroker, ILogger } from '@flybyme/isomorphic-core';
import { ResiliencyPlugin, ResiliencyPluginOptions } from '../ResiliencyPlugin';

/**
 * ResiliencyModule — Connects Circuit Breaking and Rate Limiting to the MeshApp.
 * Implements the "Self-Installing" pattern via ResiliencyPlugin.
 */
export class ResiliencyModule implements IMeshModule {
    public readonly name = 'resiliency';
    public logger!: ILogger;
    public serviceBroker!: IServiceBroker;
    private plugin!: ResiliencyPlugin;

    constructor(private options: ResiliencyPluginOptions) {
        this.plugin = new ResiliencyPlugin(this.options);
    }

    onInit(app: IMeshApp): void {
        this.logger = app.logger;
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');

        if (this.serviceBroker) {
            this.serviceBroker.pipe(this.plugin);
            this.logger.debug('[ResiliencyModule] ResiliencyPlugin successfully piped into ServiceBroker.');
        }

        app.registerProvider('resiliency:plugin', this.plugin);
    }

    async onStart(): Promise<void> {}
    async onStop(): Promise<void> {}
}
