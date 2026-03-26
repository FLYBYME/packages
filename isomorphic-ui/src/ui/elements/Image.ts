import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';

export interface IImageProps extends IPrimitiveProps {
    src: string;
    alt?: string;
    fluid?: boolean;
    thumbnail?: boolean;
}

export class Image extends LayoutComponent {
    constructor(props: IImageProps) { super('img', props); }
    
    protected override getBaseClasses(): string {
        const props = this.props as IImageProps;
        const classes = [];
        if (props.fluid) classes.push('img-fluid');
        if (props.thumbnail) classes.push('img-thumbnail');
        return classes.join(' ');
    }
    
    build() { return null; }
}

export class Figure extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('figure', props); }
    protected override getBaseClasses(): string { return 'figure'; }
    build() { return this.props.children; }
}

export class FigureImage extends Image {
    protected override getBaseClasses(): string {
        return `figure-img ${super.getBaseClasses()}`;
    }
}

export class FigureCaption extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('figcaption', props); }
    protected override getBaseClasses(): string { return 'figure-caption'; }
    build() { return this.props.text || this.props.children; }
}
