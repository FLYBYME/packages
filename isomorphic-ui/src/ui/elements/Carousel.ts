import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Unique ID Generator for Carousel bindings.
 */
const generateId = (prefix: string) => prefix + '-' + Math.random().toString(36).substring(2, 9);

/**
 * Props for Carousel component.
 */
export interface ICarouselProps extends IBaseUIProps {
    fade?: boolean;
    dark?: boolean;
    ride?: 'carousel' | boolean;
    interval?: number | false;
    touch?: boolean;
    controls?: boolean;
    indicators?: boolean;
}

/**
 * Root Carousel component.
 */
export class Carousel extends BrokerComponent {
    private _id: string;

    constructor(props: ICarouselProps = {}) {
        const id = (props.id as string) || generateId('car');
        const modifiedProps: IBaseUIProps = { ...props, id };
        
        // Map programmatic props to Bootstrap data attributes
        if (props.ride) modifiedProps['data-bs-ride'] = props.ride === true ? 'carousel' : props.ride;
        if (props.interval !== undefined) modifiedProps['data-bs-interval'] = String(props.interval);
        if (props.touch === false) modifiedProps['data-bs-touch'] = 'false';
        
        super('div', modifiedProps);
        this._id = id;
    }

    protected override getBaseClasses(): string {
        const props = this.props as ICarouselProps;
        const classes = ['carousel', 'slide'];
        if (props.fade) classes.push('carousel-fade');
        if (props.dark) classes.push('carousel-dark');
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as ICarouselProps;
        let children = Array.isArray(props.children) ? props.children : (props.children ? [props.children] : []);
        
        // 1. Enforcement: Ensure at least one item is active
        children = this.ensureActive(children);
        
        const id = this._id;
        const results: ComponentChild[] = [];

        // 2. Optional Indicators
        if (props.indicators) {
            results.push(new CarouselIndicators({ 
                count: children.length, 
                target: id 
            }));
        }

        // 3. Carousel Inner (required wrapper)
        results.push(new CarouselInner({ children }));

        // 4. Optional Controls
        if (props.controls) {
            results.push(new CarouselControl({ slide: 'prev', target: id }));
            results.push(new CarouselControl({ slide: 'next', target: id }));
        }

        return results;
    }

    private ensureActive(items: ComponentChild[]): ComponentChild[] {
        if (items.length === 0) return items;
        const hasActive = items.some(item => item instanceof BrokerComponent && (item.props as ICarouselItemProps).active);
        if (!hasActive && items[0] instanceof BrokerComponent) {
            (items[0].props as ICarouselItemProps).active = true;
        }
        return items;
    }
}

/**
 * Props for individual carousel items.
 */
export interface ICarouselItemProps extends IBaseUIProps {
    active?: boolean;
    interval?: number;
}

/**
 * Individual Carousel Item.
 */
export class CarouselItem extends BrokerComponent {
    constructor(props: ICarouselItemProps = {}) { 
        const modifiedProps: IBaseUIProps = { ...props };
        if (props.interval) modifiedProps['data-bs-interval'] = String(props.interval);
        super('div', modifiedProps); 
    }
    
    protected override getBaseClasses(): string {
        const props = this.props as ICarouselItemProps;
        const classes = ['carousel-item'];
        if (props.active) classes.push('active');
        return classes.join(' ');
    }
    
    build() { return this.props.children; }
}

/**
 * Inner wrapper for carousel slides.
 */
class CarouselInner extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'carousel-inner'; }
    build() { return this.props.children; }
}

/**
 * Optional caption for carousel slides.
 */
export class CarouselCaption extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'carousel-caption d-none d-md-block'; }
    build() { return this.props.children; }
}

/**
 * Internal control component for navigation.
 */
interface ICarouselControlProps extends IBaseUIProps {
    slide: 'prev' | 'next';
    target: string;
}

class CarouselControl extends BrokerComponent {
    constructor(props: ICarouselControlProps) {
        super('button', {
            ...props,
            type: 'button',
            'data-bs-target': `#${props.target}`,
            'data-bs-slide': props.slide
        });
    }
    
    protected override getBaseClasses(): string {
        const props = this.props as ICarouselControlProps;
        return `carousel-control-${props.slide}`;
    }
    
    build() {
        const props = this.props as ICarouselControlProps;
        const iconClass = `carousel-control-${props.slide}-icon`;
        const label = props.slide === 'prev' ? 'Previous' : 'Next';
        return [
            new CarouselSpan({ className: iconClass, 'aria-hidden': 'true' }),
            new CarouselSpan({ className: 'visually-hidden', text: label })
        ];
    }
}

/**
 * Internal indicators block.
 */
interface ICarouselIndicatorsProps extends IBaseUIProps {
    count: number;
    target: string;
}

class CarouselIndicators extends BrokerComponent {
    constructor(props: ICarouselIndicatorsProps) { super('div', props); }
    protected override getBaseClasses() { return 'carousel-indicators'; }
    build() {
        const props = this.props as ICarouselIndicatorsProps;
        const buttons: ComponentChild[] = [];
        for (let i = 0; i < props.count; i++) {
            buttons.push(new CarouselButton({
                'data-bs-target': `#${props.target}`,
                'data-bs-slide-to': String(i),
                className: i === 0 ? 'active' : '',
                'aria-current': i === 0 ? 'true' : undefined,
                'aria-label': `Slide ${i + 1}`
            }));
        }
        return buttons;
    }
}

/**
 * Primitive helpers.
 */
class CarouselSpan extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('span', props); }
    build() { return this.props.children; }
}

class CarouselButton extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('button', { ...props, type: 'button' }); }
    build() { return this.props.children; }
}
