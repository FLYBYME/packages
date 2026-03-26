import { BrokerComponent, ComponentChild } from './BrokerComponent';
import { BrokerPage } from './BrokerPage';
import { BrokerDOM } from '../BrokerDOM';
import { AppShell } from './AppShell';
import { CurrentRoute } from '../types/router.types';

export class RouterView extends BrokerComponent {
    private activePage: BrokerPage | null = null;
    private currentRouteClass: { new (...args: unknown[]): BrokerPage } | null = null;
    private isTransitioning: boolean = false;

    constructor() {
        super('div', { className: 'mesh-router-view' });
    }

    // This is called automatically by ReactiveState before the DOM patches
    public build(): ComponentChild {
        const stateService = BrokerDOM.getStateService();
        const currentRoute = stateService.getValue<CurrentRoute & { params?: Record<string, unknown> }>('$router.current');

        if (!currentRoute) return null;

        let componentClass: unknown = currentRoute.componentClass;

        // Handle ES modules default export if it's wrapped in an object
        if (componentClass && typeof componentClass === 'object' && (componentClass as Record<string, unknown>).default) {
            componentClass = (componentClass as Record<string, unknown>).default;
        }

        if (!componentClass) {
            return null;
        }

        // If we are already showing this page, don't re-instantiate
        if (this.currentRouteClass === componentClass) {
            return this.activePage;
        }

        // If we are in the middle of an async transition, keep showing the current page
        if (this.isTransitioning) {
            return this.activePage;
        }

        // Start the two-phase teardown
        this.performTransition(componentClass as { new (...args: unknown[]): BrokerPage }, currentRoute.params || {});

        // Return the current page (or null) while we wait for the transition
        return this.activePage;
    }

    private async performTransition(newComponentClass: { new (...args: unknown[]): BrokerPage }, params: Record<string, unknown>) {
        this.logger.debug(`performTransition starting for:`, (newComponentClass as unknown as { name?: string }).name || 'AnonymousPage');
        this.isTransitioning = true;

        try {
            // 1. PHASE ONE: The Async Barrier
            if (this.activePage) {
                if (typeof this.activePage.onLeave === 'function') {
                    // Await the page's exit logic (animations, saves, prompts)
                    const canLeave = await this.activePage.onLeave();

                    // If the page explicitly returns false, abort the routing
                    if (canLeave === false) {
                        this.logger.info(`Navigation aborted by page onLeave`);
                        // Revert the router state to match the current active page
                        // This prevents the app from being in an inconsistent state
                        return;
                    }
                }

                // Smarter Cleanup: Clear contributions to AppShell
                this.clearPageContributions(this.activePage);

                // 2. PHASE TWO: Synchronous Destruction
                this.activePage.dispose();
            }

            // 3. Boot the new page
            if (typeof newComponentClass !== 'function') {
                throw new Error(`The routing manifest provided an invalid component class for the current route.`);
            }

            try {
                this.activePage = new newComponentClass();
                this.currentRouteClass = newComponentClass;
            } catch (instantiationError) {
                this.logger.error(`Failed to instantiate page class:`, instantiationError);
                // Fallback to an error state or re-throw
                throw instantiationError;
            }

            if (this.activePage && typeof this.activePage.onEnter === 'function') {
                try {
                    const result = this.activePage.onEnter(params);
                    if (result instanceof Promise) {
                        await result;
                    }
                } catch (enterError) {
                    this.logger.error(`Error in page onEnter:`, enterError);
                    // We continue anyway, or could show an error component
                }
            }

            // Trigger a re-render now that the new page is ready
            this.update();
        } catch (err) {
            this.logger.error(`Critical transition error:`, err);
            // If transition failed, we might be in an inconsistent state.
            // In a production app, we'd navigate to an Error page or reload.
        } finally {
            this.isTransitioning = false;
        }
    }

    private clearPageContributions(page: BrokerPage) {
        try {
            const shell = BrokerDOM.getAppShell<AppShell>();
            if (!shell) return;

            const scope = page.constructor.name;
            // Use specialized methods if they exist, or just clear via state
            if (typeof shell.setHeaderActions === 'function') shell.setHeaderActions([], scope);
            if (typeof shell.setSidebarExtra === 'function') shell.setSidebarExtra([], scope);
            if (typeof shell.setFooterContent === 'function') shell.setFooterContent([], scope);
        } catch (e) {
            this.logger.warn(`Failed to clear page contributions:`, e);
        }
    }
}
