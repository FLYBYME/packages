import { BrokerComponent, IBaseUIProps, ComponentChild } from './BrokerComponent';

/**
 * Enhanced props for layout and design tokens.
 * Maps to 'mesh-' utility classes.
 */
export interface IPrimitiveProps extends IBaseUIProps {
    // Layout
    display?: 'flex' | 'grid' | 'block';
    grid?: boolean;
    columns?: number;
    flex?: boolean | string | number;
    direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    span?: number | string | boolean;
    gap?: string | number;
    padding?: string | number;
    margin?: string | number;
    marginTop?: string | number;
    marginBottom?: string | number;
    marginLeft?: string | number;
    marginRight?: string | number;
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean | 'wrap' | 'nowrap' | 'reverse';
    overflow?: 'hidden' | 'auto' | 'scroll' | 'visible';
    overflowX?: 'hidden' | 'auto' | 'scroll' | 'visible';
    overflowY?: 'hidden' | 'auto' | 'scroll' | 'visible';
    textWrap?: 'nowrap';
    
    // Typography
    color?: string;
    background?: string;
    fontSize?: string | number;
    fontWeight?: string | number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: string | number;
    
    // Borders & Shadow
    borderRadius?: string | number;
    border?: string;
    borderBottom?: string;
    borderRight?: string;
    boxShadow?: string;
    
    // Dimensions (Explicit, arbitrary values stay as styles)
    width?: string | number;
    height?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
}

/**
 * LayoutComponent - The engine for semantic components.
 * Maps properties to CSS utility classes.
 */
export abstract class LayoutComponent extends BrokerComponent {
    public override props: IPrimitiveProps;

    constructor(tagName: string = 'div', props: IPrimitiveProps = {}) {
        // 1. Resolve Utility Classes from Props
        const layoutClasses = LayoutComponent.getLayoutClasses(props);
        
        // 2. Merge with existing className
        const className = [props.className, ...layoutClasses]
            .filter(Boolean)
            .join(' ');

        const finalProps = { ...props, className };

        super(tagName, finalProps);
        this.props = finalProps;
    }

    /**
     * Maps IPrimitiveProps to Bootstrap 5 utility class names.
     */
    protected static getLayoutClasses(props: IPrimitiveProps): string[] {
        const classes: string[] = [];
        const spaceMap: Record<string, string> = { xs: '1', sm: '2', md: '3', lg: '4', xl: '5' };

        // 1. Grid & Spanning
        if (props.display === 'grid' || props.grid) classes.push('row m-0'); // Bootstrap grid container
        if (props.span) {
            classes.push(`col-${props.span}`);
            classes.push('mesh-min-w-0'); // CRITICAL: Prevents grid items from expanding beyond their math
        }
        
        // 2. Flexbox
        if (props.flex === true || props.direction) classes.push('d-flex');
        if (props.direction === 'col') classes.push('flex-column');
        if (props.direction === 'row') classes.push('flex-row');
        if (props.align) classes.push(`align-items-${props.align}`);
        if (props.justify) classes.push(`justify-content-${props.justify}`);
        if (props.wrap === 'nowrap') classes.push('flex-nowrap');
        else if (props.wrap) classes.push('flex-wrap');

        // 3. Spacing (Mapped 1-5)
        // 3. Spacing (Mapped 1-5, or literal 0-5)
        if (props.padding !== undefined) classes.push(`p-${spaceMap[props.padding] ?? props.padding}`);
        if (props.margin !== undefined) classes.push(`m-${spaceMap[props.margin] ?? props.margin}`);
        if (props.marginTop !== undefined) classes.push(`mt-${spaceMap[props.marginTop] ?? props.marginTop}`);
        if (props.marginBottom !== undefined) classes.push(`mb-${spaceMap[props.marginBottom] ?? props.marginBottom}`);
        if (props.gap !== undefined) classes.push(`gap-${spaceMap[props.gap] ?? props.gap}`);

        // 4. Dimensions & Overflow
        if (props.width === 'full') classes.push('w-100');
        if (props.width === 'screen') classes.push('w-100'); // CRITICAL: Must be w-100, NOT vw-100
        if (props.height === 'full') classes.push('h-100');
        if (props.height === 'screen') classes.push('vh-100');
        if (props.overflow) classes.push(`overflow-${props.overflow}`);
        if (props.overflowX) classes.push(`overflow-x-${props.overflowX}`);
        if (props.overflowY) classes.push(`overflow-y-${props.overflowY}`);
        
        // 5. Typography
        if (props.textWrap === 'nowrap') classes.push('text-nowrap');
        if (props.fontWeight === 'bold') classes.push('fw-bold');
        if (props.textAlign) classes.push(`text-${props.textAlign}`);

        // 6. Colors (We use custom mesh classes here so StyleEngine can apply manifest hex codes)
        if (props.background) classes.push(`mesh-bg-${props.background}`);
        if (props.color) classes.push(`mesh-text-${props.color}`);
        if (props.borderRight) classes.push('border-end border-secondary');
        if (props.borderBottom) classes.push('border-bottom border-secondary');

        return classes;
    }

    /**
     * Only applies explicit, arbitrary dimensions as inline styles.
     * All design tokens are handled via className.
     */
    protected override getLayoutStyles(props: IPrimitiveProps): Record<string, string | number> {
        const styles: Record<string, string | number> = {};

        // Explicit dimensions only if NOT a utility class
        if (props.width && !['full', 'screen'].includes(String(props.width))) {
            styles.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
        }
        if (props.height && !['full', 'screen'].includes(String(props.height))) {
            styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
        }
        if (props.minWidth) styles.minWidth = typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth;
        if (props.minHeight) styles.minHeight = typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight;
        if (props.maxWidth) styles.maxWidth = typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth;
        if (props.maxHeight) styles.maxHeight = typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;

        if (props.border) styles.border = props.border;
        if (props.borderBottom) styles.borderBottom = props.borderBottom;
        if (props.borderRight) styles.borderRight = props.borderRight;

        // Arbitrary flex values (not true/false) stay as styles
        if (typeof props.flex === 'number' || (typeof props.flex === 'string' && !['true', 'false'].includes(props.flex))) {
            styles.flex = props.flex;
        } else if (props.className?.includes('flex-grow-1')) {
            // Ensure elements intended to grow can also shrink
            styles.minWidth = 0;
        }

        return styles;
    }

    public abstract override build(): ComponentChild | ComponentChild[];
}
