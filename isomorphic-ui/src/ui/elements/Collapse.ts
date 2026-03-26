import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Unique ID Generator for Collapse bindings.
 */
const generateId = (prefix: string) => prefix + '-' + Math.random().toString(36).substring(2, 9);

/**
 * Props for the Collapse component.
 */
export interface ICollapseProps extends IBaseUIProps {
    show?: boolean;
    horizontal?: boolean;
    onToggle?: (expanded: boolean) => void;
}

/**
 * Collapse Component - Built with Bootstrap 5 '.collapse' classes.
 */
export class Collapse extends BrokerComponent {
    private _id: string;

    constructor(props: ICollapseProps = {}) {
        const id = (props.id as string) || generateId('coll');
        super('div', { ...props, id });
        this._id = id;
    }

    protected override getBaseClasses(): string {
        const props = this.props as ICollapseProps;
        const classes = ['collapse'];
        
        // Contextual state classes
        if (props.show) classes.push('show');
        if (props.horizontal) classes.push('collapse-horizontal');
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        return this.props.children;
    }
}
