import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Interface for Table props.
 */
export interface ITableProps extends IBaseUIProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    striped?: boolean;
    hover?: boolean;
    bordered?: boolean;
    borderless?: boolean;
    borderColor?: string;
    compact?: boolean;
    captionTop?: boolean;
    responsive?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    alignVertical?: 'top' | 'middle' | 'bottom';
}

/**
 * Interface for TableHead props.
 */
export interface ITableHeadProps extends IBaseUIProps {
    variant?: 'light' | 'dark';
    alignVertical?: 'top' | 'middle' | 'bottom';
}

/**
 * Interface for TableRow props.
 */
export interface ITableRowProps extends IBaseUIProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    active?: boolean;
    alignVertical?: 'top' | 'middle' | 'bottom';
}

/**
 * Interface for TableCell props.
 */
export interface ITableCellProps extends IBaseUIProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    active?: boolean;
    isHeader?: boolean;
    scope?: 'row' | 'col';
    colspan?: number;
    rowspan?: number;
    alignVertical?: 'top' | 'middle' | 'bottom';
}

/**
 * Interface for TableBody props.
 */
export interface ITableBodyProps extends IBaseUIProps {
    alignVertical?: 'top' | 'middle' | 'bottom';
}

/**
 * Internal raw table component used when a responsive wrapper is needed.
 */
class RawTable extends BrokerComponent {
    constructor(props: ITableProps) {
        super('table', props);
    }

    protected override getBaseClasses(): string {
        const classes = ['table'];
        const props = this.props as ITableProps;
        
        if (props.variant) classes.push(`table-${props.variant}`);
        if (props.striped) classes.push('table-striped');
        if (props.hover) classes.push('table-hover');
        if (props.bordered) classes.push('table-bordered');
        if (props.borderless) classes.push('table-borderless');
        if (props.borderColor) classes.push(`border-${props.borderColor}`);
        if (props.compact) classes.push('table-sm');
        if (props.captionTop) classes.push('caption-top');
        if (props.alignVertical) classes.push(`align-${props.alignVertical}`);
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        return this.props.children;
    }
}

/**
 * Root Table component. Handles responsive wrapping and styling.
 */
export class Table extends BrokerComponent {
    constructor(props: ITableProps = {}) {
        super(props.responsive ? 'div' : 'table', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as ITableProps;
        if (props.responsive) {
            return `table-responsive${props.responsive === true ? '' : `-${props.responsive}`}`;
        }
        
        const classes = ['table'];
        if (props.variant) classes.push(`table-${props.variant}`);
        if (props.striped) classes.push('table-striped');
        if (props.hover) classes.push('table-hover');
        if (props.bordered) classes.push('table-bordered');
        if (props.borderless) classes.push('table-borderless');
        if (props.borderColor) classes.push(`border-${props.borderColor}`);
        if (props.compact) classes.push('table-sm');
        if (props.captionTop) classes.push('caption-top');
        if (props.alignVertical) classes.push(`align-${props.alignVertical}`);
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as ITableProps;
        if (props.responsive) {
            return new RawTable(props);
        }
        return props.children;
    }
}

/**
 * TableHead (thead) component.
 */
export class TableHead extends BrokerComponent {
    constructor(props: ITableHeadProps = {}) { super('thead', props); }
    protected override getBaseClasses(): string {
        const classes = [];
        const props = this.props as ITableHeadProps;
        if (props.variant) classes.push(`table-${props.variant}`);
        if (props.alignVertical) classes.push(`align-${props.alignVertical}`);
        return classes.join(' ');
    }
    build() { return this.props.children; }
}

/**
 * TableBody (tbody) component.
 */
export class TableBody extends BrokerComponent {
    constructor(props: ITableBodyProps = {}) { super('tbody', props); }
    protected override getBaseClasses(): string {
        const props = this.props as ITableBodyProps;
        return props.alignVertical ? `align-${props.alignVertical}` : '';
    }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * TableRow (tr) component.
 */
export class TableRow extends BrokerComponent {
    constructor(props: ITableRowProps = {}) { super('tr', props); }
    protected override getBaseClasses(): string {
        const classes = [];
        const props = this.props as ITableRowProps;
        if (props.variant) classes.push(`table-${props.variant}`);
        if (props.active) classes.push('table-active');
        if (props.alignVertical) classes.push(`align-${props.alignVertical}`);
        return classes.join(' ');
    }
    build() { return this.props.children; }
}

/**
 * TableCell (td or th) component.
 */
export class TableCell extends BrokerComponent {
    constructor(props: ITableCellProps = {}) {
        super(props.isHeader ? 'th' : 'td', props);
    }
    protected override getBaseClasses(): string {
        const classes = [];
        const props = this.props as ITableCellProps;
        if (props.variant) classes.push(`table-${props.variant}`);
        if (props.active) classes.push('table-active');
        if (props.alignVertical) classes.push(`align-${props.alignVertical}`);
        return classes.join(' ');
    }
    protected override applyDOMProps(props: ITableCellProps): void {
        super.applyDOMProps(props);
        if (!this.element) return;
        
        if (props.colspan) this.element.setAttribute('colspan', String(props.colspan));
        else this.element.removeAttribute('colspan');

        if (props.rowspan) this.element.setAttribute('rowspan', String(props.rowspan));
        else this.element.removeAttribute('rowspan');
    }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || this.props.children; }
}
