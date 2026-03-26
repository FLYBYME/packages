import { IMeshModule, IMeshApp, IServiceBroker, ILogger } from '@flybyme/isomorphic-core';
import { DistributedLedger } from '../dlt/DistributedLedger';
import { LedgerService } from '../dlt/ledger.service';
import { ConsensusPlugin } from '../ConsensusPlugin';
import { IStorageAdapter } from '../interfaces/IStorageAdapter';

/**
 * ConsensusModule — Orchestrates Raft and the Distributed Ledger.
 * Implements the "Self-Installing" pattern by piping the ConsensusPlugin into the Broker.
 */
export class ConsensusModule implements IMeshModule {
    public readonly name = 'consensus';
    public logger!: ILogger;
    public serviceBroker!: IServiceBroker;
    
    private ledger!: DistributedLedger;

    onInit(app: IMeshApp): void {
        this.logger = app.getProvider<ILogger>('logger') || app.logger;
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');

        if (!this.serviceBroker) {
            this.logger.warn('[ConsensusModule] ServiceBroker not found during onInit. ConsensusPlugin may not be installed.');
        }

        // 1. Initialize core consensus components
        const storageAdapter = app.getProvider<IStorageAdapter>('database:adapter');
        if (!storageAdapter) {
            this.logger.error('[ConsensusModule] No storage adapter found. DLT will be disabled.');
            return;
        }

        this.ledger = new DistributedLedger(app.nodeID, storageAdapter);
        
        // 2. Create and pipe the ConsensusPlugin
        const plugin = new ConsensusPlugin(this.ledger);
        if (this.serviceBroker) {
            this.serviceBroker.pipe(plugin);
            this.logger.info('[ConsensusModule] ConsensusPlugin successfully piped into ServiceBroker.');
        }

        // 3. Register the Ledger service and provider
        const ledgerService = new LedgerService(this.ledger);
        app.registerService(ledgerService as unknown as import('@flybyme/isomorphic-core').IServiceSchema);
        
        app.registerProvider('ledger', this.ledger);
    }

    async onStart(): Promise<void> {}
    async onStop(): Promise<void> {}
}
