import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Internal primitive for rendering raw tags within the navigation structure.
 */
class UIPrimitive extends BrokerComponent {
    constructor(tagName: string, props: IBaseUIProps = {}) { 
        super(tagName, props); 
    }
    build(): ComponentChild | ComponentChild[] { return (this.props.children as ComponentChild | ComponentChild[]) || (this.props.text as string); }
}

/**
 * Props for the Nav component.
 */
export interface INavProps extends IBaseUIProps {
    variant?: 'tabs' | 'pills';
    vertical?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    fill?: boolean;
    justified?: boolean;
    align?: 'center' | 'end';
}

/**
 * Nav - The container for navigation links and tabs.
 */
export class Nav extends BrokerComponent {
    constructor(props: INavProps = {}) {
        // Default to <nav> unless specifically used as a list
        const tagName = (props as INavProps & { isList?: boolean }).isList ? 'ul' : 'nav';
        super(tagName, props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as INavProps;
        const classes = ['nav'];
        if (props.variant) classes.push(`nav-${props.variant}`);
        if (props.vertical === true) classes.push('flex-column');
        else if (typeof props.vertical === 'string') classes.push(`flex-${props.vertical}-column`);
        if (props.fill) classes.push('nav-fill');
        if (props.justified) classes.push('nav-justified');
        if (props.align) classes.push(`justify-content-${props.align}`);
        return classes.join(' ');
    }

    protected override applyDOMProps(props: INavProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        const hasTabs = Array.isArray(props.children) 
            ? props.children.some(c => c instanceof BrokerComponent && (c.props as INavItemProps).paneId)
            : (props.children instanceof BrokerComponent && (props.children.props as INavItemProps).paneId);

        if (hasTabs) {
            this.element.setAttribute('role', 'tablist');
            if (props.vertical) this.element.setAttribute('aria-orientation', 'vertical');
        }
    }

    build(): ComponentChild | ComponentChild[] { 
        const isList = this.tagName === 'ul';
        const children = Array.isArray(this.props.children) ? this.props.children : (this.props.children ? [this.props.children] : []);
        
        return (children as ComponentChild[]).map(child => {
            if (isList && child instanceof NavItem) {
                // Tell NavItem it needs to be an <li>
                (child.props as INavItemProps & { isListItem?: boolean }).isListItem = true;
            }
            return child;
        });
    }
}

/**
 * Props for NavItem.
 */
export interface INavItemProps extends IBaseUIProps {
    href?: string;
    active?: boolean;
    disabled?: boolean;
    paneId?: string;
}

/**
 * NavItem - Supports both standalone links and wrapped list items.
 */
export class NavItem extends BrokerComponent {
    constructor(props: INavItemProps = {}) {
        // Tag resolve happens in build() if it's a wrapper, 
        // but the root of THIS component will be the outer tag.
        super('div', props); // Temporary, build() will determine structure
    }

    protected override getBaseClasses(): string {
        const props = this.props as INavItemProps & { isListItem?: boolean };
        if (props.isListItem) return 'nav-item';
        
        const classes = ['nav-link'];
        if (props.active) classes.push('active');
        if (props.disabled) classes.push('disabled');
        return classes.join(' ');
    }

    protected override applyDOMProps(props: INavItemProps): void {
        super.applyDOMProps(props);
        if (!this.element || props.isListItem) return;

        // Apply ARIA and Data attributes directly to the element if it's the trigger (not wrapped)
        if (props.paneId) {
            this.element.setAttribute('data-bs-toggle', 'tab');
            this.element.setAttribute('data-bs-target', `#${props.paneId}`);
            this.element.setAttribute('role', 'tab');
            this.element.setAttribute('aria-selected', props.active ? 'true' : 'false');
            this.element.setAttribute('aria-controls', props.paneId);
        } else if (props.active) {
            this.element.setAttribute('aria-current', 'page');
        }
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as INavItemProps & { isListItem?: boolean };
        const isListItem = props.isListItem;
        const triggerTag = props.href ? 'a' : 'button';
        
        if (isListItem) {
            this.tagName = 'li';
            const triggerProps: IBaseUIProps = {
                className: ['nav-link', props.active ? 'active' : '', props.disabled ? 'disabled' : ''].filter(Boolean).join(' '),
                children: props.children || props.text
            };

            if (props.href) triggerProps.href = props.href;
            if (props.disabled) {
                triggerProps.tabindex = '-1';
                triggerProps['aria-disabled'] = 'true';
            }

            if (props.paneId) {
                triggerProps['data-bs-toggle'] = 'tab';
                triggerProps['data-bs-target'] = `#${props.paneId}`;
                triggerProps.role = 'tab';
                triggerProps['aria-selected'] = props.active ? 'true' : 'false';
                triggerProps['aria-controls'] = props.paneId;
            } else if (props.active) {
                triggerProps['aria-current'] = 'page';
            }

            return new UIPrimitive(triggerTag, triggerProps);
        }

        // Parent Nav must handle tag updates for non-list items or we do it here
        this.tagName = triggerTag;
        return (props.children as ComponentChild | ComponentChild[]) || (props.text as string);
    }
}

/**
 * TabContent & TabPane
 */
export class TabContent extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'tab-content'; }
    build() { return this.props.children; }
}

export class TabPane extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses(): string {
        const props = this.props as IBaseUIProps & { fade?: boolean, active?: boolean };
        const classes = ['tab-pane'];
        if (props.fade) classes.push('fade');
        if (props.active) classes.push('show', 'active');
        return classes.join(' ');
    }
    protected override applyDOMProps(props: IBaseUIProps): void {
        super.applyDOMProps(props);
        if (this.element) this.element.setAttribute('role', 'tabpanel');
    }
    build() { return this.props.children; }
}
