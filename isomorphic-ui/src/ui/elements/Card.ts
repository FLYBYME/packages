import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Interface for Card component props.
 */
export interface ICardProps extends IBaseUIProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' |
               'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
    border?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'transparent';
    textVariant?: 'white' | 'dark' | 'muted';
    align?: 'start' | 'center' | 'end';
    horizontal?: boolean;
    body?: boolean;
}

/**
 * Root Card component.
 */
export class Card extends BrokerComponent {
    constructor(props: ICardProps = {}) {
        super('div', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as ICardProps;
        const classes = ['card'];
        
        if (props.variant) {
            if (props.variant.startsWith('outline-')) {
                const baseVariant = props.variant.replace('outline-', '');
                classes.push(`border-${baseVariant}`, `text-${baseVariant}`, 'bg-transparent');
            } else {
                classes.push(`bg-${props.variant}`);
            }
        }
        if (props.textVariant) classes.push(`text-${props.textVariant}`);
        if (props.border) classes.push(`border-${props.border}`);
        if (props.align) classes.push(`text-${props.align}`);
        
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as ICardProps;
        let content: ComponentChild | ComponentChild[] = props.children;
        
        // 1. Automatic Body wrapping
        if (props.body) {
            content = new CardBody({ children: content });
        }

        // 2. Horizontal structure wrap
        if (props.horizontal) {
            return new CardHorizontalRow({ children: content });
        }

        return content;
    }
}

/**
 * Internal helper for horizontal card layout.
 */
class CardHorizontalRow extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'row g-0'; }
    build() { return this.props.children; }
}

/**
 * Shared props for Header and Footer.
 */
export interface ICardSectionProps extends IBaseUIProps {
    bgTransparent?: boolean;
    border?: string;
}

/**
 * Card Header component.
 */
export class CardHeader extends BrokerComponent {
    constructor(props: ICardSectionProps = {}) { super('div', props); }
    protected override getBaseClasses(): string {
        const props = this.props as ICardSectionProps;
        const classes = ['card-header'];
        if (props.bgTransparent) classes.push('bg-transparent');
        if (props.border) classes.push(`border-${props.border}`);
        return classes.join(' ');
    }
    build() { return this.props.text || this.props.children; }
}

/**
 * Card Body component.
 */
export class CardBody extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'card-body'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * Card Footer component.
 */
export class CardFooter extends BrokerComponent {
    constructor(props: ICardSectionProps = {}) { super('div', props); }
    protected override getBaseClasses(): string {
        const props = this.props as ICardSectionProps;
        const classes = ['card-footer'];
        if (props.bgTransparent) classes.push('bg-transparent');
        if (props.border) classes.push(`border-${props.border}`);
        return classes.join(' ');
    }
    build() { return this.props.text || this.props.children; }
}

/**
 * Card Title (h5 default).
 */
export class CardTitle extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('h5', props); }
    protected override getBaseClasses() { return 'card-title'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * Card Subtitle (h6 muted default).
 */
export class CardSubtitle extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('h6', props); }
    protected override getBaseClasses() { return 'card-subtitle mb-2 text-muted'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * Card Text (paragraph default).
 */
export class CardText extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('p', props); }
    protected override getBaseClasses() { return 'card-text'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * Card Link (anchor default).
 */
export class CardLink extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('a', props); }
    protected override getBaseClasses() { return 'card-link'; }
    build() { return this.props.text || this.props.children; }
}

/**
 * Props for CardImage.
 */
export interface ICardImageProps extends IBaseUIProps {
    src?: string;
    alt?: string;
    imgCap?: 'top' | 'bottom';
    overlay?: boolean;
}

/**
 * Card Image component.
 */
export class CardImage extends BrokerComponent {
    constructor(props: ICardImageProps = {}) { 
        super('img', { 
            role: props.alt ? undefined : 'img', 
            ...props 
        }); 
    }
    protected override getBaseClasses(): string {
        const props = this.props as ICardImageProps;
        if (props.overlay) return 'card-img';
        if (props.imgCap === 'top') return 'card-img-top';
        if (props.imgCap === 'bottom') return 'card-img-bottom';
        return 'card-img';
    }
    build() { return null; }
}

/**
 * Overlay wrapper for text on images.
 */
export class CardImgOverlay extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'card-img-overlay'; }
    build() { return this.props.children; }
}

/**
 * Container for grouping multiple cards.
 */
export class CardGroup extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'card-group'; }
    build() { return this.props.children; }
}
