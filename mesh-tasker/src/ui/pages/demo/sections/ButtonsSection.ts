import { Section, Button, Heading, Row, Col, ButtonGroup, ButtonToolbar, InputGroup, InputGroupText, FormControl, FormCheck } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class ButtonsSection extends BaseDemoSection {
    constructor() {
        super('Buttons & Actions', [
            new Heading(5, { text: 'Base Variations', marginBottom: '3' }),
            new Section({
                display: 'flex', gap: 3, alignItems: 'center', mb: 4, className: 'flex-wrap',
                children: [
                    new Button({ variant: 'primary', label: 'Primary Action' }),
                    new Button({ variant: 'secondary', outline: true, label: 'Secondary Outline' }),
                    new Button({ variant: 'danger', size: 'sm', label: 'Delete' }),
                    new Button({ variant: 'success', toggle: true, label: 'Toggle State' }),
                    new Button({ variant: 'link', label: 'Simple Link' }),
                    new Button({ variant: 'primary', disabled: true, label: 'Disabled' })
                ]
            }),

            new Heading(5, { text: 'Button Sizes', mt: 4, mb: 3 }),
            new Section({
                display: 'flex', gap: 3, alignItems: 'center', mb: 4,
                children: [
                    new Button({ variant: 'primary', size: 'lg', label: 'Large Button' }),
                    new Button({ variant: 'primary', label: 'Default Button' }),
                    new Button({ variant: 'primary', size: 'sm', label: 'Small Button' })
                ]
            }),

            new Heading(5, { text: 'Outline Variations', mt: 4, mb: 3 }),
            new Section({
                display: 'flex', gap: 3, alignItems: 'center', mb: 4, className: 'flex-wrap',
                children: [
                    new Button({ variant: 'primary', outline: true, label: 'Primary' }),
                    new Button({ variant: 'secondary', outline: true, label: 'Secondary' }),
                    new Button({ variant: 'success', outline: true, label: 'Success' }),
                    new Button({ variant: 'danger', outline: true, label: 'Danger' }),
                    new Button({ variant: 'warning', outline: true, label: 'Warning' }),
                    new Button({ variant: 'info', outline: true, label: 'Info' })
                ]
            }),

            new Heading(5, { text: 'Block Buttons', mt: 4, mb: 3 }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: new Button({ variant: 'primary', fullWidth: true, mb: 2, label: 'Block Button 1' })
                    }),
                    new Col({
                        span: 6,
                        children: new Button({ variant: 'secondary', fullWidth: true, mb: 2, label: 'Block Button 2' })
                    })
                ]
            }),

            new Heading(5, { text: 'Button Groups', mt: 4, mb: 3 }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new ButtonGroup({
                                ariaLabel: 'Basic example',
                                children: [
                                    new Button({ variant: 'secondary', label: 'Left' }),
                                    new Button({ variant: 'secondary', label: 'Middle' }),
                                    new Button({ variant: 'secondary', label: 'Right' })
                                ]
                            }),
                            new Section({ mt: 3 }),
                            new ButtonGroup({
                                vertical: true,
                                children: [
                                    new Button({ variant: 'dark', label: 'Top' }),
                                    new Button({ variant: 'dark', label: 'Middle' }),
                                    new Button({ variant: 'dark', label: 'Bottom' })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new ButtonToolbar({
                                ariaLabel: 'Toolbar example',
                                children: [
                                    new ButtonGroup({
                                        className: 'me-2',
                                        children: [
                                            new Button({ variant: 'primary', outline: true, label: '1' }),
                                            new Button({ variant: 'primary', outline: true, label: '2' })
                                        ]
                                    }),
                                    new InputGroup({
                                        children: [
                                            new InputGroupText({ text: '@' }),
                                            new FormControl({ type: 'text', placeholder: 'Search...' })
                                        ]
                                    })
                                ]
                            }),
                            new Section({ mt: 4 }),
                            new ButtonGroup({
                                ariaLabel: 'Toggle group',
                                children: [
                                    new FormCheck({ type: 'checkbox', toggleButton: 'outline-primary', label: 'Check 1' }),
                                    new FormCheck({ type: 'checkbox', toggleButton: 'outline-primary', label: 'Check 2' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
