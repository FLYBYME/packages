import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';

/**
 * Internal primitive for rendering raw tags within the modal's nested structure.
 */
class UIPrimitive extends BrokerComponent {
    constructor(tagName: string, props: IBaseUIProps = {}) { 
        super(tagName, props); 
    }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || this.props.children; }
}

/**
 * Props for the Modal component.
 */
export interface IModalProps extends IBaseUIProps {
    size?: 'sm' | 'lg' | 'xl';
    fullscreen?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    centered?: boolean;
    scrollable?: boolean;
    staticBackdrop?: boolean;
    fade?: boolean;
    show?: boolean;
    onHide?: () => void;
}

/**
 * Modal - A dialog box/popup window.
 * Orchestrates the complex nested structure required for Bootstrap positioning and backdrops.
 */
export class Modal extends BrokerComponent {
    constructor(props: IModalProps = {}) {
        const modifiedProps: IBaseUIProps = { 
            tabindex: '-1', 
            'data-broker-modal': 'true',
            ...props 
        };

        if (props.staticBackdrop) {
            modifiedProps['data-bs-backdrop'] = 'static';
            modifiedProps['data-bs-keyboard'] = 'false';
        }

        super('div', modifiedProps);
    }

    protected override getBaseClasses(): string {
        const props = this.props as IModalProps;
        const classes = ['modal'];
        if (props.fade !== false) classes.push('fade');
        if (props.show) classes.push('show');
        return classes.join(' ');
    }

    protected override getLayoutStyles(props: IModalProps): Record<string, string | number> {
        const styles = super.getLayoutStyles(props);
        styles.display = props.show ? 'block' : 'none';
        return styles;
    }

    public show(): void {
        if (this.props.show === true) return;
        this.props.show = true;
        this.update();
    }

    public hide(): void {
        if (this.props.show === false) return;
        this.props.show = false;
        const props = this.props as IModalProps;
        if (typeof props.onHide === 'function') {
            props.onHide();
        }
        this.update();
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IModalProps;
        const dialogClasses = ['modal-dialog'];
        
        if (props.centered) dialogClasses.push('modal-dialog-centered');
        if (props.scrollable) dialogClasses.push('modal-dialog-scrollable');
        if (props.size) dialogClasses.push(`modal-${props.size}`);
        
        if (props.fullscreen) {
            if (props.fullscreen === true) dialogClasses.push('modal-fullscreen');
            else dialogClasses.push(`modal-fullscreen-${props.fullscreen}-down`);
        }

        // Implicit ARIA binding: find a ModalTitle in children
        // (Simplified logic: children are just rendered inside modal-content)
        
        return new UIPrimitive('div', { 
            className: dialogClasses.join(' '),
            children: new UIPrimitive('div', {
                className: 'modal-content',
                children: props.children
            })
        });
    }
}

/**
 * Modal Header containing the title and close button.
 */
export class ModalHeader extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'modal-header'; }
    build(): ComponentChild | ComponentChild[] {
        const children = (this.props.children ? (Array.isArray(this.props.children) ? this.props.children : [this.props.children]) : []) as ComponentChild[];
        return [
            ...children,
            new UIPrimitive('button', { 
                type: 'button', 
                className: 'btn-close', 
                onClick: (e: Event) => {
                    if (this.props.onClose) {
                        (this.props.onClose as (e: Event) => void)(e);
                    } else {
                        // Automatic closure: traverse up to find parent modal instance
                        const modalEl = (e.target as HTMLElement).closest('[data-broker-modal]');
                        const broker = (modalEl as unknown as { __brokerInstance?: Modal })?.__brokerInstance;
                        if (broker && typeof broker.hide === 'function') {
                            broker.hide();
                        }
                    }
                },
                'aria-label': 'Close' 
            })
        ];
    }
}

/**
 * Modal Title usually used within ModalHeader.
 */
export class ModalTitle extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('h5', props); }
    protected override getBaseClasses() { return 'modal-title'; }
    build(): ComponentChild | ComponentChild[] { return (this.props.text as string) || this.props.children; }
}

/**
 * Main scrollable body of the modal.
 */
export class ModalBody extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'modal-body'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children || (this.props.text as string); }
}

/**
 * Footer area for actions (buttons).
 */
export class ModalFooter extends BrokerComponent {
    constructor(props: IBaseUIProps = {}) { super('div', props); }
    protected override getBaseClasses() { return 'modal-footer'; }
    build(): ComponentChild | ComponentChild[] { return this.props.children || (this.props.text as string); }
}
