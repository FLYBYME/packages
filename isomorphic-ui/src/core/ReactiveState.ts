import { IServiceBroker } from '@flybyme/isomorphic-core';
import { BrokerDOM } from '../BrokerDOM';

export type StateListener = (newValue?: unknown, oldValue?: unknown) => void;

/**
 * ReactiveState — A Proxy-based engine for granular state tracking and reactivity.
 * Refactored for Phase 2: Mesh Integration & Structured Cloning.
 */
export class ReactiveState<T extends object> {
    public data: T;
    private listeners: Map<string, Set<StateListener>> = new Map();
    private globalListeners: Set<StateListener> = new Set();
    private logger = BrokerDOM.getLogger().child({ component: 'ReactiveState' });

    // Track accessed paths during a synchronous block (e.g. build() or render())
    private static accessStack: Set<string>[] = [];

    constructor(initialState: T, private broker?: IServiceBroker) {
        this.data = this.createProxy(this.deepClone(initialState));
    }

    /**
     * Records which paths are accessed during the execution of the callback.
     * Returns the set of paths.
     */
    public static track(cb: () => void): Set<string> {
        const accessedPaths = new Set<string>();
        this.accessStack.push(accessedPaths);
        try {
            cb();
        } finally {
            this.accessStack.pop();
        }
        return accessedPaths;
    }

    /**
     * Get the current state as a Readonly clone to prevent silent mutations.
     */
    public getState(): Readonly<T> {
        return this.deepClone(this.data);
    }

    /**
     * Get a specific value from the state by path.
     */
    public getValue<V = unknown>(path: string): V {
        const normalized = this.normalizePath(path);
        return normalized.split('.').reduce((acc: unknown, part: string) => acc && (acc as Record<string, unknown>)[part], this.data) as V;
    }

    /**
     * Set a specific value in the state by path.
     * Triggers notifications for the path and its parents.
     */
    public set(path: string, value: unknown): void {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('.');
        const lastPart = parts.pop()!;
        let target = this.data as Record<string, unknown>;
        let currentPath = '';

        for (const part of parts) {
            const nextPath = currentPath ? `${currentPath}.${part}` : part;
            if (!target[part] || typeof target[part] !== 'object') {
                // Ensure intermediate objects are also proxied
                (target as Record<string, unknown>)[part] = this.createProxy({}, nextPath);
            }
            target = target[part] as Record<string, unknown>;
            currentPath = nextPath;
        }

        target[lastPart] = value;
        // The proxy 'set' trap will handle this.notify(path)
    }

