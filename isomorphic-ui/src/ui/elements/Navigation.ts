import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';

export class Nav extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { 
        super('nav', { flex: true, ...props }); 
    }
    build() { return this.props.children; }
}

export class Header extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('header', props); }
    build() { return this.props.children; }
}

export class Footer extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) { super('footer', props); }
    build() { return this.props.children; }
}
