import { EventEmitter } from 'eventemitter3';
import { IServiceInstance, ILogger } from '../types/registry.types';
import { ServiceRegistry } from './ServiceRegistry';

/**
 * ServiceLifecycle — manages local service instances and their dependencies.
 */
export class ServiceLifecycle extends EventEmitter {
    private services = new Map<string, IServiceInstance>();
    private isEvaluating = false;
    private needsRetry = false;

    constructor(
        private registry: ServiceRegistry,
        private logger: ILogger
    ) {
        super();
        this.registry.on('changed', () => this.queueEvaluation());
    }

    private queueEvaluation(): void {
        if (this.isEvaluating) {
            this.needsRetry = true;
            return;
        }
        this.evaluateDependencies().catch(err => {
            this.logger.error('[ServiceLifecycle] Dependency evaluation failed', err);
        });
    }

    registerService(service: IServiceInstance): void {
        this.services.set(service.name, service);
    }

    getServices(): IServiceInstance[] {
        return Array.from(this.services.values());
    }

    async startAll(): Promise<void> {
        for (const service of this.services.values()) {
            await service.start();
        }
    }

    async stopAll(): Promise<void> {
        for (const service of this.services.values()) {
            await service.stop();
        }
    }

    private async evaluateDependencies(): Promise<void> {
        this.isEvaluating = true;
        try {
            const availableServices = new Set(this.registry.getServiceNames());

            for (const service of this.services.values()) {
                const deps = service.schema.dependencies || [];
                const missingDeps = deps.filter((dep: string) => !availableServices.has(dep));

                if (missingDeps.length > 0 && service.state === 'running') {
                    this.logger.warn(`Service ${service.name} lost dependencies: ${missingDeps.join(', ')}. Pausing...`);
                    service.state = 'pausing';
                    if (service.schema.paused) await service.schema.paused();
                    service.state = 'paused';
                    this.emit('service:paused', service.name);
                } else if (missingDeps.length === 0 && service.state === 'paused') {
                    this.logger.info(`Dependencies restored for ${service.name}. Resuming...`);
                    if (service.schema.resumed) await service.schema.resumed();
                    service.state = 'running';
                    this.emit('service:resumed', service.name);
                }
            }
        } finally {
            this.isEvaluating = false;
            if (this.needsRetry) {
                this.needsRetry = false;
                this.queueEvaluation();
            }
        }
    }
}
