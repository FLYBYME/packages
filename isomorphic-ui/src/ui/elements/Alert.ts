import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Interface for Alert props.
 */
export interface IAlertProps extends IBaseUIProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' |
               'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
    dismissible?: boolean;
    icon?: string | BrokerComponent;
    onClose?: () => void;
    show?: boolean;
}

/**
 * Alert Component.
 * Supports contextual variants, icons, and programmatic closure.
 */
export class Alert extends BrokerComponent {
    constructor(props: IAlertProps = {}) {
        super('div', { role: 'alert', ...props });
    }

    protected override getBaseClasses(): string {
        const props = this.props as IAlertProps;
        const classes = ['alert'];
        
        if (props.variant) {
            if (props.variant.startsWith('outline-')) {
                const baseVariant = props.variant.replace('outline-', '');
                classes.push('border', `border-${baseVariant}`, `text-${baseVariant}`, 'bg-transparent');
            } else {
                classes.push(`alert-${props.variant}`);
            }
        }
        if (props.dismissible) classes.push('alert-dismissible fade');
        if (props.show !== false) classes.push('show');
        
        if (props.icon) classes.push('d-flex align-items-center');

        return classes.join(' ');
    }

    private handleDismiss() {
        if (this.element) {
            this.element.classList.remove('show');
            setTimeout(() => {
                if ((this.props as IAlertProps).onClose) {
                    (this.props as IAlertProps).onClose!();
                }
                this.dispose();
            }, 150);
        }
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IAlertProps;
        let children = Array.isArray(props.children) ? props.children : (props.children ? [props.children] : []);

        // 1. Icon Injection: Prepended with me-2
        if (props.icon) {
            const iconNode = typeof props.icon === 'string' 
                ? new RawContent('span', { children: props.icon })
                : props.icon;
            
            const wrappedIcon = new AlertIconWrapper({ children: iconNode });
            const contentDiv = new AlertContentWrapper({ children: children });
            children = [wrappedIcon, contentDiv];
        }

        // 2. Close Button Injection
        if (props.dismissible) {
            const closeBtn = new AlertCloseButton({ 
                onClick: () => this.handleDismiss() 
            });
            children.push(closeBtn);
        }

        return children;
    }
}

/**
 * AlertHeading Component (h4 by default)
 */
export class AlertHeading extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { 
        super(props.tagName || 'h4', props); 
    }
    protected override getBaseClasses() { return 'alert-heading'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * AlertLink Component (a)
 */
export class AlertLink extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('a', props); }
    protected override getBaseClasses() { return 'alert-link'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * Internal helper for raw string/children passthrough
 */
class RawContent extends BrokerComponent {
    build() { return this.props.children; }
}

/**
 * Internal helper for alert icons
 */
class AlertIconWrapper extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('div', props); }
    protected override getBaseClasses() { return 'flex-shrink-0 me-2'; }
    build() { return this.props.children; }
}

/**
 * Internal helper for alert structure wrapper
 */
class AlertContentWrapper extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('div', props); }
    build() { return this.props.children; }
}

/**
 * Internal Close Button
 */
class AlertCloseButton extends BrokerComponent {
    constructor(props: IBaseUIProps) { 
        super('button', { ...props, type: 'button', 'aria-label': 'Close' } as IBaseUIProps); 
    }
    protected override getBaseClasses() { return 'btn-close'; }
    build() { return null; }
}
