import { MeshUI, BrokerDOM, BrokerPage, Accordion, AccordionItem, Button, VirtualRouter, Box } from '../src';

// Register test routes to specific sandbox components
class CounterTestPage extends BrokerPage {
    onEnter(_params: any) {}
    getPageConfig() { return { title: 'Counter' }; }
    getSEO() { return { defaultTitle: 'Counter' }; }
    build() {
        const state = BrokerDOM.getStateService();
        if (state.getValue('counter') === undefined) {
            state.set('counter', 0);
        }

        return [
            new Box({ tagName: 'h1', text: 'Counter Sandbox' }),
            new Box({ 
                id: 'counter-display', 
                text: '$state.counter' 
            }),
            new Button({ 
                text: 'Increment', 
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

class AccordionTestPage extends BrokerPage {
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

const manifest = {
    app: { name: 'Sandbox' },
    routing: {
        routes: [
            { path: '/sandbox/counter', component: CounterTestPage },
            { path: '/sandbox/accordion', component: AccordionTestPage },
            { path: '/', component: CounterTestPage }
        ]
    }
};

MeshUI.bootstrap(manifest as any);
(window as any).MeshUI = MeshUI;
(window as any).MeshUI.router = VirtualRouter;

console.log('[Sandbox] Initialized');
