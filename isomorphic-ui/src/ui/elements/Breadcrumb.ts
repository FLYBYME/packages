import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Interface for Breadcrumb root props.
 */
export interface IBreadcrumbProps extends IBaseUIProps {
    divider?: string;
}

/**
 * Breadcrumb Component (nav > ol).
 * Automatically manages ARIA labels and structure.
 */
export class Breadcrumb extends BrokerComponent {
    constructor(props: IBreadcrumbProps = {}) {
        // Handle divider as an inline CSS variable on the nav
        const { divider, ...rest } = props;
        const style = { ...rest.style };
        
        if (divider) {
            style['--bs-breadcrumb-divider'] = divider;
        }

        super('nav', { ...rest, style, 'aria-label': 'breadcrumb' });
    }

    build(): ComponentChild | ComponentChild[] {
        // Recursive Wrapper: The ol is part of the build output to keep API simple
        return new BreadcrumbList({ children: this.props.children });
    }
}

/**
 * Internal primitive for the <ol class="breadcrumb">
 */
class BreadcrumbList extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('ol', props); }
    protected override getBaseClasses() { return 'breadcrumb'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Interface for BreadcrumbItem props.
 */
export interface IBreadcrumbItemProps extends IBaseUIProps {
    active?: boolean;
    href?: string;
}

/**
 * BreadcrumbItem Component (li).
 * Handles the "active" page state and automatic anchor wrapping for non-active links.
 */
export class BreadcrumbItem extends BrokerComponent {
    constructor(props: IBreadcrumbItemProps = {}) {
        super('li', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IBreadcrumbItemProps;
        const classes = ['breadcrumb-item'];
        if (props.active) classes.push('active');
        return classes.join(' ');
    }

    protected override applyDOMProps(props: IBreadcrumbItemProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        // Accessibility Priority: aria-current="page" only on active items
        if (props.active) {
            this.element.setAttribute('aria-current', 'page');
        } else {
            this.element.removeAttribute('aria-current');
        }
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IBreadcrumbItemProps;
        const children = props.text || props.children;

        // Automatically wrap content in an anchor if href provided and not active
        if (props.href && !props.active) {
            return new BreadcrumbAnchor({ href: props.href, children });
        }

        return children;
    }
}

/**
 * Internal primitive for the breadcrumb anchor.
 * Manually sets href since it is in RESERVED_PROPS to prevent leakage on the header LI.
 */
class BreadcrumbAnchor extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('a', props); }
    
    protected override applyDOMProps(props: IBaseUIProps): void {
        super.applyDOMProps(props);
        if (this.element && props.href) {
            this.element.setAttribute('href', props.href as string);
        }
    }

    build() { return this.props.children; }
}
