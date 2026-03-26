import { SiteManifest } from '../../src/core/InternalTypes';
import { CounterPage, AccordionPage } from './pages';

export const TestManifest: SiteManifest = {
    app: {
        id: 'e2e-test-app',
        name: 'E2E Test App',
        namespace: 'e2e'
    },
    network: {
        endpoints: []
    },
    assets: {
        globalStyles: [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css'
        ]
    },
    build: {
        srcDir: '/home/ubuntu/code/packages/isomorphic-ui',
        entryPoint: './e2e/setup/client.ts',
        ssr: true
    },
    routing: {
        routes: [
            { path: '/', component: CounterPage as any },
            { path: '/accordion', component: AccordionPage as any }
        ]
    },
    initialState: {
        counter: 0,
        isError: false
    }
} as any;
