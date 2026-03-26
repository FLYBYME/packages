import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';

export class CloseButton extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('button', { type: 'button', 'aria-label': 'Close', ...props }); }
    protected override getBaseClasses(): string { return 'btn-close'; }
    build() { return null; }
}
