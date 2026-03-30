import { LayoutComponent, IPrimitiveProps } from '../src/core/LayoutComponent';
import { BrokerDOM } from '../src/BrokerDOM';

// Mock BrokerDOM
jest.mock('../src/BrokerDOM', () => ({
    BrokerDOM: {
        getBroker: jest.fn(() => ({
            app: { manifest: { theme: { colors: {} } } }
        })),
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

class TestLayout extends LayoutComponent {
    build() { return this.props.children || null; }
}

describe('LayoutComponent', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    it('should apply padding props as classes', () => {
        const comp = new TestLayout('div', {
            padding: 3,
            paddingX: 2,
            paddingY: 'sm'
        });
        comp.mount(container);
        
        const el = comp.element!;
        expect(el.className).toContain('p-3');
        expect(el.className).toContain('px-2');
        expect(el.className).toContain('py-2');
    });

    it('should apply margin props as classes', () => {
        const comp = new TestLayout('div', {
            margin: 0,
            marginX: 'auto',
            marginY: 5,
            marginBottom: 2,
            marginTop: 1
        });
        comp.mount(container);
        
        const el = comp.element!;
        expect(el.className).toContain('m-0');
        expect(el.className).toContain('mx-auto');
        expect(el.className).toContain('my-5');
        expect(el.className).toContain('mb-2');
        expect(el.className).toContain('mt-1');
    });

    it('should apply flex layout styles', () => {
        const comp = new TestLayout('div', {
            display: 'flex',
            direction: 'col',
            gap: 3,
            alignItems: 'center',
            justifyContent: 'between',
            flexWrap: true
        });
        comp.mount(container);
        
        const el = comp.element!;
        expect(el.className).toContain('d-flex');
        expect(el.className).toContain('flex-column');
        expect(el.className).toContain('justify-content-between');
        expect(el.className).toContain('align-items-center');
        expect(el.className).toContain('flex-wrap');
    });

    it('should handle display weight and text alignment', () => {
        const comp = new TestLayout('div', {
            fontWeight: 'bold',
            textAlign: 'center',
            shadow: 'lg',
            rounded: 'pill'
        });
        comp.mount(container);
        
        const el = comp.element!;
        expect(el.className).toContain('fw-bold');
        expect(el.className).toContain('text-center');
        expect(el.className).toContain('shadow-lg');
        expect(el.className).toContain('rounded-pill');
    });

    it('should apply color and background mesh classes', () => {
        const comp = new TestLayout('div', {
            color: 'primary',
            background: 'secondary'
        });
        comp.mount(container);
        
        const el = comp.element!;
        expect(el.className).toContain('mesh-text-primary');
        expect(el.className).toContain('mesh-bg-secondary');
    });
});
