import { IServiceBroker as IBroker, ILogger, LogLevel, ConsoleLogger } from '@flybyme/isomorphic-core';
import { ReactiveState as ReactiveStateService } from './core/ReactiveState';
import { RouterModule as VirtualRouter } from './modules/RouterModule';
import { SiteManifest as AppManifest } from './core/InternalTypes';
import { StyleEngine } from './theme/StyleEngine';

export interface IMountable {
    mount?(parent: HTMLElement): void;
    hydrate?(element: HTMLElement): void;
}

export interface IMeshContext {
    broker: IBroker;
    state: ReactiveStateService<object>;
    manifest: AppManifest | null;
    logger: ILogger;
}

interface BrokerDOMStorage {
    brokerInstance: IBroker | null;
    stateServiceInstance: ReactiveStateService<object> | null;
    routerInstance: VirtualRouter | null;
    loggerInstance: ILogger | null;
    componentRegistry: Set<IMountable>;
    manifestInstance: AppManifest | null;
    appShellInstance: unknown | null;
    initialized: boolean;
    navigatorFn: ((path: string) => void) | null;
}

/**
 * BrokerDOM (Global Registry)
 * Total Encapsulation: Eradicates all window assignments to prevent pollution.
 * Supports environment agnosticism (SSR-ready).
 */
export class BrokerDOM {
    private static logger = BrokerDOM.getLogger().child({ component: 'BrokerDOM' });

    private static get storage(): BrokerDOMStorage {
        const g = globalThis as unknown as { __mesh_dom_storage: BrokerDOMStorage };
        if (!g.__mesh_dom_storage) {
            g.__mesh_dom_storage = {
                brokerInstance: null,
                stateServiceInstance: null,
                routerInstance: null,
                loggerInstance: null,
                componentRegistry: new Set<IMountable>(),
                manifestInstance: null,
                appShellInstance: null,
                initialized: false,
                navigatorFn: null
            };
        }
        return g.__mesh_dom_storage;
    }

    public static setManifest(manifest: AppManifest): void {
        this.storage.manifestInstance = manifest;
        StyleEngine.init(manifest);
    }

    public static getManifest(): AppManifest | null {
        if (!this.storage.manifestInstance) {
            this.logger.warn('getManifest() returning null. Initialized:', { initialized: this.storage.initialized });
        }
        return this.storage.manifestInstance;
    }

    public static setAppShell(instance: unknown): void {
        this.storage.appShellInstance = instance;
    }

    public static getAppShell<T>(): T {
        if (!this.storage.appShellInstance) throw new Error('[BrokerDOM] AppShell accessed before registration.');
        return this.storage.appShellInstance as T;
    }

    public static registerComponent(instance: unknown): void {
        this.storage.componentRegistry.add(instance as IMountable);
    }

    public static mount(parent: HTMLElement, component: IMountable): void {
        if (!parent) return;

        // Clear any loading states or legacy SSR content
        if (parent.innerHTML.trim() === '' || parent.hasAttribute('data-mesh-loading')) {
            parent.innerHTML = '';
            if (component.mount) {
                component.mount(parent);
            }
        } else {
            // CRITICAL FIX: Hydrate the actual component root, not the mount container!
            const rootEl = parent.firstElementChild as HTMLElement;
            if (rootEl && component.hydrate) {
                component.hydrate(rootEl);
            } else if (component.mount) {
                parent.innerHTML = '';
                component.mount(parent);
            } else {
                this.logger.error('Attempted to mount an invalid component:', { component });
            }
        }
    }

    public static unregisterComponent(instance: unknown): void {
        this.storage.componentRegistry.delete(instance as IMountable);
    }

    public static setNavigator(nav: (path: string) => void): void {
        this.storage.navigatorFn = nav;
    }

    public static navigate(path: string): void {
        if (this.storage.navigatorFn) {
            this.storage.navigatorFn(path);
        } else {
            window.location.pathname = path;
        }
    }

    public static getActiveComponents(): IMountable[] {
        return Array.from(this.storage.componentRegistry);
    }

    public static initialize(broker: IBroker, router?: VirtualRouter, stateService?: ReactiveStateService<object>, logger?: ILogger): void {
        this.storage.brokerInstance = broker;
        if (router) this.storage.routerInstance = router;
        if (stateService) this.storage.stateServiceInstance = stateService;
        if (logger) this.storage.loggerInstance = logger;

        // Prevent attaching multiple document event listeners if called twice
        if (this.storage.initialized) return;
        this.storage.initialized = true;

        // FIX: Implement Global Event Delegation to satisfy CSP and performance requirements
        if (typeof document !== 'undefined') {
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target || typeof target.closest !== 'function') return;

                // 1. SPA Link Interception
                const anchor = target.closest('a');
                if (anchor) {
                    const href = anchor.getAttribute('href');
                    const isInternal = href?.startsWith('/') && !href.startsWith('//');

                    if (isInternal && this.storage.navigatorFn) {
                        e.preventDefault();
                        this.storage.navigatorFn(href!);
                        return;
                    }
                }

                // 2. Mesh Action Dispatcher (data-mesh-click)
                const meshClick = target.closest('[data-mesh-click]');
                if (!meshClick) {
                    return;
                }

                const methodName = meshClick.getAttribute('data-mesh-click');
                if (!methodName) {
                    return;
                }

                // FIX: O(1) Lookup - Walk up the tree to find the owning component instance
                let curr: HTMLElement | null = meshClick as HTMLElement;
                while (curr && curr !== document.body) {
                    const instance = (curr as HTMLElement & { __brokerInstance?: Record<string, unknown> }).__brokerInstance;
                    if (instance) {
                        const method = instance[methodName];
                        if (typeof method === 'function') {
                            (method as (_e: Event) => void).call(instance, e);
                        }
                        this.logger.debug('Method found and called', { methodName });
                        break;
                    }
                    curr = curr.parentElement;
                }
            });
        }
    }

    public static getBroker(): IBroker {
        if (!this.storage.brokerInstance) throw new Error('[BrokerDOM] Broker accessed before initialization.');
        return this.storage.brokerInstance;
    }

    public static getLogger(): ILogger {
        if (!this.storage.loggerInstance) {
            // Robust fallback using the default ConsoleLogger for early lifecycle logs
            this.storage.loggerInstance = new ConsoleLogger({ source: 'BrokerDOM' }, LogLevel.DEBUG);
        }
        return this.storage.loggerInstance!;
    }

    public static getMeshContext(): IMeshContext {
        return {
            broker: this.getBroker(),
            state: this.getStateService(),
            manifest: this.getManifest(),
            logger: this.getLogger()
        };
    }

    public static getStateService(): ReactiveStateService<object> {
        if (!this.storage.stateServiceInstance) throw new Error('[BrokerDOM] ReactiveStateService accessed before initialization.');
        return this.storage.stateServiceInstance;
    }

    public static getRouter(): VirtualRouter {
        if (!this.storage.routerInstance) throw new Error('[BrokerDOM] VirtualRouter accessed before initialization.');
        return this.storage.routerInstance;
    }
}