import { BrokerComponent, ComponentChild } from './BrokerComponent';
import { BrokerDOM } from '../BrokerDOM';
import { NavigationItem } from '@flybyme/isomorphic-core';
import { Main, Container } from '../ui/elements/Layout';
import { Navbar, NavbarBrand, NavbarToggler, NavbarCollapse, NavbarNav, Sidebar, NavbarItem, NavbarLink, NavbarDropdown, NavbarDropdownToggle, NavbarDropdownMenu, NavbarDropdownItem } from '../ui/elements/NavigationComponents';
import { RouterView } from './RouterView';
import { Text, BootstrapIcon } from '../ui/elements/Typography';

export class AppShell extends BrokerComponent {
    private routerView: RouterView;
    private sidebar: Sidebar;

    constructor() {
        super('div', { className: 'h-100 w-100 d-flex flex-column overflow-hidden mesh-app-root' });
        BrokerDOM.setAppShell(this);
        this.routerView = new RouterView();
        this.sidebar = new Sidebar({
            width: 0,
            className: 'border-end bg-white transition-all overflow-hidden d-none d-lg-flex'
        });

        const state = BrokerDOM.getStateService();
        if (state.getValue('$app.layout') === undefined) {
            state.set('$app.layout', 'default');
        }
    }

    public setPage(_page: BrokerComponent) {
        this.logger.warn('setPage() is deprecated. The AppShell now relies on RouterView.');
    }

    /**
     * Set layout actions for a specific scope (defaults to 'global').
     */
    public setHeaderActions(actions: ComponentChild[], scope: string = 'global') {
        const state = BrokerDOM.getStateService();
        state.set(`$app.header.actions.${scope}`, actions);
    }

    public setFooterContent(content: ComponentChild[], scope: string = 'global') {
        BrokerDOM.getStateService().set(`$app.footer.content.${scope}`, content);
    }

    public setSidebarExtra(content: ComponentChild[], scope: string = 'global') {
        BrokerDOM.getStateService().set(`$app.sidebar.extra.${scope}`, content);
    }

    /**
     * Helper to merge all scoped contributions into a flat array.
     */
    private getMergedLayoutState(path: string): ComponentChild[] {
        const state = BrokerDOM.getStateService();
        const scopes = state.getValue<Record<string, ComponentChild[]>>(path);

        this.logger.debug(`getMergedLayoutState path=${path} rawScopes=`, scopes);

        if (!scopes || typeof scopes !== 'object') return [];

        const merged: ComponentChild[] = [];
        const keys = Object.keys(scopes).sort((a, b) => {
            if (a === 'global') return -1;
            if (b === 'global') return 1;
            return 0;
        });

        for (const key of keys) {
            const items = scopes[key];
            if (Array.isArray(items)) {
                merged.push(...items);
            }
        }

        this.logger.debug(`getMergedLayoutState result count:`, merged.length);
        return merged;
    }

    private buildNavbar(): ComponentChild {
        const manifest = BrokerDOM.getManifest();
        const navItems = manifest?.navigation?.main || [];
        const headerActions = this.getMergedLayoutState('$app.header.actions');

        this.logger.debug(`buildNavbar rendering with ${headerActions.length} actions.`);

        return new Navbar({
            expand: 'lg',
            variant: 'dark',
            className: 'bg-dark shadow-sm px-4',
            sticky: 'top',
            container: 'fluid',
            children: [
                new NavbarBrand({
                    text: manifest?.app?.name || 'Mesh Platform',
                    href: '/',
                    className: 'fw-bold me-4'
                }),
                new NavbarToggler(),
                new NavbarCollapse({
                    children: [
                        new NavbarNav({
                            className: 'me-auto flex-row d-flex', // FORCE ROW
                            children: navItems.map((item: NavigationItem) => {
                                if (item.children && item.children.length > 0) {
                                    return new NavbarDropdown({
                                        children: [
                                            new NavbarDropdownToggle({
                                                children: [
                                                    item.icon ? new BootstrapIcon({ name: item.icon, className: 'me-2' }) : null,
                                                    new Text({ text: item.label })
                                                ]
                                            }),
                                            new NavbarDropdownMenu({
                                                children: item.children.map(child => new NavbarDropdownItem({
                                                    children: [
                                                        child.icon ? new BootstrapIcon({ name: child.icon, className: 'me-2' }) : null,
                                                        new Text({ text: child.label })
                                                    ],
                                                    onClick: (e: Event) => {
                                                        e.preventDefault();
                                                        if (child.path) BrokerDOM.navigate(child.path);
                                                    }
                                                }))
                                            })
                                        ]
                                    });
                                }
                                return new NavbarItem({
                                    children: new NavbarLink({
                                        className: 'nav-link cursor-pointer text-nowrap px-3 px-lg-3',
                                        children: [
                                            item.icon ? new BootstrapIcon({ name: item.icon, className: 'me-2' }) : null,
                                            new Text({ text: item.label })
                                        ],
                                        onClick: (e: Event) => {
                                            e.preventDefault();
                                            if (item.path) BrokerDOM.navigate(item.path);
                                        }
                                    })
                                });
                            })
                        }),
                        new NavbarNav({
                            tagName: 'div',
                            className: 'ms-auto d-flex align-items-center gap-3',
                            children: headerActions
                        })
                    ]
                })
            ]
        });
    }

    private buildFooter(): ComponentChild {
        const footerContent = this.getMergedLayoutState('$app.footer.content');
        const manifest = BrokerDOM.getManifest();

        return new Container({
            tagName: 'footer',
            className: 'p-4 border-top bg-white text-center text-muted small mt-auto',
            children: footerContent.length > 0 ? footerContent : [
                new Container({ text: `&copy; ${new Date().getFullYear()} ${manifest?.app?.name || 'Mesh Platform'}. All rights reserved.` })
            ]
        });
    }

    public build(): ComponentChild[] {
        const state = BrokerDOM.getStateService();
        const layoutMode = state.getValue('$app.layout');
        const sidebarExtra = this.getMergedLayoutState('$app.sidebar.extra');

        // Update sidebar children based on current state
        this.sidebar.props.children = [
            new Container({
                className: 'p-3 flex-grow-1 overflow-auto',
                children: sidebarExtra
            })
        ];

        if (layoutMode === 'minimal') {
            return [
                new Main({
                    className: 'flex-grow-1 w-100 h-100 bg-light',
                    children: this.routerView
                })
            ];
        }

        return [
            this.buildNavbar(),
            new Container({
                fluid: true,
                className: 'flex-grow-1 p-0 d-flex overflow-hidden',
                children: [
                    this.sidebar,
                    new Main({
                        className: 'flex-grow-1 bg-light d-flex flex-column overflow-y-auto',
                        children: [
                            new Container({
                                fluid: true,
                                className: 'flex-grow-1 d-flex flex-column p-0',
                                children: this.routerView
                            }),
                            this.buildFooter()
                        ]
                    })
                ]
            })
        ];
    }
}