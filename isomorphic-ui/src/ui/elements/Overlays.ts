import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Internal primitive for common fragments.
 */
class UIPrimitive extends BrokerComponent {
    constructor(tagName: string, props: IBaseUIProps = {}) { super(tagName, props); }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || (this.props.children as ComponentChild | ComponentChild[]); }
}

export interface IOffcanvasProps extends IPrimitiveProps {
    placement?: 'start' | 'end' | 'top' | 'bottom';
    backdrop?: boolean | 'static';
    scroll?: boolean;
    show?: boolean;
}

/**
 * Offcanvas - A programmatic Bootstrap 5 sidebar system.
 * Handles automatic linkages, ARIA, and backdrop configurations.
 */
export class Offcanvas extends LayoutComponent {
    private generatedId: string;

    constructor(props: IOffcanvasProps = {}) {
        const id = (props.id as string) || `oc-${Math.random().toString(36).substr(2, 9)}`;
        super('div', { 
            id,
            tabindex: '-1', 
            'aria-hidden': !props.show ? 'true' : undefined,
            ...props 
        });
        this.generatedId = id;
    }

    protected override getBaseClasses(): string {
        const props = this.props as IOffcanvasProps;
        const classes = ['offcanvas'];
        classes.push(`offcanvas-${props.placement || 'start'}`);
        if (props.show) classes.push('show');
        return classes.join(' ');
    }

    protected override applyDOMProps(props: IOffcanvasProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        const el = this.element;
        if (props.scroll === true) el.setAttribute('data-bs-scroll', 'true');
        if (props.backdrop !== undefined) el.setAttribute('data-bs-backdrop', String(props.backdrop));
    }

    build(): ComponentChild | ComponentChild[] {
        const children = (this.props.children ? (Array.isArray(this.props.children) ? this.props.children : [this.props.children]) : []) as ComponentChild[];
        
        let titleId: string | undefined;
 
        // Auto-ARIA linkage logic
        return children.map(child => {
            if (child && child instanceof BrokerComponent && (child.constructor as typeof OffcanvasHeader).isOffcanvasHeader) {
                // Peek into header for title
                const headerChildren = (child.props.children ? (Array.isArray(child.props.children) ? child.props.children : [child.props.children]) : []) as ComponentChild[];
                const titleMatch = headerChildren.find(hc => hc && hc instanceof BrokerComponent && (hc.constructor as typeof OffcanvasTitle).isOffcanvasTitle);
                if (titleMatch && titleMatch instanceof BrokerComponent) {
                    titleId = (titleMatch.props.id as string) || `oc-title-${this.generatedId}`;
                    (titleMatch.props as IBaseUIProps).id = titleId; // Ensure title has this id
                    // Apply to root
                    if (this.element && titleId) this.element.setAttribute('aria-labelledby', titleId);
                }
            }
            return child;
        }) as ComponentChild[];
    }
}

export class OffcanvasHeader extends LayoutComponent {
    static readonly isOffcanvasHeader = true;
    constructor(props: IPrimitiveProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'offcanvas-header'; }
    build(): ComponentChild | ComponentChild[] {
        const children = (this.props.children ? (Array.isArray(this.props.children) ? this.props.children : [this.props.children]) : []) as ComponentChild[];
        const dismissBtn = new UIPrimitive('button', {
            type: 'button',
            className: 'btn-close text-reset',
            'data-bs-dismiss': 'offcanvas',
            'aria-label': 'Close'
        });
        
        return [
            ...children,
            dismissBtn
        ] as ComponentChild[];
    }
}

export class OffcanvasTitle extends LayoutComponent {
    static readonly isOffcanvasTitle = true;
    constructor(props: IPrimitiveProps = {}) { super('h5', props); }
    protected override getBaseClasses(): string { return 'offcanvas-title'; }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || (this.props.children as ComponentChild | ComponentChild[]); }
}

export class OffcanvasBody extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'offcanvas-body'; }
    build(): ComponentChild | ComponentChild[] { return (this.props.children as ComponentChild | ComponentChild[]) || (this.props.text as string); }
}