    private normalizePath(path: string): string {
        return path.replace(/\[["']?(.+?)["']?\]/g, '.$1').replace(/^\./, '');
    }

    /**
     * Update the state. 
     * If broker is present, this can be synchronized across the mesh.
     */
    public setState(newState: Partial<T> | ((prev: Readonly<T>) => Partial<T>)): void {
        const nextState = typeof newState === 'function'
            ? newState(this.getState())
            : newState;

        // Apply changes to proxy
        this.logger.debug(`setState() - applying patch:`, { patch: nextState });
        Object.assign(this.data, nextState);

        // Optional: Emit to mesh for distributed synchronization
        if (this.broker) {
            this.broker.emit('$state.changed', {
                patch: nextState,
                timestamp: Date.now()
            });
        }
    }

    private createProxy<U extends object>(obj: U, path: string = ''): U {
        return new Proxy(obj, {
            get: (target, prop, receiver) => {
                const key = String(prop);
                // 1. Don't proxy symbols or internal properties
                if (typeof prop === 'symbol' || key.startsWith('_')) {
                    return Reflect.get(target, prop, receiver);
                }

                // 2. Ignore native Array methods and built-in properties (map, filter, push, length, constructor)
                if (Array.isArray(target) && (prop in Array.prototype || prop === 'length' || prop === 'constructor')) {
                    return Reflect.get(target, prop, receiver);
                }

                const fullPath = path ? `${path}.${key}` : key;

                // 1. Access Tracking (Legacy Stack-based)
                if (ReactiveState.accessStack.length > 0) {
                    ReactiveState.accessStack[ReactiveState.accessStack.length - 1].add(fullPath);
                }

                // 2. THE MAGIC SAUCE: BrokerComponent Auto-Subscription
                const globalScope = globalThis as unknown as {
                    MeshMagicSauce?: {
                        subscriberStack: {
                            invalidate: () => void;
                            unsubscribes?: (() => void)[];
                        }[]
                    }
                };
                const magic = globalScope.MeshMagicSauce;
                if (magic && magic.subscriberStack && magic.subscriberStack.length > 0) {
                    const subscriber = magic.subscriberStack[magic.subscriberStack.length - 1];
                    const unsub = this.subscribe(fullPath, () => subscriber.invalidate());
                    if (subscriber.unsubscribes) {
                        subscriber.unsubscribes.push(unsub);
                    }
                }

                const value = Reflect.get(target, prop, receiver);
                if (value && typeof value === 'object') {
                    // NEW: Bypass proxying for UI Components, DOM nodes, and native complex objects
                    // We check the constructor's static marker to accurately identify components across different bundles.
                    if (
                        (value.constructor as unknown as { isBrokerUIComponent: boolean }).isBrokerUIComponent ||
                        (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
                        value instanceof Date ||
                        value instanceof Map ||
                        value instanceof Set
                    ) {
                        return value; // Return the RAW instance, do not proxy it!
                    }

                    // OLD: Continue proxying plain objects/arrays
                    return this.createProxy(value as object, fullPath);
                }
                return value;
            },
            set: (target, prop, value, receiver) => {
                const key = String(prop);
                const fullPath = path ? `${path}.${key}` : key;

                // 1. Guard against internal loop
                if (typeof prop === 'symbol' || key.startsWith('_')) {
                    return Reflect.set(target, prop, value, receiver);
                }

                const oldValue = Reflect.get(target, prop, receiver);
                if (oldValue === value && typeof value !== 'object') return true;

                const result = Reflect.set(target, prop, value, receiver);
                this.notify(fullPath, value, oldValue);
                return result;
            }
        }) as U;
    }

    public subscribe(path: string, listener: StateListener): () => void {
        //console.log(`[ReactiveState] New subscription for: ${path}`);
        const normalized = this.normalizePath(path);
        if (!this.listeners.has(normalized)) {
            this.listeners.set(normalized, new Set());
        }
        this.listeners.get(normalized)!.add(listener);
        return () => {
            const set = this.listeners.get(normalized);
            if (set) {
                set.delete(listener);
                if (set.size === 0) this.listeners.delete(normalized);
            }
        };
    }

    public subscribeGlobal(listener: StateListener): () => void {
        this.globalListeners.add(listener);
        return () => this.globalListeners.delete(listener);
    }

    public dirty(path: string): void {
        const normalized = this.normalizePath(path);
        this.notify(normalized, this.getValue(normalized));
    }

    private notify(path: string, newValue?: unknown, oldValue?: unknown): void {
        this.invokeListeners(path, newValue, oldValue);

        let parentPath = path;
        while (parentPath.includes('.')) {
            parentPath = parentPath.substring(0, parentPath.lastIndexOf('.'));
            this.invokeListeners(parentPath, this.getValue(parentPath));
        }

        for (const listener of this.globalListeners) {
            listener(newValue, oldValue);
        }
    }

    private invokeListeners(path: string, newValue?: unknown, oldValue?: unknown): void {
        const set = this.listeners.get(path);
        if (set) {
            for (const listener of set) {
                try {
                    listener(newValue, oldValue);
                } catch (_e) {
                    this.logger.error(`Listener error at ${path}:`, { error: (_e as Error).message });
                }
            }
        }
    }

    private deepClone<U>(obj: U): U {
        try {
            if (typeof structuredClone === 'function') {
                return structuredClone(obj);
            }
        } catch {
            // Fallback for objects that cannot be structured-cloned (e.g. contains functions or proxies)
        }
        return JSON.parse(JSON.stringify(obj));
    }
}