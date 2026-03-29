import { Row, Col, Heading, Button, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Section } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class ModalSection extends BaseDemoSection {
    constructor() {
        super('Modals & Dialogs', [
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Triggering Modals', marginBottom: '3' }),
                            new Section({
                                className: 'd-flex gap-3 flex-wrap',
                                children: [
                                    new Button({ 
                                        variant: 'primary', 
                                        label: 'Standard Modal',
                                        toggle: 'modal',
                                        target: '#demoModal'
                                    }),
                                    new Button({ 
                                        variant: 'secondary', 
                                        label: 'Static Backdrop',
                                        toggle: 'modal',
                                        target: '#staticModal'
                                    }),
                                    new Button({ 
                                        variant: 'info', 
                                        label: 'Scrollable Content',
                                        toggle: 'modal',
                                        target: '#scrollableModal'
                                    })
                                ]
                            }),

                            // The Modal Components (Placed in-page for the demo triggers)
                            new Modal({
                                id: 'demoModal',
                                centered: true,
                                children: [
                                    new ModalHeader({ children: new ModalTitle({ text: 'Standard Modal Title' }) }),
                                    new ModalBody({ children: 'This is a vertically centered modal dialog.' }),
                                    new ModalFooter({
                                        children: [
                                            new Button({ variant: 'secondary', label: 'Close', dismiss: 'modal' }),
                                            new Button({ variant: 'primary', label: 'Save Changes' })
                                        ]
                                    })
                                ]
                            }),

                            new Modal({
                                id: 'staticModal',
                                staticBackdrop: true,
                                children: [
                                    new ModalHeader({ children: new ModalTitle({ text: 'Static Backdrop Modal' }) }),
                                    new ModalBody({ children: 'This modal will not close when you click outside or press ESC.' }),
                                    new ModalFooter({
                                        children: new Button({ variant: 'primary', label: 'Understood', dismiss: 'modal' })
                                    })
                                ]
                            }),

                            new Modal({
                                id: 'scrollableModal',
                                scrollable: true,
                                children: [
                                    new ModalHeader({ children: new ModalTitle({ text: 'Scrollable Modal' }) }),
                                    new ModalBody({ children: new Section({ style: { height: '800px' }, children: 'This content is very tall to demonstrate scrolling behavior within the modal body. Keep scrolling down...' }) }),
                                    new ModalFooter({
                                        children: new Button({ variant: 'secondary', label: 'Close', dismiss: 'modal' })
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Modal Sizing & Fullscreen', marginBottom: '3' }),
                            new Section({
                                className: 'd-flex gap-3 flex-wrap',
                                children: [
                                    new Button({ 
                                        variant: 'success', 
                                        label: 'Large Modal',
                                        toggle: 'modal',
                                        target: '#profileModal'
                                    }),
                                    new Button({ 
                                        variant: 'dark', 
                                        label: 'Fullscreen Modal',
                                        toggle: 'modal',
                                        target: '#fullscreenModal'
                                    })
                                ]
                            }),

                            new Modal({
                                id: 'profileModal',
                                size: 'lg',
                                children: [
                                    new ModalHeader({ children: new ModalTitle({ text: 'User Profile' }) }),
                                    new ModalBody({
                                        children: new Row({
                                            children: [
                                                new Col({ span: 4, children: new Section({ className: 'p-4 bg-light text-center rounded', text: '👤 Avatar' }) }),
                                                new Col({ span: 8, children: [
                                                    new Heading(4, { text: 'John Mesh' }),
                                                    new Section({ text: 'Senior Network Architect', className: 'text-muted mb-3' }),
                                                    'Managing 50+ clusters in US-West regions.'
                                                ]})
                                            ]
                                        })
                                    }),
                                    new ModalFooter({
                                        children: new Button({ variant: 'secondary', label: 'Close', dismiss: 'modal' })
                                    })
                                ]
                            }),

                            new Modal({
                                id: 'fullscreenModal',
                                fullscreen: true,
                                children: [
                                    new ModalHeader({ children: new ModalTitle({ text: 'Fullscreen View' }) }),
                                    new ModalBody({ children: 'This modal takes up the entire screen width and height.' }),
                                    new ModalFooter({
                                        children: new Button({ variant: 'secondary', label: 'Close Fullscreen', dismiss: 'modal' })
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
