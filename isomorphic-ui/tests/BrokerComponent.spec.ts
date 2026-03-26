import { BrokerComponent, IBaseUIProps, ComponentChild } from '../src/core/BrokerComponent';
import { BrokerDOM } from '../src/BrokerDOM';

// Mock BrokerDOM to provide a dummy state and app
const mockState = {
    subscribe: jest.fn(() => () => {}),
    getValue: jest.fn()
};

jest.mock('../src/BrokerDOM', () => ({
    BrokerDOM: {
        getBroker: jest.fn(() => ({
            app: {
                manifest: { theme: { colors: { primary: '#007bff' } } }
            }
        })),
        getStateService: jest.fn(() => mockState),
        getLogger: jest.fn(() => ({
            child: jest.fn(() => ({
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            }))
        })),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn()
    }
}));

class TestComponent extends BrokerComponent {
    public onMountCalled = 0;
    public buildCalled = 0;

    constructor(tagName: string = 'div', props: IBaseUIProps = {}) {
        super(tagName, props);
    }

    override onMount() {
        this.onMountCalled++;
    }

    build(): ComponentChild | ComponentChild[] {
        this.buildCalled++;
        return (this.props.text as string) || this.props.children || null;
    }
}

describe('BrokerComponent', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        jest.clearAllMocks();
        // Clear BrokerDOM static storage to avoid leakage
        delete (globalThis as unknown as { __mesh_dom_storage: unknown }).__mesh_dom_storage;
    });

    it('should create a DOM element with correct tagName', () => {
        const comp = new TestComponent('span');
        comp.mount(container);
        expect(comp.element).toBeInstanceOf(HTMLSpanElement);
        expect(container.contains(comp.element!)).toBe(true);
    });

    it('should apply classes and styles from props', () => {
        const comp = new TestComponent('div', {
            className: 'test-class',
            style: { color: 'red', marginTop: '10px' }
        });
        comp.mount(container);
        
        expect(comp.element?.className).toContain('test-class');
        expect(comp.element?.style.color).toBe('red');
        expect(comp.element?.style.marginTop).toBe('10px');
    });

    it('should handle nested children', () => {
        const child1 = new TestComponent('p', { text: 'Child 1' });
        const comp = new TestComponent('div', {
            children: [child1, 'Static Text']
        });
        
        comp.mount(container);
        
        expect(comp.element?.children.length).toBe(1);
        expect(comp.element?.innerHTML).toContain('Static Text');
        expect(comp.element?.firstChild).toBe(child1.element);
    });

    it('should trigger lifecycle hooks', async () => {
        const comp = new TestComponent();
        
        comp.mount(container);
        expect(comp.onMountCalled).toBe(1);
        expect(comp.buildCalled).toBe(1); // mounted elements build once
        
        comp.update();
        // Update is asynchronous (queueMicrotask)
        await new Promise(resolve => queueMicrotask(() => resolve(null)));
        expect(comp.buildCalled).toBe(2);
        
        comp.dispose();
        expect(container.contains(comp.element!)).toBe(false);
    });

    it('should reuse existing element if already created', () => {
        const comp = new TestComponent('div', { text: 'Initial' });
        
        // First mount
        comp.mount(container);
        const originalElement = comp.element;
        expect(originalElement).not.toBeNull();
        expect(originalElement?.textContent).toBe('Initial');
        
        // Remove from DOM (simulating movement or re-mount)
        container.removeChild(originalElement!);
        
        // Second mount (should reuse originalElement)
        comp.mount(container);
        expect(comp.element).toBe(originalElement);
        expect(container.firstChild).toBe(originalElement);
    });

    it('should update DOM when props change', async () => {
        const comp = new TestComponent('div', { className: 'old' });
        comp.mount(container);
        
        expect(comp.element?.className).toBe('old');
        comp.props.className = 'new';
        comp.update();
        
        // Wait for async update
        await new Promise(resolve => queueMicrotask(() => resolve(null)));
        expect(comp.element?.className).toBe('new');
    });

    it('should react to state changes in expressions', async () => {
        const comp = new TestComponent('div', {
            title: '$state.theme.mode'
        });
        
        // Initial setup
        mockState.getValue.mockReturnValue('dark');
        comp.mount(container);
        
        // Verify initial state
        expect(comp.element?.getAttribute('title')).toBe('dark');
        
        // Test evaluateExpression directly
        mockState.getValue.mockReturnValue('light');
        const result = (comp as any).evaluateExpression('$state.theme.mode');
        expect(result).toBe('light');
        
        // Trigger the update manually
        const updateCallback = (mockState.subscribe as jest.Mock).mock.calls[0][1] as () => void;
        updateCallback();
        
        // Wait for async update
        await new Promise(r => setTimeout(r, 100));
        
        expect(comp.element?.getAttribute('title')).toBe('light');
    });

    it('should handle state paths with double quotes in bracket notation', () => {
        const comp = new TestComponent('div');
        mockState.getValue.mockImplementation((path) => {
            if (path === '$registry.nodes.mesht-gateway.status') return 'Running';
            return null;
        });

        // The current implementation fails to evaluate this due to a syntax error
        const expr = '$state.$registry.nodes["mesht-gateway"].status === "Running" ? "success" : "danger"';
        const result = (comp as any).evaluateExpression(expr);
        expect(result).toBe('success');
    });

    it('should handle template expressions with bracket notation', () => {
        const comp = new TestComponent('div');
        mockState.getValue.mockImplementation((path) => {
            if (path === '$registry.nodes.mesht-gateway.lastHeartbeat') return '2026-03-24';
            return null;
        });

        const expr = 'Last Seen: $state.$registry.nodes["mesht-gateway"].lastHeartbeat';
        const result = (comp as any).evaluateExpression(expr);
        expect(result).toBe('Last Seen: 2026-03-24');
    });
});
