import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Internal primitive for rendering raw tags within the navbar structure.
 */
class UIPrimitive extends BrokerComponent {
    constructor(tagName: string, props: IBaseUIProps = {}) { 
        super(tagName, props); 
    }
    build(): ComponentChild | ComponentChild[] { return (this.props.children as ComponentChild | ComponentChild[]) || (this.props.text as string); }
}

/**
 * Props for the Navbar component.
 */
export interface INavbarProps extends IPrimitiveProps {
    expand?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | boolean;
    variant?: 'light' | 'dark';
    placement?: 'fixed-top' | 'fixed-bottom';
    sticky?: 'top';
    container?: 'fluid' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

/**
 * Navbar - The root container for the navigation bar.
 */
export class Navbar extends LayoutComponent {
    constructor(props: INavbarProps = {}) {
        super('nav', props);
        if (props.placement === 'fixed-top') {
            this.logger.warn('fixed-top used. Ensure body padding is applied to prevent content overlap.');
        }
    }

    protected override getBaseClasses(): string {
        const props = this.props as INavbarProps;
        const classes = ['navbar'];
        
        if (props.expand === true) classes.push('navbar-expand');
        else if (props.expand) classes.push(`navbar-expand-${props.expand}`);
        
        if (props.variant) classes.push(`navbar-${props.variant}`);
        if (props.placement) classes.push(props.placement);
        if (props.sticky) classes.push(`sticky-${props.sticky}`);
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as INavbarProps;
        const containerClass = props.container ? (props.container === 'fluid' ? 'container-fluid' : `container-${props.container}`) : 'container';
        
        // Auto-ID linking for Toggler/Collapse
        const children = Array.isArray(props.children) ? props.children : (props.children ? [props.children] : []);
        const toggler = children.find(c => c instanceof NavbarToggler) as NavbarToggler | undefined;
        const collapse = children.find(c => c instanceof NavbarCollapse) as NavbarCollapse | undefined;
        
        if (toggler && collapse && !(toggler.props as IBaseUIProps).collapseId && !(collapse.props as IBaseUIProps).id) {
            const autoId = `nb-${Math.random().toString(36).substr(2, 5)}`;
            (toggler.props as IBaseUIProps).collapseId = autoId;
            (collapse.props as IBaseUIProps).id = autoId;
        }

        return new UIPrimitive('div', {
            className: containerClass,
            children: props.children
        });
    }
}

/**
 * NavbarBrand - Logo or Title area.
 */
export class NavbarBrand extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { 
        super(props.tagName || (props.href ? 'a' : 'span'), { href: props.href || '#', ...props }); 
    }
    protected override getBaseClasses(): string { return 'navbar-brand'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * NavbarToggler - The hamburger menu button.
 */
export class NavbarToggler extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) {
        super('button', {
            type: 'button',
            'data-bs-toggle': 'collapse',
            'aria-expanded': 'false',
            'aria-label': 'Toggle navigation',
            ...props
        });
    }

    protected override getBaseClasses(): string { return 'navbar-toggler'; }

    protected override applyDOMProps(props: IBaseUIProps): void {
        super.applyDOMProps(props);
        if (this.element && props.collapseId) {
            this.element.setAttribute('data-bs-target', `#${props.collapseId as string}`);
            this.element.setAttribute('aria-controls', props.collapseId as string);
        }
    }

    build() { return new UIPrimitive('span', { className: 'navbar-toggler-icon' }); }
}

/**
 * NavbarCollapse - The hidden region of the navbar.
 */
export class NavbarCollapse extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'collapse navbar-collapse'; }
    build() { return this.props.children; }
}

/**
 * NavbarNav - Wrapper for NavItems in a navbar.
 */
export class NavbarNav extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super(props.tagName || 'ul', props); }
    protected override getBaseClasses(): string {
        const classes = ['navbar-nav'];
        if ((this.props as IPrimitiveProps & { scroll?: boolean }).scroll) classes.push('navbar-nav-scroll');
        return classes.join(' ');
    }
    build() { return this.props.children; }
}

/**
 * NavbarText - Small text block in a navbar.
 */
export class NavbarText extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('span', props); }
    protected override getBaseClasses(): string { return 'navbar-text'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * NavbarItem - Container for NavbarLinks in a NavbarNav.
 */
export class NavbarItem extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('li', props); }
    protected override getBaseClasses(): string { return 'nav-item'; }
    build() { return this.props.children; }
}

/**
 * NavbarLink - Individual link in a NavbarNav.
 */
export class NavbarLink extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { 
        super('a', { 
            href: props.href || '#',
            ...props 
        }); 
    }
    protected override getBaseClasses(): string {
        const props = this.props;
        return 'nav-link cursor-pointer text-nowrap' + (props.active ? ' active' : '');
    }
    build() { return this.props.text || this.props.children; }
}

