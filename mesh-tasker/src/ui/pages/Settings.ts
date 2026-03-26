import { BrokerPage, PageHeaderConfig, BrokerComponent, IBaseUIProps, ComponentChild } from '@flybyme/isomorphic-ui';

class Box extends BrokerComponent {
    constructor(props: IBaseUIProps & { children?: ComponentChild | ComponentChild[] }) {
        super('div', props);
    }
    build() { return this.props.children || null; }
}

class Text extends BrokerComponent {
    constructor(props: IBaseUIProps & { text: string }) {
        super('span', props);
    }
    build() { return this.props.text; }
}

export class Settings extends BrokerPage {
    constructor() {
        super('div', {
            style: { padding: '24px' }
        });
    }

    public getPageConfig(): PageHeaderConfig | null { return null; }
    public getSEO() { return { defaultTitle: 'Settings' }; }
    public async onEnter(): Promise<void> {}
    public async onLeave(): Promise<void> {}

    build() {
        return new Box({
            children: [
                new Text({ text: 'Application Settings', style: { fontSize: '24px', fontWeight: 'bold', display: 'block', marginBottom: '16px' } }),
                new Text({ text: 'Settings will be implemented here.' })
            ]
        });
    }
}
