import { Row, Col, Nav, NavItem, TabContent, TabPane, Heading, Section } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class TabsSection extends BaseDemoSection {
    constructor() {
        super('Tabs & Navigation', [
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Dynamic Tabs', marginBottom: '3' }),
                            new Nav({
                                variant: 'tabs',
                                mb: 3,
                                children: [
                                    new NavItem({ paneId: 'home-tab', active: true, text: 'Home' }),
                                    new NavItem({ paneId: 'profile-tab', text: 'Profile' }),
                                    new NavItem({ paneId: 'contact-tab', text: 'Contact' })
                                ]
                            }),
                            new TabContent({
                                children: [
                                    new TabPane({ id: 'home-tab', active: true, fade: true, children: 'Home content: Robust, reactive UI components.' }),
                                    new TabPane({ id: 'profile-tab', fade: true, children: 'Profile content: Manage your mesh network nodes.' }),
                                    new TabPane({ id: 'contact-tab', fade: true, children: 'Contact content: Integration support for developers.' })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Vertical Pills', marginBottom: '3' }),
                            new Section({
                                display: 'flex', alignItems: 'start',
                                children: [
                                    new Nav({
                                        variant: 'pills',
                                        vertical: true,
                                        className: 'me-3',
                                        children: [
                                            new NavItem({ paneId: 'v-pills-home', active: true, text: 'Home' }),
                                            new NavItem({ paneId: 'v-pills-profile', text: 'Profile' }),
                                            new NavItem({ paneId: 'v-pills-messages', text: 'Messages' })
                                        ]
                                    }),
                                    new TabContent({
                                        children: [
                                            new TabPane({ id: 'v-pills-home', active: true, fade: true, children: 'Vertical Tab A' }),
                                            new TabPane({ id: 'v-pills-profile', fade: true, children: 'Vertical Tab B' }),
                                            new TabPane({ id: 'v-pills-messages', fade: true, children: 'Vertical Tab C' })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),

            new Row({
                mt: 5,
                children: [
                    new Col({
                        span: 12,
                        children: [
                            new Heading(5, { text: 'Justified Navigation', marginBottom: '3' }),
                            new Nav({
                                variant: 'pills',
                                justified: true,
                                mb: 4,
                                children: [
                                    new NavItem({ href: '#', active: true, text: 'Active' }),
                                    new NavItem({ href: '#', text: 'Much longer nav link' }),
                                    new NavItem({ href: '#', text: 'Link' })
                                ]
                            }),

                            new Heading(5, { text: 'Centered Tabs', marginBottom: '3' }),
                            new Nav({
                                variant: 'tabs',
                                align: 'center',
                                mb: 4,
                                children: [
                                    new NavItem({ href: '#', active: true, text: 'Active' }),
                                    new NavItem({ href: '#', text: 'Link' }),
                                    new NavItem({ href: '#', text: 'Link' }),
                                    new NavItem({ href: '#', disabled: true, text: 'Disabled' })
                                ]
                            }),
                            
                            new Heading(5, { text: 'Static Fill Navigation', marginBottom: '3' }),
                            new Nav({
                                variant: 'pills',
                                fill: true,
                                children: [
                                    new NavItem({ href: '#', active: true, text: 'Active Link' }),
                                    new NavItem({ href: '#', text: 'Much longer nav link' }),
                                    new NavItem({ href: '#', text: 'Link' }),
                                    new NavItem({ href: '#', disabled: true, text: 'Disabled' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
