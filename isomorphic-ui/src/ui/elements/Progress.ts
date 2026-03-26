import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { ComponentChild } from '../../core/BrokerComponent';

/**
 * Props for the Progress container.
 */
export interface IProgressProps extends IPrimitiveProps {
    height?: string | number;
}

/**
 * Progress - The outer wrapper for one or more progress bars.
 */
export class Progress extends LayoutComponent {
    constructor(props: IProgressProps = {}) { super('div', props); }
    protected override getBaseClasses(): string { return 'progress'; }
    
    protected override getLayoutStyles(props: IProgressProps): Record<string, string | number> {
        const styles = super.getLayoutStyles(props);
        if (props.height) {
            styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
        }
        return styles;
    }

    build(): ComponentChild | ComponentChild[] {
        // Smart behavior: if no children but progress props provided, auto-wrap
        const props = this.props as IProgressBarProps;
        if (!props.children && props.value !== undefined) {
            return new ProgressBar(props);
        }
        return props.children as ComponentChild | ComponentChild[];
    }
}

/**
 * Props for the ProgressBar.
 */
export interface IProgressBarProps extends IPrimitiveProps {
    value?: number;
    min?: number;
    max?: number;
    striped?: boolean;
    animated?: boolean;
    variant?: 'success' | 'info' | 'warning' | 'danger' | 'primary';
    label?: string;
}

/**
 * ProgressBar - The actual bar within the Progress container.
 */
export class ProgressBar extends LayoutComponent {
    constructor(props: IProgressBarProps = {}) {
        super('div', {
            role: 'progressbar',
            ...props
        });
    }

    protected override getBaseClasses(): string {
        const props = this.props as IProgressBarProps;
        const classes = ['progress-bar'];
        
        if (props.variant) classes.push(`bg-${props.variant}`);
        if (props.striped || props.animated) classes.push('progress-bar-striped');
        if (props.animated) classes.push('progress-bar-animated');
        
        return classes.join(' ');
    }

    protected override getLayoutStyles(props: IProgressBarProps): Record<string, string | number> {
        const styles = super.getLayoutStyles(props);
        const value = props.value ?? 0;
        const min = props.min ?? 0;
        const max = props.max ?? 100;
        
        const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
        styles.width = `${percentage}%`;
        
        return styles;
    }

    protected override applyDOMProps(props: IProgressBarProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;

        const el = this.element;
        const value = props.value ?? 0;
        const min = props.min ?? 0;
        const max = props.max ?? 100;

        el.setAttribute('aria-valuenow', String(value));
        el.setAttribute('aria-valuemin', String(min));
        el.setAttribute('aria-valuemax', String(max));
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IProgressBarProps;
        return props.label || props.text || props.children;
    }
}
