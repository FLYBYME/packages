import { BrokerComponent, IBaseUIProps, ComponentChild } from './BrokerComponent';

/**
 * Enhanced props for layout and design tokens.
 * Maps to 'mesh-' utility classes.
 */
export interface IPrimitiveProps extends IBaseUIProps {
    grid?: boolean;
    columns?: number;
    flex?: boolean | string | number;
    span?: number | string | boolean;

    // Overflow
    overflow?: 'hidden' | 'auto' | 'scroll' | 'visible';
    overflowX?: 'hidden' | 'auto' | 'scroll' | 'visible';
    overflowY?: 'hidden' | 'auto' | 'scroll' | 'visible';

    // Borders & Shadow
    borderRadius?: string | number;
    border?: string;
    borderTop?: string | boolean;
    borderBottom?: string | boolean;
    borderLeft?: string | boolean;
    borderRight?: string | boolean;
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
        super(tagName, props);
        this.props = props;
    }

    /**
     * Maps IPrimitiveProps to Bootstrap 5 utility class names.
     */
    protected static getLayoutClasses(props: IPrimitiveProps): string[] {
        const classes: string[] = [];

        // 1. Grid & Spanning
        if (props.grid) classes.push('row m-0'); // Bootstrap grid container
        if (props.span) {
            classes.push(`col-${props.span}`);
            classes.push('mesh-min-w-0'); // CRITICAL: Prevents grid items from expanding beyond their math
        }

        // 2. Flexbox (Legacy properties not in StyleProps)
        if (props.flex === true) classes.push('d-flex');

        // 4. Dimensions & Overflow
        if (props.width === 'full') classes.push('w-100');
        if (props.width === 'screen') classes.push('w-100'); // CRITICAL: Must be w-100, NOT vw-100
        if (props.height === 'full') classes.push('h-100');
        if (props.height === 'screen') classes.push('vh-100');
        if (props.overflow) classes.push(`overflow-${props.overflow}`);
        if (props.overflowX) classes.push(`overflow-x-${props.overflowX}`);
        if (props.overflowY) classes.push(`overflow-y-${props.overflowY}`);

        // 5. Borders
        if (props.borderTop) classes.push('border-top border-secondary');
        if (props.borderBottom) classes.push('border-bottom border-secondary');
        if (props.borderLeft) classes.push('border-start border-secondary');
        if (props.borderRight) classes.push('border-end border-secondary');

        // 6. Colors (Mesh custom bg, handled here or in StyleProps. Let's keep bg here as background is not in TypographyProps, it's in IBaseUIProps)
        if (props.background) classes.push(`mesh-bg-${props.background}`);
        // Color is handled by mapStyleProps via TypographyProps

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
        if (typeof props.borderBottom === 'string') styles.borderBottom = props.borderBottom;
        if (typeof props.borderRight === 'string') styles.borderRight = props.borderRight;

        // Arbitrary flex values (not true/false) stay as styles
        if (typeof props.flex === 'number' || (typeof props.flex === 'string' && !['true', 'false'].includes(props.flex))) {
            styles.flex = props.flex;
        } else if (props.flexGrow === 1) {
            // Ensure elements intended to grow can also shrink
            styles.minWidth = 0;
        }

        return styles;
    }

    public abstract override build(): ComponentChild | ComponentChild[];
}
