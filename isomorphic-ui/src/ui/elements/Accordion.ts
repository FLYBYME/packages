import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Unique ID Generator for Accordion bindings.
 */
const generateId = (prefix: string) => prefix + '-' + Math.random().toString(36).substring(2, 9);

/**
 * Interface for Accordion root props.
 */
export interface IAccordionProps extends IBaseUIProps {
    flush?: boolean;
    alwaysOpen?: boolean;
}

/**
 * Root Accordion component.
 */
export class Accordion extends BrokerComponent {
    private _id = generateId('acc');

    constructor(props: IAccordionProps = {}) {
        super('div', props);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IAccordionProps;
        const classes = ['accordion'];
        if (props.flush) classes.push('accordion-flush');
        return classes.join(' ');
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IAccordionProps;
        const id = (props.id as string) || this._id;
        
        // Ensure the component has a stable ID for child references
        if (!props.id) props.id = id;

        const children = Array.isArray(props.children) ? props.children : (props.children ? [props.children] : []);
        
        children.forEach(child => {
            // Safer check for BrokerComponent instances using the static flag
            if (child instanceof BrokerComponent && !props.alwaysOpen) {
                (child.props as IAccordionItemProps).accordionId = id;
            }
        });

        return props.children;
    }
}

/**
 * Interface for AccordionItem props.
 */
export interface IAccordionItemProps extends IBaseUIProps {
    header: string | ComponentChild;
    defaultOpen?: boolean;
    accordionId?: string; // Injected by Accordion parent if not alwaysOpen
}

/**
 * Composite AccordionItem component.
 * Maps high-level props to complex Bootstrap accordion-item structure.
 */
export class AccordionItem extends BrokerComponent {
    private _baseId = generateId('item');

    constructor(props: IAccordionItemProps) {
        super('div', props);
    }

    protected override getBaseClasses(): string {
        return 'accordion-item';
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IAccordionItemProps;
        const baseId = props.id || this._baseId;
        const headingId = `${baseId}-heading`;
        const collapseId = `${baseId}-collapse`;

        // 1. Accordion Header Button
        const button = new AccordionButton({
            className: props.defaultOpen ? '' : 'collapsed',
            'data-bs-toggle': 'collapse',
            'data-bs-target': `#${collapseId}`,
            'aria-expanded': props.defaultOpen ? 'true' : 'false',
            'aria-controls': collapseId,
            children: props.header
        });

        // 2. Collapsible Region and Body
        const collapseWrapper = new AccordionCollapse({
            id: collapseId,
            className: props.defaultOpen ? 'show' : '',
            'aria-labelledby': headingId,
            'data-bs-parent': props.accordionId ? `#${props.accordionId}` : undefined,
            children: new AccordionBody({ children: props.children })
        });

        return [
            new AccordionHeader({ id: headingId, children: button }),
            collapseWrapper
        ];
    }
}

/**
 * Internal primitive for .accordion-header (h2)
 */
class AccordionHeader extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('h2', props); }
    protected override getBaseClasses() { return 'accordion-header'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Internal primitive for .accordion-button (button)
 */
class AccordionButton extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('button', { ...props, type: 'button' }); }
    protected override getBaseClasses() { return 'accordion-button'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Internal primitive for .accordion-collapse (div)
 */
class AccordionCollapse extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('div', props); }
    protected override getBaseClasses() { return 'accordion-collapse collapse'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}

/**
 * Internal primitive for .accordion-body (div)
 */
class AccordionBody extends BrokerComponent {
    constructor(props: IBaseUIProps) { super('div', props); }
    protected override getBaseClasses() { return 'accordion-body'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children; }
}
