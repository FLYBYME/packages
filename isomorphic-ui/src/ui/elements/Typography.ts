import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

export interface IDisplayHeadingProps extends IBaseUIProps {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    weight?: 'light' | 'normal' | 'bold';
}

export class DisplayHeading extends BrokerComponent {
    constructor(props: IDisplayHeadingProps = {}) { 
        super(`h${props.level || 1}`, props); 
    }
    
    protected override getBaseClasses(): string {
        const props = this.props as IDisplayHeadingProps;
        const classes = [`display-${props.level || 1}`];
        if (props.weight) classes.push(`fw-${props.weight}`);
        return classes.join(' ');
    }
    
    build() { return this.props.text || this.props.children; }
}

export class Heading extends BrokerComponent {
    constructor(level: 1 | 2 | 3 | 4 | 5 | 6, props: IBaseUIProps = {}) {
        super(`h${level}`, props);
    }
    build() { return this.props.text || this.props.children; }
}

export interface ILeadTextProps extends IBaseUIProps {
    muted?: boolean;
}

export class LeadText extends BrokerComponent {
    constructor(props: ILeadTextProps = {}) { super('p', props); }
    
    protected override getBaseClasses(): string {
        const props = this.props as ILeadTextProps;
        const classes = ['fs-5'];
        if (props.muted) classes.push('text-muted');
        return classes.join(' ');
    }
    
    build() { return this.props.text || this.props.children; }
}

export class Text extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) {
        super(props.tagName || 'span', props);
    }

    build(): ComponentChild | ComponentChild[] {
        return (this.props.text as string) !== undefined ? (this.props.text as string) : this.props.children;
    }
}

export interface ISmallTextProps extends IBaseUIProps {
    muted?: boolean;
    displayBlock?: boolean;
}

export class SmallText extends BrokerComponent {
    constructor(props: ISmallTextProps = {}) { super('small', props); }
    
    protected override getBaseClasses(): string {
        const props = this.props as ISmallTextProps;
        const classes = [];
        if (props.muted) classes.push('text-muted');
        if (props.weight) classes.push(`fw-${props.weight}`);
        if (props.displayBlock) classes.push('d-block');
        return classes.join(' ');
    }
    
    build() { return this.props.text || this.props.children; }
}

export class Paragraph extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('p', props); }
    build() { return this.props.text || this.props.children; }
}

export interface IIconProps extends IBaseUIProps {
    name: string;
}

export class Icon extends BrokerComponent {
    constructor(props: IIconProps) {
        // Ensure size and other props pass to super for style processing
        super('i', { ...props, 'data-feather': props.name });
    }
    
    protected override getBaseClasses(): string {
        return 'mesh-icon';
    }
    
    public override onMount(): void {
        const global = window as unknown as Record<string, { replace: () => void }>;
        if (global.feather) {
            global.feather.replace();
        }
    }
    
    build() { return null; }
}

export interface IBootstrapIconProps extends IBaseUIProps {
    name: string;
}

export class BootstrapIcon extends BrokerComponent {
    constructor(props: IBootstrapIconProps) {
        super('i', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IBootstrapIconProps;
        return `bi bi-${props.name}`;
    }

    build() { return null; }
}
