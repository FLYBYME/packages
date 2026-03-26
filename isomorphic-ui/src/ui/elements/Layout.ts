import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';

export interface IContainerProps extends IPrimitiveProps {
    fluid?: boolean;
}

export class Container extends LayoutComponent {
    constructor(props: IContainerProps = {}) { super('div', props); }
    
    protected override getBaseClasses(): string {
        const props = this.props as IContainerProps;
        return props.fluid ? 'container-fluid' : 'container';
    }
    
    build() { return this.props.children || this.props.text; }
}

export interface IRowProps extends IPrimitiveProps {
    cols?: number;
    mdCols?: number;
    gutters?: string;
}

export class Row extends LayoutComponent {
    constructor(props: IRowProps = {}) { super('div', props); }
    
    protected override getBaseClasses(): string {
        const props = this.props as IRowProps;
        const classes = ['row'];
        if (props.cols) classes.push(`row-cols-${props.cols}`);
        if (props.mdCols) classes.push(`row-cols-md-${props.mdCols}`);
        if (props.gutters) classes.push(`g-${props.gutters}`);
        return classes.join(' ');
    }
    
    build() { return this.props.children || this.props.text; }
}

export interface IColProps extends IPrimitiveProps {
    span?: number | 'auto' | boolean;
    mdSpan?: number | 'auto' | boolean;
    lgSpan?: number | 'auto' | boolean;
    xlSpan?: number | 'auto' | boolean;
    xxlSpan?: number | 'auto' | boolean;
}

export class Col extends LayoutComponent {
    constructor(props: IColProps = {}) { super('div', props); }
    
    protected override getBaseClasses(): string {
        const props = this.props as IColProps;
        const classes = [];
        
        if (props.span === true || (props.span === undefined && props.span !== false)) classes.push('col');
        else if (props.span) classes.push(`col-${props.span}`);
        
        if (props.mdSpan === true) classes.push('col-md');
        else if (props.mdSpan) classes.push(`col-md-${props.mdSpan}`);
        
        if (props.lgSpan === true) classes.push('col-lg');
        else if (props.lgSpan) classes.push(`col-lg-${props.lgSpan}`);
        
        if (props.xlSpan === true) classes.push('col-xl');
        else if (props.xlSpan) classes.push(`col-xl-${props.xlSpan}`);
        
        if (props.xxlSpan === true) classes.push('col-xxl');
        else if (props.xxlSpan) classes.push(`col-xxl-${props.xxlSpan}`);
        
        return classes.join(' ');
    }
    
    build() { return this.props.children || this.props.text; }
}

export class Header extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('header', props); }
    build() { return this.props.children || this.props.text; }
}


export class Main extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('main', props); }
    build() { return this.props.children || this.props.text; }
}

export class Section extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('section', props); }
    build() { return this.props.children || this.props.text; }
}

export class Aside extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('aside', props); }
    build() { return this.props.children || this.props.text; }
}

export class Box extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super(props.tagName || 'div', props); }
    build() { return this.props.children || this.props.text; }
}
