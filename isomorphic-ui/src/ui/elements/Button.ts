import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { ComponentChild, IBaseUIProps } from '../../core/BrokerComponent';

/**
 * Highly flexible Bootstrap 5 Button Component.
 * Supports polymorphic tags (<a>, <button>, <input>) and automatic accessibility management.
 */
export interface IButtonProps extends IPrimitiveProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link' | 
               'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
    outline?: boolean;
    size?: 'sm' | 'lg';
    nowrap?: boolean;
    active?: boolean;
    toggle?: boolean | 'collapse' | 'dropdown' | 'modal' | 'tab' | 'pill' | 'offcanvas';
    target?: string;
    label?: string;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    dismiss?: 'modal' | 'offcanvas' | 'alert' | 'toast';
    disabled?: boolean;
}

export class Button extends LayoutComponent {
    constructor(props: IButtonProps = {}) {
        // 1. Tag Polymorphism
        // Prioritize href for anchor detection
        let tag = 'button';
        if (props.href) {
            tag = 'a';
        } else if (props.type && !props.children && ['submit', 'reset', 'button'].includes(props.type)) {
            tag = 'input';
        }

        // 2. Attribute Preparation
        const baseProps: IBaseUIProps = { ...props };
        if (tag === 'button' && !props.type) {
            baseProps.type = 'button';
        }
        
        if (tag === 'a') {
            baseProps.role = 'button';
            if (props.disabled) {
                baseProps['aria-disabled'] = 'true';
                baseProps.tabindex = '-1';
            }
        }
        
        if (tag === 'input') {
            // Map label to 'value' attribute for inputs
            baseProps.value = props.label || props.text;
            baseProps.type = props.type || 'button';
        }
        
        if (tag === 'button' || tag === 'input') {
            if (props.disabled) {
                baseProps.disabled = 'disabled';
            }
        }

        // 3. Toggle & Selection States
        if (props.toggle && props.toggle !== true) {
            baseProps['data-bs-toggle'] = props.toggle;
            
            if (props.target) {
                if (tag === 'a' && props.toggle === 'collapse') {
                    baseProps.href = props.target;
                } else {
                    baseProps['data-bs-target'] = props.target;
                }
                // Strip # for aria-controls
                baseProps['aria-controls'] = props.target.replace(/^#/, '');
            }

            if (props.toggle === 'collapse') {
                baseProps['aria-expanded'] = props.active ? 'true' : 'false';
            }
        } else if (props.toggle === true) {
            baseProps['data-bs-toggle'] = 'button';
            if (props.active) {
                baseProps['aria-pressed'] = 'true';
            }
        }

        if (props.dismiss) {
            baseProps['data-bs-dismiss'] = props.dismiss;
        }

        super(tag, baseProps);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IButtonProps;
        const classes: string[] = ['btn'];
        
        // Contextual Variant & Outline Pattern
        if (props.variant) {
            const isOutlineVariant = props.variant.startsWith('outline-');
            if ((props.outline || isOutlineVariant) && props.variant !== 'link') {
                const baseVariant = isOutlineVariant ? props.variant.replace('outline-', '') : props.variant;
                classes.push(`btn-outline-${baseVariant}`);
            } else {
                classes.push(`btn-${props.variant}`);
            }
        }

        // Bootstrap Sizing
        if (props.size) {
            classes.push(`btn-${props.size}`);
        }

        // Semantic States
        if (props.active) classes.push('active');
        if (props.nowrap) classes.push('text-nowrap');
        
        // Disabled state for non-form tags (anchors)
        if (this.tagName === 'a' && props.disabled) {
            classes.push('disabled');
        }

        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        // Tag-specific content handling
        // Inputs are self-closing; content is in the 'value' attribute
        if (this.tagName === 'input') return null;
        
        const props = this.props as IButtonProps;
        // Composition priority: children > label > text
        return props.children || props.label || props.text;
    }
}
