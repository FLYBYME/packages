import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { ComponentChild, BrokerComponent, IBaseUIProps } from '../../core/BrokerComponent';

declare const bootstrap: {
    Tooltip: { new (el: HTMLElement, options?: unknown): { dispose: () => void } };
};

export interface ITooltipProps extends IPrimitiveProps {
    tooltipTitle?: string;
    placement?: 'top' | 'right' | 'bottom' | 'left';
    trigger?: 'hover' | 'focus' | 'click' | 'manual';
    html?: boolean;
    animation?: boolean;
    delay?: number | { show: number, hide: number };
    container?: string;
    customClass?: string;
    offset?: string;
}

/**
 * Tooltip - A programmatic Bootstrap 5 Tooltip trigger.
 * Handles automatic initialization, attributes, and disabled wrappers.
 */
export class Tooltip extends LayoutComponent {
    private instance: unknown = null;

    constructor(props: ITooltipProps = {}) {
        // Tag resolve logic - Use span wrapper by default
        const tag = props.tagName || 'span';
        
        // Detection for disabled child (Best effort)
        const children = (props.children ? (Array.isArray(props.children) ? props.children : [props.children]) : []) as ComponentChild[];
        const hasDisabledChild = children.length === 1 && children[0] instanceof BrokerComponent && (children[0].props as IBaseUIProps).disabled === true;
        const isDisabled = (props as IBaseUIProps).disabled === true || hasDisabledChild;
        
        const modifiedProps: IBaseUIProps = { 
            ...props,
            'data-bs-toggle': 'tooltip',
            tabindex: (props.tagName && props.tagName !== 'span' && props.tagName !== 'div') ? undefined : '0'
        };

        if (isDisabled) {
            modifiedProps.className = (modifiedProps.className || '') + ' d-inline-block';
            modifiedProps.tabindex = '0'; // Ensure keyboard focusable for tooltip firing
        }
        
        super(tag, modifiedProps);
    }

    protected override applyDOMProps(props: ITooltipProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        const el = this.element;
        if (props.tooltipTitle) el.setAttribute('title', props.tooltipTitle);
        if (props.placement) el.setAttribute('data-bs-placement', props.placement);
        if (props.trigger) el.setAttribute('data-bs-trigger', props.trigger);
        if (props.html === true) el.setAttribute('data-bs-html', 'true');
        if (props.animation === false) el.setAttribute('data-bs-animation', 'false');
        if (props.delay) el.setAttribute('data-bs-delay', JSON.stringify(props.delay));
        if (props.container) el.setAttribute('data-bs-container', props.container);
        if (props.customClass) el.setAttribute('data-bs-custom-class', props.customClass);
        if (props.offset) el.setAttribute('data-bs-offset', props.offset);
    }

    public override onMount(): void {
        super.onMount();
        if (this.props.tooltipTitle && typeof window !== 'undefined' && typeof bootstrap !== 'undefined' && this.element) {
            this.instance = new bootstrap.Tooltip(this.element);
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
