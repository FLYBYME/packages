import { Row, Col, Alert, AlertHeading, AlertLink, Section, SmallText, Heading, Badge, Button, Progress, ProgressBar, Spinner, Toast, ToastHeader, ToastBody, ToastContainer } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class FeedbackSection extends BaseDemoSection {
    constructor() {
        super('Feedback & Status', [
            new Row({
                children: [
                    new Col({
                        span: 8,
                        children: [
                            new Heading(5, { text: 'Alerts', marginBottom: '3' }),
                            new Alert({
                                variant: 'info',
                                icon: 'ℹ️',
                                children: 'This is a standard alert with an icon and programmatic layout.'
                            }),
                            new Alert({
                                variant: 'warning',
                                children: [
                                    'A simple warning alert with ',
                                    new AlertLink({ href: '#', text: 'an example link' }),
                                    '. Give it a click if you like.'
                                ]
                            }),
                            new Alert({
                                variant: 'success',
                                dismissible: true,
                                icon: '✅',
                                children: [
                                    new AlertHeading({ text: 'Operation Successful' }),
                                    'Your changes have been deployed to the mesh network.',
                                    new Section({ tagName: 'hr' }),
                                    new SmallText({ children: [
                                        'Need help? ',
                                        new AlertLink({ href: '#', text: 'Read the documentation' })
                                    ]})
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(5, { text: 'Badges', marginBottom: '3' }),
                            new Section({
                                display: 'flex', gap: 2, mb: 4, className: 'flex-wrap',
                                children: [
                                    new Badge({ variant: 'primary', text: 'Default' }),
                                    new Badge({ variant: 'secondary', text: 'Secondary' }),
                                    new Badge({ variant: 'success', pill: true, text: 'Pill' }),
                                    new Badge({ variant: 'warning', text: 'Contrast' }),
                                    new Badge({ variant: 'info', text: 'Info' }),
                                    new Badge({ variant: 'dark', text: 'Dark' })
                                ]
                            }),
                            new Heading(6, { text: 'Button Badges', marginBottom: '2' }),
                            new Section({
                                display: 'flex', gap: 2, className: 'flex-wrap',
                                children: [
                                    new Button({
                                        variant: 'primary',
                                        children: [
                                            'Notifications ',
                                            new Badge({ variant: 'light', text: '4' })
                                        ]
                                    }),
                                    new Button({
                                        variant: 'dark',
                                        children: [
                                            'Inbox ',
                                            new Badge({ variant: 'danger', pill: true, text: 'New message' })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Toasts & Notifications', mt: 4, mb: 3 }),
            new Section({
                padding: 5, mb: 4, className: 'position-relative border rounded bg-light',
                style: { minHeight: '300px' },
                children: [
                    new ToastContainer({
                        padding: 3, className: 'position-absolute bottom-0 end-0',
                        children: [
                            new Toast({
                                delay: 5000,
                                children: [
                                    new ToastHeader({ children: [
                                        new Section({ tagName: 'strong', className: 'me-auto', text: 'System' }),
                                        new Section({ tagName: 'small', text: '11 mins ago' })
                                    ]}),
                                    new ToastBody({ text: 'Deployment successful. Your changes are live across the mesh.' })
                                ]
                            }),
                            new Toast({
                                variant: 'danger',
                                autohide: false,
                                children: new ToastBody({ text: 'Error: Mesh link lost. Retrying...' })
                            })
                        ]
                    }),
                    new Section({ 
                        textAlign: 'center', color: 'muted', 
                        children: 'Toasts will stack here (Bottom-Right)' 
                    })
                ]
            }),

            new Heading(5, { text: 'Progress Tracking', mt: 4, mb: 3 }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Progress({
                                height: 20,
                                mb: 3,
                                children: new ProgressBar({ value: 45, variant: 'primary', label: 'Processing' })
                            }),
                            new Progress({
                                mb: 3,
                                children: new ProgressBar({ value: 75, striped: true, animated: true, variant: 'success', label: 'Uploading...' })
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Progress({
                                mb: 3,
                                children: [
                                    new ProgressBar({ value: 15, variant: 'primary' }),
                                    new ProgressBar({ value: 30, variant: 'success' }),
                                    new ProgressBar({ value: 20, variant: 'info' })
                                ]
                            }),
                            new Progress({
                                height: 5,
                                children: new ProgressBar({ value: 25, variant: 'danger' })
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Loading Indicators', mt: 4, mb: 3 }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Heading(6, { text: 'Border Spinners', marginBottom: '3' }),
                            new Section({
                                display: 'flex', gap: 4, alignItems: 'center', mb: 4,
                                children: [
                                    new Spinner({ variant: 'primary', label: 'Processing...' }),
                                    new Spinner({ variant: 'secondary' }),
                                    new Spinner({ variant: 'success' }),
                                    new Spinner({ variant: 'danger' }),
                                    new Spinner({ variant: 'warning' })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Heading(6, { text: 'Grow Spinners', marginBottom: '3' }),
                            new Section({
                                display: 'flex', gap: 4, alignItems: 'center', mb: 4,
                                children: [
                                    new Spinner({ spinnerType: 'grow', variant: 'primary' }),
                                    new Spinner({ spinnerType: 'grow', variant: 'secondary' }),
                                    new Spinner({ spinnerType: 'grow', variant: 'success' }),
                                    new Spinner({ spinnerType: 'grow', variant: 'danger' }),
                                    new Spinner({ spinnerType: 'grow', variant: 'warning' })
                                ]
                            })
                        ]
                    })
                ]
            }),
            new Heading(6, { text: 'Button Spinners & Sizing', marginBottom: '3' }),
            new Section({
                display: 'flex', gap: 4, alignItems: 'center',
                children: [
                    new Button({
                        variant: 'primary',
                        disabled: true,
                        children: [
                            new Spinner({ spinnerType: 'border', size: 'sm', className: 'me-2' }),
                            'Loading...'
                        ]
                    }),
                    new Button({
                        variant: 'dark',
                        disabled: true,
                        children: [
                            new Spinner({ spinnerType: 'grow', size: 'sm', className: 'me-2' }),
                            'Connecting'
                        ]
                    }),
                    new Spinner({ spinnerType: 'border', style: { width: '3rem', height: '3rem' } }),
                    new Spinner({ spinnerType: 'grow', style: { width: '3rem', height: '3rem' } })
                ]
            })
        ]);
    }
}
