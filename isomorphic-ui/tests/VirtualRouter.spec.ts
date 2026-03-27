import { VirtualRouter } from '../src/core/VirtualRouter';
import { BrokerDOM } from '../src/BrokerDOM';
import { RouteConfig } from '../src/types/router.types';

// Mock BrokerDOM
const mockState = {
    set: jest.fn(),
    getValue: jest.fn()
};

const mockContext = {
    broker: {},
    state: mockState,
    manifest: null
};

jest.mock('../src/BrokerDOM', () => ({
    BrokerDOM: {
        setNavigator: jest.fn(),
        getStateService: jest.fn(() => mockState),
        getMeshContext: jest.fn(() => mockContext),
        getLogger: jest.fn(() => ({
            child: jest.fn().mockReturnThis(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            getLevel: jest.fn().mockReturnValue(1)
        })),
        getBroker: jest.fn(() => ({
            app: { manifest: { theme: { colors: {} } } }
        })),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn()
    }
}));

class MockPage {
    constructor(public props: any) {}
}

describe('VirtualRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset VirtualRouter's private static state using casting if needed,
        // but since we can call init() again, let's see.
        // Actually, VirtualRouter.init has a guard: if (this.initialized) return;
        (VirtualRouter as any).initialized = false;
        (VirtualRouter as any).routes = [];
    });

    it('should initialize and handle initial route', () => {
        const routes: RouteConfig[] = [
            { path: '/', component: MockPage as any }
        ];
        
        // Mock current location
        delete (window as any).location;
        (window as any).location = { pathname: '/' };
        
        VirtualRouter.init(routes);
        
        expect(BrokerDOM.setNavigator).toHaveBeenCalled();
        expect(mockState.set).toHaveBeenCalledWith('$router.current', {
            path: '/',
            componentClass: MockPage
        });
    });

    it('should match exact string paths', async () => {
        const routes: RouteConfig[] = [
            { path: '/dashboard', component: MockPage as any }
        ];
        VirtualRouter.init(routes);
        
        const success = await VirtualRouter.push('/dashboard');
        expect(success).toBe(true);
        expect(mockState.set).toHaveBeenCalledWith('$router.current', {
            path: '/dashboard',
            componentClass: MockPage
        });
    });

    it('should match regex paths', async () => {
        const routes: RouteConfig[] = [
            { path: /^\/user\/\d+$/, component: MockPage as any }
        ];
        VirtualRouter.init(routes);
        
        const success = await VirtualRouter.push('/user/123');
        expect(success).toBe(true);
        expect(mockState.set).toHaveBeenCalledWith('$router.current', expect.objectContaining({
            path: '/user/123'
        }));
    });

    it('should block navigation if a guard returns false', async () => {
        const guard = jest.fn().mockResolvedValue(false);
        const routes: RouteConfig[] = [
            { path: '/secret', component: MockPage as any, guards: [guard] }
        ];
        VirtualRouter.init(routes);
        
        const success = await VirtualRouter.push('/secret');
        expect(success).toBe(false);
        expect(guard).toHaveBeenCalled();
        expect(mockState.set).not.toHaveBeenCalledWith('$router.current', expect.anything());
    });

    it('should allow navigation if all guards return true', async () => {
        const guard1 = jest.fn().mockResolvedValue(true);
        const guard2 = jest.fn().mockResolvedValue(true);
        const routes: RouteConfig[] = [
            { path: '/open', component: MockPage as any, guards: [guard1, guard2] }
        ];
        VirtualRouter.init(routes);
        
        const success = await VirtualRouter.push('/open');
        expect(success).toBe(true);
        expect(mockState.set).toHaveBeenCalled();
    });
});
