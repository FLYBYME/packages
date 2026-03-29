import { Row, Col, FormLabel, FormControl, FloatingLabel, InputGroup, Section, FormSelect, FormCheck, FormRange, FormFeedback, Heading, Badge } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

class InteractiveRangeSlider extends Section {
    private valDisplay: Badge;
    private rangeInput: FormRange;

    constructor() {
        const valDisplay = new Badge({ variant: 'primary', text: '50' });
        const rangeInput = new FormRange({ defaultValue: '50', id: 'interactive-range' });

        super({
            className: 'd-flex align-items-center gap-3 mb-3',
            children: [
                new Section({ flex: 1, children: rangeInput }),
                valDisplay
            ]
        });

        this.valDisplay = valDisplay;
        this.rangeInput = rangeInput;
    }

    override onMount() {
        super.onMount();
        // Attach the event listener to the actual input element once it is mounted in the DOM
        const inputEl = this.rangeInput.element as HTMLInputElement;
        if (inputEl) {
            inputEl.addEventListener('input', (e) => {
                this.valDisplay.setProps({ text: (e.target as HTMLInputElement).value });
            });
        }
    }
}

export class FormsSection extends BaseDemoSection {
    constructor() {
        super('Forms & Inputs', [
            new Heading(5, { text: 'Basic Controls', marginBottom: '3' }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new FormLabel({ text: 'Standard Input' }),
                            new FormControl({ type: 'text', placeholder: 'Enter text...', marginBottom: '3' }),
                            
                            new FloatingLabel({
                                label: 'Email Address (Floating)',
                                children: new FormControl({ type: 'email', placeholder: 'name@example.com' }),
                                marginBottom: '3'
                            }),

                            new FormLabel({ text: 'Sizing' }),
                            new FormControl({ size: 'lg', type: 'text', placeholder: 'Large input', marginBottom: '2' }),
                            new FormControl({ size: 'sm', type: 'text', placeholder: 'Small input', marginBottom: '3' })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new FormLabel({ text: 'Dropdown Selection' }),
                            new FormSelect({
                                marginBottom: '3',
                                children: [
                                    new Section({ tagName: 'option', text: 'Select an option', disabled: true, selected: true }),
                                    new Section({ tagName: 'option', text: 'Edge Computing' }),
                                    new Section({ tagName: 'option', text: 'Mesh Networking' })
                                ]
                            }),
                            new FormLabel({ text: 'Checks & Radios' }),
                            new FormCheck({ label: 'Default Checkbox', marginBottom: '2' }),
                            new FormCheck({ label: 'Toggle Switch', switch: true, marginBottom: '2' }),
                            new FormCheck({ type: 'radio', label: 'Radio Option 1', name: 'radioGroup', marginBottom: '1' }),
                            new FormCheck({ type: 'radio', label: 'Radio Option 2', name: 'radioGroup', marginBottom: '3' })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Validation States', className: 'mt-4 mb-3' }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new FormLabel({ text: 'Valid Input' }),
                            new FormControl({ type: 'text', isValid: true, defaultValue: 'Correct value', marginBottom: '1' }),
                            new FormFeedback({ type: 'valid', text: 'Looks good!', marginBottom: '3' })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new FormLabel({ text: 'Invalid Input' }),
                            new FormControl({ type: 'text', isInvalid: true, placeholder: 'Enter username', marginBottom: '1' }),
                            new FormFeedback({ type: 'invalid', text: 'Please provide a unique username.', marginBottom: '3' })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Advanced Inputs', className: 'mt-4 mb-3' }),
            new Row({
                children: [
                    new Col({
                        span: 4,
                        children: [
                            new FormLabel({ text: 'Date Picker' }),
                            new FormControl({ type: 'date', marginBottom: '3' })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new FormLabel({ text: 'Color Picker' }),
                            new FormControl({ type: 'color', defaultValue: '#0d6efd', title: 'Choose your color', marginBottom: '3' })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new FormLabel({ text: 'Range Slider', htmlFor: 'interactive-range' }),
                            new InteractiveRangeSlider()
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Input Groups', className: 'mt-4 mb-3' }),
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new InputGroup({
                                marginBottom: '3',
                                children: [
                                    new Section({ tagName: 'span', className: 'input-group-text', text: '@' }),
                                    new FormControl({ type: 'text', placeholder: 'Username' })
                                ]
                            }),
                            new InputGroup({
                                marginBottom: '3',
                                children: [
                                    new FormControl({ type: 'text', placeholder: "Recipient's username" }),
                                    new Section({ tagName: 'span', className: 'input-group-text', text: '@example.com' })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new InputGroup({
                                marginBottom: '3',
                                children: [
                                    new Section({ tagName: 'span', className: 'input-group-text', text: '$' }),
                                    new FormControl({ type: 'text', placeholder: 'Amount' }),
                                    new Section({ tagName: 'span', className: 'input-group-text', text: '.00' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
