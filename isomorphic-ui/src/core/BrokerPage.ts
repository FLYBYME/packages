import { BrokerComponent, ComponentChild } from './BrokerComponent';
import { BrokerDOM } from '../BrokerDOM';
import { AppSeoConfig } from './InternalTypes';
import { AppShell } from './AppShell';

export interface PageHeaderConfig {
    title: string;
    pretitle?: string;
    breadcrumbs?: Array<{ label: string, href?: string }>;
    primaryAction?: ComponentChild;
    secondaryActions?: ComponentChild[];
    actions?: ComponentChild[];
}

export abstract class BrokerPage extends BrokerComponent {

    /**
     * Fired by the VirtualRouter when the page is navigated to.
     * Ideal for initiating data fetches.
     */
    public abstract onEnter(params: Record<string, unknown>): void | Promise<void>;

    /**
     * Fired by the VirtualRouter right before the page unmounts.
     * Optional async hook. If it returns false, routing is aborted.
     */
    public async onLeave?(): Promise<boolean | void>;

    /**
     * Determines the overarching layout structure for standard views.
     */
    public abstract getPageConfig(): PageHeaderConfig | null;

    /**
     * Feeds metadata up to the document <head> when active.
     */
    public abstract getSEO(): Partial<AppSeoConfig>;

    /**
     * Fallback UI rendered while `onEnter` is resolving promises.
     */
    public getLoadingState(): ComponentChild | null {
        return null; // Override with a spinner or skeleton loader if needed
    }

    public override dispose(): void {
        // Pure, synchronous garbage collection
        super.dispose();
    }

    /**
     * Update the global Header actions from the page.
     */
    protected setHeaderActions(actions: ComponentChild[]) {
        try {
            const shell = BrokerDOM.getAppShell<AppShell>();
            if (shell.setHeaderActions) shell.setHeaderActions(actions, this.constructor.name);
        } catch {
            this.logger.warn('AppShell not found during setHeaderActions');
        }
    }

    /**
     * Add custom items to the Sidebar from the page.
     */
    protected setSidebarExtra(content: ComponentChild[]) {
        try {
            const shell = BrokerDOM.getAppShell<AppShell>();
            if (shell.setSidebarExtra) shell.setSidebarExtra(content, this.constructor.name);
        } catch {
            this.logger.warn('AppShell not found during setSidebarExtra');
        }
    }

    /**
     * Customize the app footer from the page.
     */
    protected setFooterContent(content: ComponentChild[]) {
        try {
            const shell = BrokerDOM.getAppShell<AppShell>();
            if (shell.setFooterContent) shell.setFooterContent(content, this.constructor.name);
        } catch {
            this.logger.warn('AppShell not found during setFooterContent');
        }
    }
}
