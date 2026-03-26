import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { ComponentChild, BrokerComponent, IBaseUIProps } from '../../core/BrokerComponent';

declare const bootstrap: {
    Popover: { new (el: HTMLElement, options?: unknown): { dispose: () => void } };
    Tooltip: { new (el: HTMLElement, options?: unknown): { dispose: () => void } };
};

export interface IPopoverProps extends IPrimitiveProps {
    popoverTitle?: string;
    content?: string;
    placement?: 'top' | 'right' | 'bottom' | 'left';
    trigger?: 'click' | 'hover' | 'focus';
    html?: boolean;
    sanitize?: boolean;
    container?: string;
}

/**
 * Popover - A programmatic Bootstrap 5 Popover trigger.
 * Handles automatic initialization and lifecycle management.
 */
export class Popover extends LayoutComponent {
    private instance: unknown = null;

    constructor(props: IPopoverProps = {}) {
        // Tag resolve logic
        const tag = props.tagName || (props.href ? 'a' : 'button');
        
        // Disabled wrapper logic
        const isDisabled = (props as IBaseUIProps).disabled === true || (props.children instanceof BrokerComponent && (props.children.props as IBaseUIProps).disabled === true);
        
        const modifiedProps: IBaseUIProps = { 
            ...props,
            'data-bs-toggle': 'popover',
            tabindex: '0'
        };

        if (tag === 'a') modifiedProps.role = 'button';
        
        super(isDisabled ? 'span' : tag, modifiedProps);
        
        if (isDisabled) {
             this.props.className = (this.props.className || '') + ' d-inline-block';
        }
    }

    protected override applyDOMProps(props: IPopoverProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        const el = this.element;
        if (props.popoverTitle) el.setAttribute('title', props.popoverTitle);
        if (props.content) el.setAttribute('data-bs-content', props.content);
        if (props.placement) el.setAttribute('data-bs-placement', props.placement);
        if (props.trigger) el.setAttribute('data-bs-trigger', props.trigger);
        
        // Default container to 'body' for Popper.js awareness as per spec
        el.setAttribute('data-bs-container', props.container || 'body');
        
        if (props.html) el.setAttribute('data-bs-html', 'true');
        if (props.sanitize === false) el.setAttribute('data-bs-sanitize', 'false');
        if ((props as IBaseUIProps).offset) el.setAttribute('data-bs-offset', String((props as IBaseUIProps).offset));
    }

    public override onMount(): void {
        super.onMount();
        if (typeof window !== 'undefined' && typeof bootstrap !== 'undefined' && this.element) {
            this.instance = new bootstrap.Popover(this.element, {
                sanitize: this.props.sanitize !== false
            });
        }
    }

    public override dispose(): void {
        if (this.instance) {
            (this.instance as { dispose: () => void }).dispose();
            this.instance = null;
        }
        super.dispose();
    }
 
    build(): ComponentChild | ComponentChild[] {
        return (this.props.children as ComponentChild | ComponentChild[]) || (this.props.text as string);
    }
}
