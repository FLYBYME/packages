import { ILogger } from '@flybyme/isomorphic-core';
import { BrokerDOM } from '../BrokerDOM';
import { RouteConfig } from '../types/router.types';

export class VirtualRouter {
    private static routes: RouteConfig[] = [];
    private static initialized = false;
    private static _logger: ILogger | null = null;
    private static get logger(): ILogger {
        if (!this._logger) {
            this._logger = BrokerDOM.getLogger().child({ component: 'VirtualRouter' });
        }
        return this._logger;
    }

    public static init(routes: RouteConfig[]) {
        if (this.initialized) return;
        this.routes = routes;
        this.initialized = true;

        BrokerDOM.setNavigator((path) => this.push(path));

        // Listen for browser Back/Forward buttons
        window.addEventListener('popstate', () => this.handleRoute(window.location.pathname));
        
        // Trigger initial route
        this.handleRoute(window.location.pathname);
    }

    public static async push(path: string): Promise<boolean> {
        const success = await this.handleRoute(path, true);
        if (success) {
            window.history.pushState({}, '', path);
        }
        return success;
    }

    private static async handleRoute(path: string, _isPush = false): Promise<boolean> {
        // 1. Find matching route (supports regex or exact string)
        const purePath = path.split('?')[0];
        const matchedRoute = this.routes.find(r => {
            if (typeof r.path === 'string') return r.path === purePath;
            return r.path.test(purePath);
        });

        this.logger.debug(`handleRoute path=${path} purePath=${purePath} matchedRoute=`, { matchedRoute });

        if (!matchedRoute) {
            this.logger.error(`404: No route found for ${path}`);
            // Optionally redirect to a 404 page if defined in state/manifest
            return false;
        }

        // 2. Execute Guards (Auth checks, etc.)
        if (matchedRoute.guards) {
            for (const guard of matchedRoute.guards) {
                try {
                    const passed = await guard(BrokerDOM.getMeshContext());
                    if (!passed) {
                        this.logger.warn(`Guard rejected navigation to ${path}`);
                        return false; 
                    }
                } catch (e) {
                    this.logger.error(`Guard error during navigation to ${path}:`, { error: (e as Error).message });
                    return false;
                }
            }
        }

        // 3. Update the global ReactiveState
        // The RouterView component will be listening to this exact key
        BrokerDOM.getStateService().set('$router.current', {
            path,
            componentClass: matchedRoute.component
        });

        return true;
    }
}
