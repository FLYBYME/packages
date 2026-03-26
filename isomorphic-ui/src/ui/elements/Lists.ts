import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';

export class Ul extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('ul', props); }
    build() { return this.props.children; }
}

export class Ol extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('ol', props); }
    build() { return this.props.children; }
}

export class Li extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('li', props); }
    build() { return this.props.children; }
}
