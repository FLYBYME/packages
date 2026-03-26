import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Interface for Badge props.
 */
export interface IBadgeProps extends IBaseUIProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' |
               'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
    pill?: boolean;
    indicator?: boolean;
    positioned?: boolean;
    hiddenText?: string;
}

/**
 * Badge Component.
 * Supports contextual variants, pill shapes, and positioned indicators/dots.
 */
export class Badge extends BrokerComponent {
    constructor(props: IBadgeProps = {}) {
        super(props.tagName || 'span', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IBadgeProps;
        const classes: string[] = [];
        
        if (props.indicator) {
            // Notification dots need sizing and display context
            classes.push('p-2', 'border', 'border-light', 'rounded-circle', 'd-inline-block');
        } else {
            classes.push('badge');
            if (props.pill) classes.push('rounded-pill');
        }

        // Contextual Colors
        if (props.variant) {
            if (props.variant.startsWith('outline-')) {
                const baseVariant = props.variant.replace('outline-', '');
                classes.push('border', `border-${baseVariant}`, `text-${baseVariant}`, 'bg-transparent');
            } else {
                classes.push(`bg-${props.variant}`);
                // Accessibility: warning, info, and light need dark text for contrast
                if (['warning', 'info', 'light'].includes(props.variant)) {
                    classes.push('text-dark');
                }
            }
        }

        
        // Positioning (Requires .position-relative on parent)
        if (props.positioned) {
            classes.push('position-absolute', 'top-0', 'start-100', 'translate-middle');
        }

        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IBadgeProps;
        const children = props.text || props.children;
        const result: ComponentChild[] = Array.isArray(children) ? children : (children ? [children] : []);

        // Screen reader context for badges/indicators
        if (props.hiddenText) {
            result.push(new VisuallyHidden({ text: props.hiddenText }));
        }

        return result;
    }
}

/**
 * Internal helper for screen-reader-only content.
 */
class VisuallyHidden extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('span', props); }
    protected override getBaseClasses() { return 'visually-hidden'; }
    build() { 
        const props = this.props as IBaseUIProps;
        return props.text || props.children; 
    }
}
