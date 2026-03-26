import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';

/**
 * Interface for group-specific properties.
 */
export interface IButtonGroupProps extends IPrimitiveProps {
    vertical?: boolean;
    size?: 'sm' | 'lg';
    ariaLabel?: string;
}

/**
 * ButtonGroup - Composable container for action sets.
 * Automatically manages roles and handles toggle-button flattening.
 */
export class ButtonGroup extends LayoutComponent {
    constructor(props: IButtonGroupProps = {}) {

        // Map ariaLabel prop to native HTML attribute
        const finalProps = {
            role: 'group',
            'aria-label': props.ariaLabel,
            ...props
        };

        super('div', finalProps);

        // Enforce accessibility labels for screen readers
        if (!props.ariaLabel) {
            this.logger.warn('ariaLabel prop is missing. A label is highly recommended for accessibility.');
        }
    }

    protected override getBaseClasses(): string {
        const props = this.props as IButtonGroupProps;
        // Switches from .btn-group to .btn-group-vertical if vertical: true
        const classes: string[] = [props.vertical ? 'btn-group-vertical' : 'btn-group'];

        if (props.size) {
            classes.push(`btn-group-${props.size}`);
        }

        return classes.join(' ');
    }

    build() {
        return this.props.children;
    }
}

/**
 * ButtonToolbar - Container for multiple ButtonGroups or InputGroups.
 */
export class ButtonToolbar extends LayoutComponent {
    constructor(props: IButtonGroupProps = {}) {
        // Map ariaLabel prop to native HTML attribute
        const finalProps = {
            role: 'toolbar',
            'aria-label': props.ariaLabel,
            ...props
        };

        super('div', finalProps);

        if (!props.ariaLabel) {
            this.logger.warn('ariaLabel prop is missing. A label is highly recommended for accessibility.');
        }
    }

    protected override getBaseClasses(): string {
        return 'btn-toolbar';
    }

    build() {
        return this.props.children;
    }
}
