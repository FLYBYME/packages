import { IMeshModule, IMeshApp, IServiceBroker, ILogger } from '@flybyme/isomorphic-core';
import { MeshTokenManager } from '../core/MeshTokenManager';
import { PolicyEngine } from '../core/PolicyEngine';
import { TicketManager } from '../core/TicketManager';
import { Gatekeeper } from '../core/Gatekeeper';
import { AuthPlugin } from '../AuthPlugin';

/**
 * AuthModule — Manages the lifecycle and configuration of the authentication system.
 * Implements the "Self-Installing" pattern by piping the AuthPlugin into the Broker.
 */
export class AuthModule implements IMeshModule {
    public readonly name = 'auth';
    public logger!: ILogger;
    public serviceBroker!: IServiceBroker;
    
    private gatekeeper!: Gatekeeper;
    private ticketManager!: TicketManager;
    private tokenManager!: MeshTokenManager;
    private authPlugin!: AuthPlugin;

    onInit(app: IMeshApp): void {
        this.logger = app.getProvider<ILogger>('logger') || app.logger;
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');

        if (!this.serviceBroker) {
            this.logger.warn('[AuthModule] ServiceBroker not found during onInit. AuthPlugin may not be installed.');
        }

        // 1. Initialize core auth components
        this.tokenManager = new MeshTokenManager(app.nodeID);
        
        const kdcCaller = (action: string, params: unknown) => 
            this.serviceBroker.call<Record<string, unknown>>(action, params);

        this.ticketManager = new TicketManager(app.nodeID, this.tokenManager, kdcCaller, this.logger);
        
        const auditLogger = { log: async () => {} };
        this.gatekeeper = new Gatekeeper(app.nodeID, this.tokenManager, this.logger, auditLogger);
        
        // 2. Create the AuthPlugin (The actual "piped" logic)
        this.authPlugin = new AuthPlugin(this.gatekeeper, this.ticketManager);

        // 3. Self-Install: Pipe the plugin into the broker
        if (this.serviceBroker) {
            this.serviceBroker.pipe(this.authPlugin);
            this.logger.debug('[AuthModule] AuthPlugin successfully piped into ServiceBroker.');
        }

        // 4. Register providers for DI (Backwards compatibility & manual access)
        app.registerProvider('auth:token', this.tokenManager);
        app.registerProvider('auth:policy', new PolicyEngine());
        app.registerProvider('auth:ticket', this.ticketManager);
        app.registerProvider('auth:gatekeeper', this.gatekeeper);
    }

    public getGatekeeper(): Gatekeeper {
        return this.gatekeeper;
    }

    public getTicketManager(): TicketManager {
        return this.ticketManager;
    }

    public getPlugin(): AuthPlugin {
        return this.authPlugin;
    }

    async onStart(): Promise<void> {
        // Any async startup logic if needed
    }

    async onStop(): Promise<void> {
        if (this.ticketManager) {
            this.ticketManager.stop();
        }
    }
}
