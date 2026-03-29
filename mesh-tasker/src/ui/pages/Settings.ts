import { BrokerPage, PageHeaderConfig, Section, Span } from '@flybyme/isomorphic-ui';

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
        return new Section({
            children: [
                new Span({ text: 'Application Settings', style: { fontSize: '24px', fontWeight: 'bold', display: 'block', marginBottom: '16px' } }),
                new Span({ text: 'Settings will be implemented here.' })
            ]
        });
    }
}