/**
 * NavbarDropdown - Dropdown container in a NavbarNav.
 */
export class NavbarDropdown extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { 
        super('li', props); 
    }
    protected override getBaseClasses(): string { return 'nav-item dropdown'; }
    build() { return this.props.children; }
}

/**
 * NavbarDropdownToggle - The clickable element that opens the dropdown.
 */
export class NavbarDropdownToggle extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) {
        super('a', {
            href: '#',
            'data-bs-toggle': 'dropdown',
            'aria-expanded': 'false',
            role: 'button',
            ...props
        });
    }
    protected override getBaseClasses(): string { return 'nav-link dropdown-toggle'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * NavbarDropdownMenu - The popup menu of a dropdown.
 */
export class NavbarDropdownMenu extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) {
        super('ul', props);
    }
    protected override getBaseClasses(): string { return 'dropdown-menu shadow-sm'; }
    build() { return this.props.children; }
}

/**
 * NavbarDropdownItem - An item within a NavbarDropdownMenu.
 */
export class NavbarDropdownItem extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) {
        super('li', props);
    }
    build() {
        const { children, text, ...rest } = this.props;
        return new NavbarLink({
            ...rest,
            className: 'dropdown-item cursor-pointer',
            children,
            text
        });
    }
}


/**
 * Pagination Components
 */
export interface IPaginationProps extends IPrimitiveProps {
    size?: 'sm' | 'lg';
    align?: 'center' | 'end';
    ariaLabel?: string;
}

class PaginationList extends LayoutComponent {
    constructor(props: IPaginationProps = {}) { super('ul', props); }
    protected override getBaseClasses(): string {
        const props = this.props as IPaginationProps;
        const classes = ['pagination'];
        if (props.size) classes.push(`pagination-${props.size}`);
        if (props.align) classes.push(`justify-content-${props.align}`);
        return classes.join(' ');
    }
    build() { return this.props.children; }
}

export class Pagination extends LayoutComponent {
    constructor(props: IPaginationProps = {}) { 
        super('nav', { 'aria-label': props.ariaLabel || 'Page navigation', ...props }); 
    }
    build() { 
        const props = this.props as IPaginationProps;
        return new PaginationList({ 
            size: props.size, 
            align: props.align,
            children: props.children 
        }); 
    }
}

export interface IPageItemProps extends IPrimitiveProps {
    active?: boolean;
    disabled?: boolean;
}

export class PageItem extends LayoutComponent {
    constructor(props: IPageItemProps = {}) { super('li', props); }
    protected override getBaseClasses(): string {
        const classes = ['page-item'];
        if (this.props.active) classes.push('active');
        if (this.props.disabled) classes.push('disabled');
        return classes.join(' ');
    }
    protected override applyDOMProps(props: IPageItemProps): void {
        super.applyDOMProps(props);
        if (this.element && props.active) {
            this.element.setAttribute('aria-current', 'page');
        }
    }
    build() { 
        // Pass parent state down to PageLink child if it matches
        const children = Array.isArray(this.props.children) ? this.props.children : [this.props.children];
        return children.map(child => {
            if (child instanceof PageLink) {
                if (this.props.active) (child.props as IPageLinkProps).active = true;
                if (this.props.disabled) (child.props as IPageLinkProps).disabled = true;
            }
            return child;
        });
    }
}

export interface IPageLinkProps extends IPrimitiveProps {
    href?: string;
    label?: string;
    icon?: boolean;
    active?: boolean;
    disabled?: boolean;
}

export class PageLink extends LayoutComponent {
    constructor(props: IPageLinkProps = {}) { 
        // Use span for active/disabled links to follow Bootstrap best practices
        const tagName = (props.active || props.disabled) ? 'span' : 'a';
        super(tagName, { href: props.href || '#', ...props }); 
    }
    
    protected override getBaseClasses(): string { return 'page-link'; }
    
    protected override applyDOMProps(props: IPageLinkProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;
        
        if (props.disabled) {
            this.element.setAttribute('tabindex', '-1');
            this.element.setAttribute('aria-disabled', 'true');
        }
        
        if (props.label) {
            this.element.setAttribute('aria-label', props.label);
        }
    }

    build() { 
        const props = this.props as IPageLinkProps;
        const content = props.text || props.children;
        if (props.icon) {
            return new UIPrimitive('span', {
                'aria-hidden': 'true',
                children: content
            });
        }
        return content;
    }
}

/**
 * Sidebar - Vertical navigation container.
 */
export class Sidebar extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { 
        super('aside', props); 
    }
    
    protected override getBaseClasses(): string {
        return 'mesh-sidebar d-flex flex-column h-100';
    }
    
    build() { return this.props.children; }
}

