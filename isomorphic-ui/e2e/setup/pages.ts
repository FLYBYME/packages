import { BrokerPage, BrokerDOM, Box, Button, Accordion, AccordionItem } from '../../src';

export class CounterPage extends BrokerPage {
    onEnter(_params: any) {}
    getPageConfig() { return { title: 'Counter' }; }
    getSEO() { return { defaultTitle: 'Counter' }; }
    build() {
        const state = BrokerDOM.getStateService();
        if (state.getValue('counter') === undefined) {
            state.set('counter', 0);
        }

        return [
            new Box({ tagName: 'h1', text: 'Counter Sandbox', id: 'main-title' }),
            new Box({ 
                id: 'counter-display', 
                text: '$state.counter' 
            }),
            new Button({ 
                text: 'Increment', 
                id: 'increment-btn',
                onClick: () => {
                    const current = state.getValue<number>('counter') || 0;
                    state.set('counter', current + 1);
                } 
            }),
            new Button({
                text: 'Toggle Color',
                className: '$state.isError ? "btn btn-danger" : "btn btn-primary"',
                id: 'color-box',
                onClick: () => state.set('isError', !state.getValue('isError'))
            })
        ];
    }
}

export class AccordionPage extends BrokerPage {
    onEnter(_params: any) {}
    getPageConfig() { return { title: 'Accordion' }; }
    getSEO() { return { defaultTitle: 'Accordion' }; }
    build() {
        return new Accordion({
            id: 'test-accordion',
            children: [
                new AccordionItem({
                    header: 'Item 1',
                    children: 'Content 1',
                    id: 'item-1'
                })
            ]
        });
    }
}
