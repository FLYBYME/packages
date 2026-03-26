import { Popover, Tooltip, Offcanvas, OffcanvasHeader, OffcanvasTitle, OffcanvasBody, Button, Row, Col, Heading, Box, Badge } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class OverlaysSection extends BaseDemoSection {
    constructor() {
        super('Overlays & Tooltips', [
            new Heading(5, { text: 'Popovers', marginBottom: '4' }),
            new Row({
                children: [
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Standard Popover', marginBottom: '3' }),
                            new Popover({
                                variant: 'primary',
                                popoverTitle: 'Network Node Delta',
                                content: 'This node is operating at 94% efficiency. Recent latency spike detected in the US-East subnet.',
                                children: 'View Node Data'
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Dismissible (Focus)', marginBottom: '3' }),
                            new Popover({
                                variant: 'secondary',
                                trigger: 'focus',
                                popoverTitle: 'System Alert',
                                content: 'Click anywhere else to dismiss this warning message. Integration complete.',
                                children: 'Tap to Read'
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Placement Demo', marginBottom: '3' }),
                            new Popover({
                                variant: 'info',
                                placement: 'right',
                                popoverTitle: 'Right Popover',
                                content: 'This popover appears on the right of the trigger element.',
                                children: 'Right Side'
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Tooltips', className: 'mt-5 mb-4' }),
            new Row({
                children: [
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Directional', marginBottom: '3' }),
                            new Box({
                                className: 'd-flex gap-2',
                                children: [
                                    new Tooltip({ tooltipTitle: 'Tooltip on top', placement: 'top', children: new Button({ variant: 'secondary', outline: true, text: 'Top' }) }),
                                    new Tooltip({ tooltipTitle: 'Tooltip on bottom', placement: 'bottom', children: new Button({ variant: 'secondary', outline: true, text: 'Bottom' }) })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'HTML Content', marginBottom: '3' }),
                            new Tooltip({
                                tooltipTitle: '<em>Tooltip</em> <u>with</u> <b>HTML</b>',
                                html: true,
                                children: new Button({ variant: 'info', outline: true, text: 'Rich Text' })
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Disabled Wrapper', marginBottom: '3' }),
                            new Tooltip({
                                tooltipTitle: 'You must be logged in to delete this record.',
                                children: new Button({ variant: 'danger', text: 'Delete File', disabled: true })
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Offcanvas Sidebars', className: 'mt-5 mb-4' }),
            new Box({
                className: 'd-flex gap-2',
                children: [
                    new Button({
                        variant: 'primary',
                        label: 'Open Sidebar (Start)',
                        toggle: 'offcanvas',
                        target: '#oc-demo-start'
                    }),
                    new Button({
                        variant: 'dark',
                        label: 'Open Cart (End)',
                        toggle: 'offcanvas',
                        target: '#oc-demo-end'
                    }),
                    new Offcanvas({
                        id: 'oc-demo-start',
                        placement: 'start',
                        children: [
                            new OffcanvasHeader({
                                children: new OffcanvasTitle({ text: 'Main Menu' })
                            }),
                            new OffcanvasBody({
                                text: 'This sidebar slides in from the left and can contain navigation links or complex UI elements.'
                            })
                        ]
                    }),
                    new Offcanvas({
                        id: 'oc-demo-end',
                        placement: 'end',
                        scroll: true,
                        backdrop: 'static',
                        children: [
                            new OffcanvasHeader({
                                children: new OffcanvasTitle({ text: 'Shopping Cart' })
                            }),
                            new OffcanvasBody({
                                text: 'This right-side panel has body scrolling enabled and a static backdrop.'
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Badges & Indicators', className: 'mt-5 mb-4' }),
            new Row({
                children: [
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Notification Dot', marginBottom: '3' }),
                            new Button({
                                variant: 'dark',
                                className: 'position-relative',
                                children: [
                                    'Messages',
                                    new Badge({
                                        variant: 'danger',
                                        pill: true,
                                        positioned: true,
                                        text: 'New message'
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Numbered Badge', marginBottom: '3' }),
                            new Button({
                                variant: 'primary',
                                className: 'position-relative',
                                children: [
                                    'Inbox',
                                    new Badge({
                                        variant: 'danger',
                                        pill: true,
                                        positioned: true,
                                        text: '99+'
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(6, { text: 'Variations', marginBottom: '3' }),
                            new Box({
                                className: 'd-flex gap-2',
                                children: [
                                    new Badge({ variant: 'primary', text: 'New', pill: true }),
                                    new Badge({ variant: 'success', text: 'Active' }),
                                    new Badge({ variant: 'warning', text: 'Pending' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
