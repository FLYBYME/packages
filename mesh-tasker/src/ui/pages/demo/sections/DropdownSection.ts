import { Row, Col, Heading, Dropdown, DropdownToggle, DropdownMenu, DropdownHeader, DropdownItem, DropdownDivider, Button, Section } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class DropdownSection extends BaseDemoSection {
    constructor() {
        super('Dropdowns & Overlays', [
            new Row({
                children: [
                    new Col({
                        span: 4,
                        children: [
                            new Heading(5, { text: 'Standard Dropdown', marginBottom: '3' }),
                            new Dropdown({
                                children: [
                                    new DropdownToggle({ variant: 'primary', label: 'Actions' }),
                                    new DropdownMenu({
                                        children: [
                                            new DropdownHeader({ text: 'Administration' }),
                                            new DropdownItem({ href: '#', text: 'View Metrics' }),
                                            new DropdownItem({ href: '#', text: 'Node Config' }),
                                            new DropdownDivider(),
                                            new DropdownItem({ href: '#', text: 'Restart Cluster' })
                                        ]
                                    })
                                ]
                            }),

                            new Heading(5, { text: 'Auto Close Behavior', className: 'mt-4 mb-3' }),
                            new Section({
                                className: 'd-flex gap-2 flex-wrap',
                                children: [
                                    new Dropdown({
                                        children: [
                                            new DropdownToggle({ variant: 'secondary', label: 'Default', autoClose: true }),
                                            new DropdownMenu({ children: [new DropdownItem({ text: 'Menu item' }), new DropdownItem({ text: 'Menu item' })] })
                                        ]
                                    }),
                                    new Dropdown({
                                        children: [
                                            new DropdownToggle({ variant: 'secondary', label: 'Click Outside', autoClose: 'outside' }),
                                            new DropdownMenu({ children: [new DropdownItem({ text: 'Menu item' }), new DropdownItem({ text: 'Menu item' })] })
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(5, { text: 'Split Button & Sizing', marginBottom: '3' }),
                            new Dropdown({
                                split: true,
                                children: [
                                    new Button({ variant: 'success', label: 'Deploy Now' }),
                                    new DropdownToggle({ variant: 'success', split: true }),
                                    new DropdownMenu({
                                        children: [
                                            new DropdownItem({ text: 'Schedule for Later' }),
                                            new DropdownItem({ text: 'Deploy to Staging' })
                                        ]
                                    })
                                ]
                            }),
                            
                            new Heading(5, { text: 'Alignment', className: 'mt-4 mb-3' }),
                            new Dropdown({
                                children: [
                                    new DropdownToggle({ variant: 'info', label: 'Right-aligned menu' }),
                                    new DropdownMenu({
                                        align: 'end',
                                        children: [
                                            new DropdownItem({ text: 'Action' }),
                                            new DropdownItem({ text: 'Another action' })
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(5, { text: 'Directions & Dark', marginBottom: '3' }),
                            new Dropdown({
                                direction: 'up',
                                children: [
                                    new DropdownToggle({ variant: 'dark', label: 'Dropup Menu' }),
                                    new DropdownMenu({
                                        dark: true,
                                        align: 'end',
                                        children: [
                                            new DropdownItem({ text: 'Quick Action A' }),
                                            new DropdownItem({ text: 'Quick Action B' })
                                        ]
                                    })
                                ]
                            }),

                            new Heading(5, { text: 'Dropend / Dropstart', className: 'mt-4 mb-3' }),
                            new Section({
                                className: 'd-flex gap-2 flex-wrap',
                                children: [
                                    new Dropdown({
                                        direction: 'end',
                                        children: [
                                            new DropdownToggle({ variant: 'primary', label: 'Dropend' }),
                                            new DropdownMenu({ children: [new DropdownItem({ text: 'Action' })] })
                                        ]
                                    }),
                                    new Dropdown({
                                        direction: 'start',
                                        children: [
                                            new DropdownToggle({ variant: 'primary', label: 'Dropstart' }),
                                            new DropdownMenu({ children: [new DropdownItem({ text: 'Action' })] })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
