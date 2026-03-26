import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Unique ID Generator for Form Bindings
 */
const generateId = () => 'bs-' + Math.random().toString(36).substring(2, 9);

/**
 * Interface for FormControl props.
 */
export interface IFormControlProps extends IBaseUIProps {
    type?: string;
    size?: 'sm' | 'lg';
    plaintext?: boolean;
    isValid?: boolean;
    isInvalid?: boolean;
}

/**
 * FormControl Component (Input, Textarea, Color, File)
 */
export class FormControl extends BrokerComponent {
    constructor(props: IFormControlProps = {}) {
        super(props.type === 'textarea' ? 'textarea' : 'input', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IFormControlProps;
        const classes = [];
        
        if (props.plaintext) {
            classes.push('form-control-plaintext');
        } else {
            classes.push('form-control');
            if (props.size) classes.push(`form-control-${props.size}`);
        }

        if (props.type === 'color') classes.push('form-control-color');
        if (props.isValid) classes.push('is-valid');
        if (props.isInvalid) classes.push('is-invalid');

        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        return this.props.children || null;
    }
}

/**
 * Interface for FormSelect props.
 */
export interface IFormSelectProps extends IBaseUIProps {
    size?: 'sm' | 'lg';
    isValid?: boolean;
    isInvalid?: boolean;
}

/**
 * FormSelect Component (select)
 */
export class FormSelect extends BrokerComponent {
    constructor(props: IFormSelectProps = {}) {
        super('select', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IFormSelectProps;
        const classes = ['form-select'];
        if (props.size) classes.push(`form-select-${props.size}`);
        if (props.isValid) classes.push('is-valid');
        if (props.isInvalid) classes.push('is-invalid');
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Interface for FormCheck props.
 */
export interface IFormCheckProps extends IBaseUIProps {
    type?: 'checkbox' | 'radio';
    label: string;
    switch?: boolean;
    inline?: boolean;
    toggleButton?: string;
    isValid?: boolean;
    isInvalid?: boolean;
}

/**
 * FormCheck Component (Checkboxes, Radios, Switches, Toggle Buttons)
 * Composite component that manages label binding.
 */
export class FormCheck extends BrokerComponent {
    private _id = generateId();

    constructor(props: IFormCheckProps) {
        super(props.toggleButton ? 'fragment' : 'div', { type: 'checkbox', ...props });
    }

    protected override getBaseClasses(): string {
        const props = this.props as IFormCheckProps;
        if (props.toggleButton) return '';
        
        const classes = ['form-check'];
        if (props.switch) classes.push('form-switch');
        if (props.inline) classes.push('form-check-inline');
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IFormCheckProps;
        const id = props.id || this._id;

        if (props.toggleButton) {
            return [
                new RawFormCheckInput({
                    ...props,
                    id,
                    className: 'btn-check',
                    children: undefined
                }),
                new RawFormCheckLabel({
                    for: id as string,
                    className: `btn btn-${props.toggleButton}`,
                    text: props.label
                })
            ];
        }

        return [
            new RawFormCheckInput({
                ...props,
                id,
                className: 'form-check-input',
                children: undefined
            }),
            new RawFormCheckLabel({
                for: id as string,
                className: 'form-check-label',
                text: props.label
            })
        ];
    }
}

/**
 * Internal primitive for the input portion of a form check.
 */
class RawFormCheckInput extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('input', props); }
    protected override getBaseClasses(): string { 
        const props = this.props as IBaseUIProps;
        const classes = [(props.className as string) || 'form-check-input'];
        if (props.isValid) classes.push('is-valid');
        if (props.isInvalid) classes.push('is-invalid');
        return classes.join(' ');
    }
    build() { return null; }
}

/**
 * Internal primitive for the label portion.
 */
class RawFormCheckLabel extends BrokerComponent {
    constructor(props: IBaseUIProps & { for?: string }) { super('label', props); }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || (this.props.children as ComponentChild | ComponentChild[]); }
}

/**
 * FormRange Component (input type="range")
 */
export class FormRange extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('input', { ...props, type: 'range' }); }
    protected override getBaseClasses(): string { return 'form-range'; }
    build() { return null; }
}

/**
 * Interface for InputGroup props.
 */
export interface IInputGroupProps extends IBaseUIProps {
    size?: 'sm' | 'lg';
    hasValidation?: boolean;
}

/**
 * InputGroup Component (div .input-group)
 */
export class InputGroup extends BrokerComponent {
    constructor(props: IInputGroupProps = {}) { super('div', props); }
    protected override getBaseClasses(): string {
        const props = this.props as IInputGroupProps;
        const classes = ['input-group'];
        if (props.size) classes.push(`input-group-${props.size}`);
        if (props.hasValidation) classes.push('has-validation');
        return classes.join(' ');
    }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * InputGroupText Component (span .input-group-text)
 */
export class InputGroupText extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('span', props); }
    protected override getBaseClasses(): string { return 'input-group-text'; }
    build(): ComponentChild | ComponentChild[] { return this.props.text || this.props.children; }
}

/**
 * FloatingLabel Component (div .form-floating)
 */
export class FloatingLabel extends BrokerComponent {
    private _id = generateId();
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'form-floating'; }
    
    build(): ComponentChild | ComponentChild[] {
        const children = Array.isArray(this.props.children) ? this.props.children : [this.props.children];
        const input = children.find(c => c instanceof FormControl || c instanceof FormSelect);
        
        if (input && input instanceof BrokerComponent) {
            const id = input.props.id || this._id;
            input.props.id = id;
            if (!input.props.placeholder) input.props.placeholder = ' '; 
            
            return [
                input,
                new RawFormCheckLabel({ for: id as string, text: this.props.label as string })
            ];
        }
        return this.props.children;
    }
}

/**
 * FormFeedback Component (div .valid|invalid-feedback)
 */
export class FormFeedback extends BrokerComponent {
    constructor(props: { type: 'valid' | 'invalid', text?: string } & IBaseUIProps) {
        super('div', props);
    }
    protected override getBaseClasses(): string {
        const props = this.props as { type: 'valid' | 'invalid' } & IBaseUIProps;
        return props.type === 'valid' ? 'valid-feedback' : 'invalid-feedback';
    }
    build(): ComponentChild | ComponentChild[] { return this.props.text || this.props.children; }
}

/**
 * FormLabel Component (label .form-label)
 */
export class FormLabel extends BrokerComponent {
    constructor(props: { column?: boolean } & IBaseUIProps = {}) { super('label', props); }
    protected override getBaseClasses(): string {
        const props = this.props as { column?: boolean } & IBaseUIProps;
        return props.column ? 'col-form-label' : 'form-label';
    }
    build(): ComponentChild | ComponentChild[] { return this.props.text || this.props.children; }
}

/**
 * Standard Form Component (form)
 */
export class Form extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('form', props); }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}
