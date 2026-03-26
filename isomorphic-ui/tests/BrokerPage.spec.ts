import { BrokerPage } from '../src/core/BrokerPage';
import { BrokerDOM } from '../src/BrokerDOM';

// Concrete implementation of abstract BrokerPage for testing
class TestPage extends BrokerPage {
    onEnter = jest.fn();
    getPageConfig = jest.fn(() => ({ title: 'Test Page' }));
    getSEO = jest.fn(() => ({ defaultTitle: 'SEO Title' }));
    build() { return 'Test Content'; }
}

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
        getAppShell: jest.fn(() => mockAppShell),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn()
    }
}));

describe('BrokerPage', () => {
    let page: TestPage;

    beforeEach(() => {
        jest.clearAllMocks();
        page = new TestPage();
    });

    it('should communicate header actions to AppShell', () => {
        const actions = ['Action 1'];
        (page as any).setHeaderActions(actions);
        expect(mockAppShell.setHeaderActions).toHaveBeenCalledWith(actions, 'TestPage');
    });

    it('should communicate sidebar extra content to AppShell', () => {
        const extra = ['Sidebar Item'];
        (page as any).setSidebarExtra(extra);
        expect(mockAppShell.setSidebarExtra).toHaveBeenCalledWith(extra, 'TestPage');
    });

    it('should communicate footer content to AppShell', () => {
        const footer = ['Footer Text'];
        (page as any).setFooterContent(footer);
        expect(mockAppShell.setFooterContent).toHaveBeenCalledWith(footer, 'TestPage');
    });
});
