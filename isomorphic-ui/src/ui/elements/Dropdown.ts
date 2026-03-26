import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';
import { Button, IButtonProps } from './Button';

/**
 * Unique ID Generator for Dropdown bindings.
 */
const generateId = (prefix: string) => prefix + '-' + Math.random().toString(36).substring(2, 9);

/**
 * Internal primitive for rendering raw tags within composites.
 */
class UIPrimitive extends BrokerComponent {
    constructor(tagName: string, props: IBaseUIProps = {}) { 
        super(tagName, props); 
    }
    build() { return this.props.text || this.props.children; }
}

/**
 * Props for the Dropdown container.
 */
export interface IDropdownProps extends Omit<IBaseUIProps, 'direction'> {
    direction?: 'up' | 'end' | 'start';
    split?: boolean;
}

/**
 * Dropdown Root Component.
 * Maps programmatic orientation to Bootstrap dropup/dropend etc.
 */
export class Dropdown extends BrokerComponent {
    private _baseId = generateId('dd');

    constructor(props: IDropdownProps = {}) {
        super('div', props as unknown as IBaseUIProps);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IDropdownProps;
        if (props.split) return 'btn-group';
        
        switch (props.direction) {
            case 'up': return 'dropup';
            case 'end': return 'dropend';
            case 'start': return 'dropstart';
            default: return 'dropdown';
        }
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IDropdownProps;
        const id = this._baseId;
        const children = Array.isArray(props.children) ? props.children : (props.children ? [props.children] : []);

        // Implicitly bind ID from Toggle to Menu
        children.forEach(child => {
            if (child instanceof BrokerComponent) {
                // Check if it's the toggle or the menu
                if (child instanceof DropdownToggle) {
                    (child.props as IBaseUIProps).id = id;
                } else if (child instanceof DropdownMenu) {
                    (child.props as IBaseUIProps)['aria-labelledby'] = id;
                }
            }
        });

        return props.children as ComponentChild | ComponentChild[];
    }
}

/**
 * Props for Dropdown Toggle trigger.
 */
export interface IDropdownToggleProps extends Omit<IButtonProps, 'display'> {
    split?: boolean;
    autoClose?: boolean | 'inside' | 'outside';
    offset?: string;
    display?: 'static';
}

/**
 * Dropdown Toggle trigger (extending Button functionality).
 */
export class DropdownToggle extends Button {
    constructor(props: IDropdownToggleProps = {}) {
        const modifiedProps: IBaseUIProps = { 
            ...props, 
            toggle: 'dropdown',
            'data-bs-toggle': 'dropdown',
            'aria-expanded': 'false'
        } as unknown as IBaseUIProps;

        // Map programmatic props to Bootstrap data attributes
        if (props.autoClose !== undefined) modifiedProps['data-bs-auto-close'] = String(props.autoClose);
        if (props.offset) modifiedProps['data-bs-offset'] = props.offset;
        if (props.display) modifiedProps['data-bs-display'] = props.display;

        super(modifiedProps as unknown as IButtonProps);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IDropdownToggleProps;
        const baseClasses = super.getBaseClasses();
        const classes = [baseClasses, 'dropdown-toggle'];
        if (props.split) classes.push('dropdown-toggle-split');
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IDropdownToggleProps;
        // If split with no label, provide visually hidden hint for accessibility
        if (props.split && !props.children && !props.label) {
            return new UIPrimitive('span', { className: 'visually-hidden', text: 'Toggle Dropdown' });
        }
        return super.build();
    }
}

/**
 * Props for the Dropdown menu.
 */
export interface IDropdownMenuProps extends Omit<IBaseUIProps, 'align'> {
    dark?: boolean;
    align?: 'end' | string;
}

/**
 * Dropdown Menu overlay.
 */
export class DropdownMenu extends BrokerComponent {
    constructor(props: IDropdownMenuProps = {}) {
        super((props.tagName as string) || 'ul', props as unknown as IBaseUIProps);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IDropdownMenuProps;
        const classes = ['dropdown-menu'];
        if (props.dark) classes.push('dropdown-menu-dark');
        if (props.align) {
            if (props.align === 'end') classes.push('dropdown-menu-end');
            else classes.push(`dropdown-menu-${props.align}`);
        }
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Props for Dropdown individual items.
 */
export interface IDropdownItemProps extends IBaseUIProps {
    active?: boolean;
    disabled?: boolean;
    href?: string;
}

/**
 * Individual item in a dropdown menu.
 */
export class DropdownItem extends BrokerComponent {
    constructor(props: IDropdownItemProps = {}) {
        super('li', props);
    }

    build() {
        const props = this.props as IDropdownItemProps;
        const tag = props.tagName || (props.href ? 'a' : 'button');
        const classes = ['dropdown-item'];
        if (props.active) classes.push('active');
        if (props.disabled) classes.push('disabled');

        return new UIPrimitive(tag, {
            ...props,
            className: classes.join(' '),
            'aria-current': props.active ? 'true' : undefined,
            'aria-disabled': props.disabled ? 'true' : undefined
        });
    }
}

/**
 * Header text within a dropdown.
 */
export class DropdownHeader extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('li', props); }
    build() {
        return new UIPrimitive('h6', { 
            className: 'dropdown-header', 
            children: this.props.text || this.props.children 
        });
    }
}

/**
 * Divider line within a dropdown.
 */
export class DropdownDivider extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('li', props); }
    build() {
        return new UIPrimitive('hr', { className: 'dropdown-divider' });
    }
}
