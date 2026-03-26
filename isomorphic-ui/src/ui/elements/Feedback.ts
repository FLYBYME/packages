import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

declare const bootstrap: {
    Toast: { new (el: HTMLElement, options?: unknown): { show: () => void, dispose: () => void } };
    Popover: { new (el: HTMLElement, options?: unknown): { dispose: () => void } };
    Tooltip: { new (el: HTMLElement, options?: unknown): { dispose: () => void } };
};

/**
 * Internal primitive for accessibility labels and common fragments.
 */
class UIPrimitive extends BrokerComponent {
    constructor(tagName: string, props: IBaseUIProps = {}) { super(tagName, props); }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || (this.props.children as ComponentChild | ComponentChild[]); }
}

/**
 * Props for the Spinner component.
 */
export interface ISpinnerProps extends IPrimitiveProps {
    spinnerType?: 'border' | 'grow';
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    size?: 'sm';
    label?: string;
}

/**
 * Spinner - A lightweight Bootstrap 5 loading indicator.
 */
export class Spinner extends LayoutComponent {
    constructor(props: ISpinnerProps = {}) { super('div', { role: 'status', ...props }); }
    protected override getBaseClasses(): string {
        const props = this.props as ISpinnerProps;
        const type = props.spinnerType || 'border';
        const classes = [`spinner-${type}`];
        if (props.variant) classes.push(`text-${props.variant}`);
        if (props.size) classes.push(`spinner-${type}-${props.size}`);
        return classes.join(' ');
    }
    build(): ComponentChild | ComponentChild[] {
        const props = this.props as ISpinnerProps;
        const msg = props.label || 'Loading...';
        const children = (this.props.children ? (Array.isArray(this.props.children) ? this.props.children : [this.props.children]) : []) as ComponentChild[];
        return [
            ...children,
            new UIPrimitive('span', { className: 'visually-hidden', text: msg })
        ] as ComponentChild[];
    }
}

/**
 * ToastContainer - Wrapper for stacking notifications.
 */
export class ToastContainer extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'toast-container'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Props for the Toast component.
 */
export interface IToastProps extends IBaseUIProps {
    autohide?: boolean;
    delay?: number;
    animation?: boolean;
    variant?: string;
    role?: 'alert' | 'status';
}

/**
 * Toast - A programmatic Bootstrap 5 notification box.
 */
export class Toast extends LayoutComponent {
    private instance: { show: () => void, dispose: () => void } | null = null;

    constructor(props: IToastProps = {}) {
        super('div', {
            role: props.role || 'alert',
            'aria-live': (props.role === 'status' ? 'polite' : 'assertive'),
            'aria-atomic': 'true',
            ...props
        });
    }

    protected override getBaseClasses(): string {
        const props = this.props as IToastProps;
        const classes = ['toast'];
        if (props.variant) {
            classes.push(`bg-${props.variant}`, 'text-white', 'border-0');
        }
        return classes.join(' ');
    }

    protected override applyDOMProps(props: IToastProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        const el = this.element;
        if (props.autohide === false) el.setAttribute('data-bs-autohide', 'false');
        if (props.delay) el.setAttribute('data-bs-delay', String(props.delay));
        if (props.animation === false) el.setAttribute('data-bs-animation', 'false');
    }

    public override onMount(): void {
        super.onMount();
        if (typeof window !== 'undefined' && typeof bootstrap !== 'undefined' && this.element) {
            // Defer slightly to ensure Bootstrap can find the element in the final DOM layout
            requestAnimationFrame(() => {
                if (!this.element) return;
                try {
                    this.instance = new bootstrap.Toast(this.element);
                    this.instance.show();
                } catch (e) {
                    this.logger.warn('Bootstrap initialization failed:', { error: (e as Error).message });
                }
            });
        }
    }

    public override dispose(): void {
        if (this.instance) {
            this.instance.dispose();
            this.instance = null;
        }
        super.dispose();
    }

    build(): ComponentChild | ComponentChild[] {
        // Pass variant info down for potential white button requirement
        const children = Array.isArray(this.props.children) ? this.props.children : [this.props.children];
        return children.map(child => {
            if (child instanceof ToastHeader && this.props.variant) {
                (child.props as IBaseUIProps & { isDark?: boolean }).isDark = true;
            }
            return child;
        }) as ComponentChild[];
    }
}

/**
 * ToastHeader & ToastBody
 */
export class ToastHeader extends LayoutComponent {
    constructor(props: IBaseUIProps & { isDark?: boolean } = {}) { super('div', props); }
    protected override getBaseClasses(): string { 
        return 'toast-header' + ((this.props as IBaseUIProps & { isDark?: boolean }).isDark ? ' bg-transparent text-white border-0' : ''); 
    }
    build(): ComponentChild | ComponentChild[] {
        const children = (this.props.children ? (Array.isArray(this.props.children) ? this.props.children : [this.props.children]) : []) as ComponentChild[];
        const dismissBtn = new UIPrimitive('button', {
            type: 'button',
            className: 'btn-close' + (this.props.isDark ? ' btn-close-white' : '') + ' me-2 m-auto',
            'data-bs-dismiss': 'toast',
            'aria-label': 'Close'
        });
        
        return [
            ...children,
            dismissBtn
        ] as ComponentChild[];
    }
}

export class ToastBody extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'toast-body'; }
    build() { return this.props.text || this.props.children; }
}
