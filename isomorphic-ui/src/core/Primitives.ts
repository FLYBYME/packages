import { BrokerComponent, IBaseUIProps, ComponentChild } from './BrokerComponent';

export class Box extends BrokerComponent {
    constructor(props: IBaseUIProps & { children?: ComponentChild | ComponentChild[] }) {
        super('div', props);
    }

    build() {
        return this.props.children || this.props.text || null;
    }
}

export class Text extends BrokerComponent {
    constructor(props: IBaseUIProps & { text: string }) {
        super('span', props);
    }

    build(): ComponentChild | ComponentChild[] {
        return this.props.text;
    }
}
