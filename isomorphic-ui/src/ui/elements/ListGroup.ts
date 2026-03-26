import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Props for the ListGroup container.
 */
export interface IListGroupProps extends IBaseUIProps {
    flush?: boolean;
    numbered?: boolean;
    horizontal?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

/**
 * ListGroup - A flexible and powerful component for displaying a series of content.
 * Replaces core List component with Bootstrap 5 capabilities.
 */
export class ListGroup extends BrokerComponent {
    constructor(props: IListGroupProps = {}) {
        let tag = (props.tagName as string) || 'ul';
        if (props.numbered) {
            tag = 'ol';
        } else {
            const children = Array.isArray(props.children) ? props.children : (props.children ? [props.children] : []);
            // Bootstrap Best Practice: Use <div> if items are actionable (links or buttons)
            const hasActions = children.some(c => {
                if (c instanceof BrokerComponent) {
                    const cp = c.props as IListGroupItemProps;
                    return cp.href || cp.tagName === 'button' || cp.action;
                }
                return false;
            });
            if (hasActions && !props.tagName) tag = 'div';
        }
        super(tag, props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IListGroupProps;
        const classes = ['list-group'];
        
        if (props.flush) classes.push('list-group-flush');
        if (props.numbered) classes.push('list-group-numbered');
        
        if (props.horizontal) {
            if (props.horizontal === true) classes.push('list-group-horizontal');
            else classes.push(`list-group-horizontal-${props.horizontal}`);
        }
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Props for individual ListGroup items.
 */
export interface IListGroupItemProps extends IBaseUIProps {
    active?: boolean;
    disabled?: boolean;
    action?: boolean;
    href?: string;
}

/**
 * Individual ListGroup item.
 * Supports polymorphic tags (li, a, button) and automated 'action' state classes.
 */
export class ListGroupItem extends BrokerComponent {
    constructor(props: IListGroupItemProps = {}) {
        let tag = (props.tagName as string) || 'li';
        if (props.href) {
            tag = 'a';
        }
        
        const modifiedProps: IBaseUIProps = { ...props };
        
        // Automated accessibility attributes
        if (props.active) modifiedProps['aria-current'] = 'true';
        if (props.disabled) {
            modifiedProps['aria-disabled'] = 'true';
            if (tag === 'button') modifiedProps.disabled = 'disabled';
        }

        super(tag, modifiedProps);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IListGroupItemProps;
        const classes = ['list-group-item'];
        
        if (props.active) classes.push('active');
        if (props.disabled) classes.push('disabled');
        
        // Action class logic: Links and buttons are inherently actionable
        const isActionable = this.tagName === 'a' || this.tagName === 'button' || props.action;
        if (isActionable && props.action !== false) {
            classes.push('list-group-item-action');
        }
        
        if (props.variant) classes.push(`list-group-item-${props.variant}`);
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || this.props.children; }
}

/**
 * Legacy Support / Primitive helpers
 */
export class List extends ListGroup {
    protected override getBaseClasses(): string {
        const props = this.props as IListGroupProps & { unstyled?: boolean };
        if (props.unstyled) return 'list-unstyled';
        return super.getBaseClasses();
    }
}

export class ListItem extends ListGroupItem {}
