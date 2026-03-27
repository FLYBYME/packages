import { RouterView } from '../src/core/RouterView';
import { BrokerPage } from '../src/core/BrokerPage';
import { BrokerDOM } from '../src/BrokerDOM';

// Mock BrokerDOM
const mockState = {
    getValue: jest.fn(),
    subscribe: jest.fn(() => () => {}),
    set: jest.fn()
};

const mockAppShell = {
    setHeaderActions: jest.fn(),
    setSidebarExtra: jest.fn(),
    setFooterContent: jest.fn()
};

jest.mock('../src/BrokerDOM', () => ({
    BrokerDOM: {
        getBroker: jest.fn(() => ({
            app: {
                manifest: { theme: { colors: { primary: '#007bff' } } }
            }
        })),
        getStateService: jest.fn(() => mockState),
        getAppShell: jest.fn(() => mockAppShell),
        getLogger: jest.fn(() => ({
            child: jest.fn().mockReturnThis(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1)
        })),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn()
    }
}));

class PageA extends BrokerPage {
    onEnter = jest.fn();
    onLeave = jest.fn().mockResolvedValue(true);
    getPageConfig = () => ({ title: 'Page A' });
    getSEO = () => ({});
    build() { return 'Content A'; }
}

class PageB extends BrokerPage {
    onEnter = jest.fn();
    onLeave = jest.fn().mockResolvedValue(true);
    getPageConfig = () => ({ title: 'Page B' });
    getSEO = () => ({});
    build() { return 'Content B'; }
}

describe('RouterView', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.removeChild(container);
        // Clear static state and global storage
        delete (globalThis as any).__mesh_dom_storage;
    });

    it('should render null if no route is active', () => {
        mockState.getValue.mockReturnValue(null);
        const view = new RouterView();
        view.mount(container);
        expect(view.element?.innerHTML).toBe('');
    });

    it('should mount a page component when route matches', async () => {
        mockState.getValue.mockReturnValue({ componentClass: PageA, params: { id: '123' } });
        const view = new RouterView();
        
        // First build triggers transition
        view.mount(container);
        
        // Re-run the loop to let the async transition finish
        // RouterView.performTransition calls this.update() at the end
        await new Promise(r => setTimeout(r, 50));
        
        expect(view.element?.innerHTML).toContain('Content A');
    });

    it('should trigger onEnter with params', async () => {
        const params = { id: '456' };
        mockState.getValue.mockReturnValue({ componentClass: PageA, params });
        const view = new RouterView();
        view.mount(container);
        
        await new Promise(r => setTimeout(r, 50));
        
        // We need to get the instance of PageA that was created
        const pageAInstance = (view as any).activePage as PageA;
        expect(pageAInstance.onEnter).toHaveBeenCalledWith(params);
    });

    it('should block navigation if onLeave returns false', async () => {
        // Start on Page A
        mockState.getValue.mockReturnValue({ componentClass: PageA });
        const view = new RouterView();
        view.mount(container);
        await new Promise(r => setTimeout(r, 50));
        
        const pageA = (view as any).activePage as PageA;
        pageA.onLeave.mockResolvedValue(false); // BLOCK
        
        // Try to navigate to Page B
        mockState.getValue.mockReturnValue({ componentClass: PageB });
        view.update(); // Trigger re-render/re-build
        
        await new Promise(r => setTimeout(r, 50));
        
        // Should STILL be Page A
        expect(view.element?.innerHTML).toContain('Content A');
        expect((view as any).activePage).toBe(pageA);
    });

    it('should clear AppShell contributions when switching pages', async () => {
        mockState.getValue.mockReturnValue({ componentClass: PageA });
        const view = new RouterView();
        view.mount(container);
        await new Promise(r => setTimeout(r, 50));
        
        // Switch to Page B
        mockState.getValue.mockReturnValue({ componentClass: PageB });
        view.update();
        await new Promise(r => setTimeout(r, 50));
        
        expect(mockAppShell.setHeaderActions).toHaveBeenCalledWith([], 'PageA');
        expect(mockAppShell.setSidebarExtra).toHaveBeenCalledWith([], 'PageA');
        expect(mockAppShell.setFooterContent).toHaveBeenCalledWith([], 'PageA');
    });
});
