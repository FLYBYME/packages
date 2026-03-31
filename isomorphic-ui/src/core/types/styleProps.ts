export type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 'auto' | '0' | '1' | '2' | '3' | '4' | '5' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface BreakpointSpacingObj {
    xs?: Spacing;
    sm?: Spacing;
    md?: Spacing;
    lg?: Spacing;
    xl?: Spacing;
    xxl?: Spacing;
}

export type BreakpointSpacing = Spacing | BreakpointSpacingObj;

export interface MarginProps {
    m?: BreakpointSpacing;
    mt?: BreakpointSpacing;
    mb?: BreakpointSpacing;
    ml?: BreakpointSpacing; // Maps to ms-
    mr?: BreakpointSpacing; // Maps to me-
    mx?: BreakpointSpacing;
    my?: BreakpointSpacing;
    marginTop?: BreakpointSpacing;
    marginBottom?: BreakpointSpacing;
    marginLeft?: BreakpointSpacing;
    marginRight?: BreakpointSpacing;
    marginX?: BreakpointSpacing;
    marginY?: BreakpointSpacing;
    margin?: BreakpointSpacing;
}

export interface PaddingProps {
    p?: BreakpointSpacing;
    pt?: BreakpointSpacing;
    pb?: BreakpointSpacing;
    pl?: BreakpointSpacing; // Maps to ps-
    pr?: BreakpointSpacing; // Maps to pe-
    px?: BreakpointSpacing;
    py?: BreakpointSpacing;
    padding?: BreakpointSpacing;
    paddingTop?: BreakpointSpacing;
    paddingBottom?: BreakpointSpacing;
    paddingLeft?: BreakpointSpacing;
    paddingRight?: BreakpointSpacing;
    paddingX?: BreakpointSpacing;
    paddingY?: BreakpointSpacing;
}

export type DisplayMode = 'flex' | 'inline-flex' | 'none' | 'block' | 'inline-block' | 'grid';

export interface BreakpointDisplay {
    xs?: DisplayMode;
    sm?: DisplayMode;
    md?: DisplayMode;
    lg?: DisplayMode;
    xl?: DisplayMode;
    xxl?: DisplayMode;
}

export interface FlexProps {
    display?: DisplayMode | BreakpointDisplay;
    flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse' | 'col' | 'col-reverse';
    justifyContent?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
    alignItems?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    alignSelf?: 'auto' | 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse' | boolean;
    flexGrow?: 0 | 1;
    flexShrink?: 0 | 1;
    order?: 0 | 1 | 2 | 3 | 4 | 5 | 'first' | 'last';
    gap?: Spacing;
}

export interface TypographyProps {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    fontWeight?: 'light' | 'normal' | 'medium' | 'bold' | 'bolder';
    fontSize?: 1 | 2 | 3 | 4 | 5 | 6; // Mapping to fs-1, fs-2, etc.
    fontFamily?: 'monospace' | 'sans-serif' | 'serif';
    fontStyle?: 'italic' | 'normal';
    textDecoration?: 'none' | 'underline' | 'line-through';
    textTransform?: 'lowercase' | 'uppercase' | 'capitalize';
    color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'muted' | 'white' | string;
    lineHeight?: 1 | 'sm' | 'base' | 'lg';
    textWrap?: 'wrap' | 'nowrap' | 'break';
}

export interface PositionProps {
    position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
    top?: 0 | 50 | 100 | string | number;
    bottom?: 0 | 50 | 100 | string | number;
    left?: 0 | 50 | 100 | string | number;
    right?: 0 | 50 | 100 | string | number;
    zIndex?: number | string;
}

export interface StyleProps extends MarginProps, PaddingProps, FlexProps, TypographyProps, PositionProps {
}
