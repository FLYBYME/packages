import { MarginProps, PaddingProps, FlexProps, TypographyProps, BreakpointSpacing, PositionProps } from '../types/styleProps';

const spaceMap: Record<string, string> = { xs: '1', sm: '2', md: '3', lg: '4', xl: '5' };

export const mapPositionProps = (props: PositionProps): string[] => {
    const classes: string[] = [];
    if (props.position) classes.push(`position-${props.position}`);
    if ([0, 50, 100].includes(props.top as number)) classes.push(`top-${props.top}`);
    if ([0, 50, 100].includes(props.bottom as number)) classes.push(`bottom-${props.bottom}`);
    if ([0, 50, 100].includes(props.left as number)) classes.push(`start-${props.left}`);
    if ([0, 50, 100].includes(props.right as number)) classes.push(`end-${props.right}`);
    return classes;
};

const resolveSpacing = (prefix: string, value: BreakpointSpacing | undefined): string[] => {
    if (value === undefined) return [];
    if (typeof value === 'number' || value === 'auto' || typeof value === 'string') {
        const mappedValue = spaceMap[value as string] ?? value;
        return [`${prefix}-${mappedValue}`];
    }
    const classes: string[] = [];
    if (value.xs !== undefined) classes.push(`${prefix}-${spaceMap[value.xs as string] ?? value.xs}`);
    if (value.sm !== undefined) classes.push(`${prefix}-sm-${spaceMap[value.sm as string] ?? value.sm}`);
    if (value.md !== undefined) classes.push(`${prefix}-md-${spaceMap[value.md as string] ?? value.md}`);
    if (value.lg !== undefined) classes.push(`${prefix}-lg-${spaceMap[value.lg as string] ?? value.lg}`);
    if (value.xl !== undefined) classes.push(`${prefix}-xl-${spaceMap[value.xl as string] ?? value.xl}`);
    if (value.xxl !== undefined) classes.push(`${prefix}-xxl-${spaceMap[value.xxl as string] ?? value.xxl}`);
    return classes;
};

export const mapMarginProps = (props: MarginProps): string[] => {
    const classes: string[] = [];
    classes.push(...resolveSpacing('m', props.m ?? props.margin));
    classes.push(...resolveSpacing('mt', props.mt ?? props.marginTop));
    classes.push(...resolveSpacing('mb', props.mb ?? props.marginBottom));
    classes.push(...resolveSpacing('ms', props.ml ?? props.marginLeft));
    classes.push(...resolveSpacing('me', props.mr ?? props.marginRight));
    classes.push(...resolveSpacing('mx', props.mx ?? props.marginX));
    classes.push(...resolveSpacing('my', props.my ?? props.marginY));
    return classes;
};

export const mapPaddingProps = (props: PaddingProps): string[] => {
    const classes: string[] = [];
    classes.push(...resolveSpacing('p', props.p ?? props.padding));
    classes.push(...resolveSpacing('pt', props.pt ?? props.paddingTop));
    classes.push(...resolveSpacing('pb', props.pb ?? props.paddingBottom));
    classes.push(...resolveSpacing('ps', props.pl ?? props.paddingLeft));
    classes.push(...resolveSpacing('pe', props.pr ?? props.paddingRight));
    classes.push(...resolveSpacing('px', props.px ?? props.paddingX));
    classes.push(...resolveSpacing('py', props.py ?? props.paddingY));
    return classes;
};

export const mapFlexProps = (props: FlexProps): string[] => {
    const classes: string[] = [];
    if (props.display) classes.push(`d-${props.display}`);
    const dir = props.flexDirection ?? props.direction;
    if (dir) {
        if (dir === 'row') classes.push('flex-row');
        if (dir === 'column' || dir === 'col') classes.push('flex-column');
        if (dir === 'row-reverse') classes.push('flex-row-reverse');
        if (dir === 'column-reverse' || dir === 'col-reverse') classes.push('flex-column-reverse');
    }
    if (props.justifyContent) classes.push(`justify-content-${props.justifyContent}`);
    if (props.alignItems) classes.push(`align-items-${props.alignItems}`);
    if (props.alignSelf) classes.push(`align-self-${props.alignSelf}`);
    if (props.flexWrap) {
        const wrapClass = props.flexWrap === true ? 'wrap' : props.flexWrap;
        classes.push(`flex-${wrapClass}`);
    }
    if (props.flexGrow !== undefined) classes.push(`flex-grow-${props.flexGrow}`);
    if (props.flexShrink !== undefined) classes.push(`flex-shrink-${props.flexShrink}`);
    if (props.order !== undefined) classes.push(`order-${props.order}`);
    if (props.gap !== undefined) classes.push(`gap-${spaceMap[props.gap as string] ?? props.gap}`);
    return classes;
};

export const mapTypographyProps = (props: TypographyProps): string[] => {
    const classes: string[] = [];
    if (props.textAlign) classes.push(`text-${props.textAlign}`);
    if (props.fontWeight) classes.push(`fw-${props.fontWeight}`);
    if (props.fontSize) classes.push(`fs-${props.fontSize}`);
    if (props.fontFamily) classes.push(`font-${props.fontFamily}`);
    if (props.fontStyle) classes.push(`fst-${props.fontStyle}`);
    if (props.textDecoration) classes.push(`text-decoration-${props.textDecoration}`);
    if (props.textTransform) classes.push(`text-${props.textTransform}`);
    if (props.color) {
        classes.push(props.color.startsWith('mesh-') ? props.color : `mesh-text-${props.color}`);
    }
    if (props.lineHeight) classes.push(`lh-${props.lineHeight}`);
    if (props.textWrap) classes.push(`text-${props.textWrap}`);
    return classes;
};

export const mapStyleProps = (props: Partial<MarginProps & PaddingProps & FlexProps & TypographyProps & PositionProps>): string[] => {
    return [
        ...mapMarginProps(props),
        ...mapPaddingProps(props),
        ...mapFlexProps(props),
        ...mapTypographyProps(props),
        ...mapPositionProps(props)
    ].filter(Boolean);
};
