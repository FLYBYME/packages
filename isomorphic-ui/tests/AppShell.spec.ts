import { AppShell } from '../src/core/AppShell';
import { BrokerDOM } from '../src/BrokerDOM';
import { ReactiveState } from '../src/core/ReactiveState';

// Mock BrokerDOM
const mockState = new ReactiveState({
    $app: {
        header: { actions: {} },
        footer: { content: {} },
        sidebar: { extra: {} }
    }
});

jest.mock('../src/BrokerDOM', () => ({
    BrokerDOM: {
        getBroker: jest.fn(() => ({
            app: {
                manifest: { 
                    app: { name: 'Test App' },
                    navigation: { main: [] }
                }
            }
        })),
        getManifest: jest.fn(() => ({
            app: { name: 'Test App' },
            navigation: { main: [] }
        })),
        getStateService: jest.fn(() => mockState),
        getLogger: jest.fn(() => ({
            child: jest.fn().mockReturnThis(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1)
        })),
        setAppShell: jest.fn(),
        getAppShell: jest.fn(),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn()
    }
}));

// Mock RouterView and Sidebar to avoid deep rendering issues in unit tests
jest.mock('../src/core/RouterView', () => ({
    RouterView: class { constructor() {} mount() {} build() { return null; } }
}));
jest.mock('../src/ui/elements/NavigationComponents', () => ({
    Navbar: class { constructor() {} build() { return 'Navbar'; } },
    NavbarBrand: class { constructor() {} },
    NavbarToggler: class { constructor() {} },
    NavbarCollapse: class { constructor() {} },
    NavbarNav: class { constructor() {} },
    Sidebar: class { constructor() {} build() { return 'Sidebar'; } },
    NavbarItem: class { constructor() {} },
    NavbarLink: class { constructor() {} }
}));

describe('AppShell', () => {
    let shell: AppShell;

    beforeEach(() => {
        jest.clearAllMocks();
        shell = new AppShell();
    });

    it('should register with BrokerDOM on creation', () => {
        expect(BrokerDOM.setAppShell).toHaveBeenCalledWith(shell);
    });

    it('should set header actions and update state', () => {
        const actions = ['Action1'];
        shell.setHeaderActions(actions as any, 'page1');
        
        const stateValue = mockState.getValue<any>('$app.header.actions.page1');
        expect(stateValue).toEqual(actions);
    });

    it('should merge layout state correctly with global priority', () => {
        mockState.set('$app.header.actions.global', ['GlobalAction']);
        mockState.set('$app.header.actions.page1', ['PageAction']);
        
        const merged = (shell as any).getMergedLayoutState('$app.header.actions');
        
        expect(merged).toHaveLength(2);
        expect(merged[0]).toBe('GlobalAction');
        expect(merged[1]).toBe('PageAction');
    });

    it('should handle sidebar extra content', () => {
        const extra = ['Extra'];
        shell.setSidebarExtra(extra as any, 'page1');
        
        const stateValue = mockState.getValue<any>('$app.sidebar.extra.page1');
        expect(stateValue).toEqual(extra);
    });
});
