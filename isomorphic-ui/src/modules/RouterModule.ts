import { IMeshModule, IMeshApp } from '@flybyme/isomorphic-core';
import { BrokerDOM } from '../BrokerDOM';
import { ReactiveState } from '../core/ReactiveState';
import { RouteConfig } from '../types/router.types';

/**
 * RouterModule — The Reactive Routing Engine.
 * Decoupled from DOM manipulation; strictly updates ReactiveState.
 */
export class RouterModule implements IMeshModule {
    public readonly name = 'router';
    private app?: IMeshApp;
    private routes: RouteConfig[] = [];
    public logger = BrokerDOM.getLogger().child({ component: 'RouterModule' });

    constructor(routes: RouteConfig[] = []) {
        this.routes = routes;
    }

    onInit(app: IMeshApp): void {
        this.app = app;
    }

    async onReady(): Promise<void> {
        if (typeof window === 'undefined') return;

        // Initialize state if not present
        const state = this.app?.getProvider<ReactiveState<Record<string, unknown>>>('state');
        if (state && !(state.data as Record<string, unknown>).$router) {
            (state.data as Record<string, unknown>).$router = {
                current: { path: '', component: null, params: {} }
            };
        }

        window.addEventListener('popstate', () => this.handleNavigation());

        // Initial route
        await this.handleNavigation();
    }

    public async navigate(path: string): Promise<void> {
        if (typeof window === 'undefined') return;
        window.history.pushState({}, '', path);
        await this.handleNavigation();
    }

    private async handleNavigation(): Promise<void> {
        const path = window.location.pathname;
        const state = this.app?.getProvider<ReactiveState<Record<string, unknown>>>('state');
        if (!state) return;

        for (const route of this.routes) {
            const params = this.match(route.path, path);
            if (params) {
                // Execute guards
                if (route.guards) {
                    for (const guard of route.guards) {
                        const passed = await guard(BrokerDOM.getMeshContext());
                        if (!passed) return;
                    }
                }

                // Update ReactiveState
                const routerState = (state.data as Record<string, unknown>).$router as { current: unknown };
                routerState.current = {
                    path,
                    component: route.component,
                    params
                };

                // Trigger re-render for subscribers
                state.dirty('$router.current');
                return;
            }
        }

        this.logger.warn(`No route matched for path: ${path}`);
    }

    private match(pattern: string | RegExp, path: string): Record<string, string> | null {
        if (typeof pattern === 'string') {
            if (pattern === path) return {};
            // Simplified param matching (e.g. /user/:id)
            const regex = new RegExp('^' + pattern.replace(/:[^\s/]+/g, '([^/]+)') + '$');
            const match = path.match(regex);
            if (match) {
                const keys = (pattern.match(/:[^\s/]+/g) || []).map(k => k.slice(1));
                const params: Record<string, string> = {};
                keys.forEach((key, i) => params[key] = match[i + 1]);
                return params;
            }
        } else if (pattern instanceof RegExp) {
            const match = path.match(pattern);
            if (match) return match.groups || {};
        }
        return null;
    }
}