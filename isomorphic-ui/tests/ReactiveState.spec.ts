import { ReactiveState } from '../src/core/ReactiveState';

jest.mock('../src/BrokerDOM', () => ({
    BrokerDOM: {
        getLogger: jest.fn(() => ({
            child: jest.fn(() => ({
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            }))
        }))
    }
}));

describe('ReactiveState Optimization', () => {
    it('should NOT subscribe to native array methods and properties', () => {
        const state = new ReactiveState({ tasks: [{ id: 1, title: 'Task 1' }] });
        const subscribeSpy = jest.spyOn(state, 'subscribe');

        // Mock the magic sauce subscriber
        const globalScope = globalThis as any;
        const invalidate = jest.fn();
        globalScope.MeshMagicSauce = {
            subscriberStack: [{
                invalidate,
                unsubscribes: []
            }]
        };

        // Access native properties/methods
        const tasks = state.data.tasks;
        tasks.filter(t => t.id === 1);
        const len = tasks.length;
        const constructor = tasks.constructor;

        // Ensure subscriptions were NOT created for these
        const subscribedPaths = subscribeSpy.mock.calls.map(call => call[0]);
        
        expect(subscribedPaths).not.toContain('tasks.filter');
        expect(subscribedPaths).not.toContain('tasks.length');
        expect(subscribedPaths).not.toContain('tasks.constructor');

        // But it SHOULD still subscribe to the actual data accessed during filter
        expect(subscribedPaths).toContain('tasks.0.id');

        delete globalScope.MeshMagicSauce;
    });

    it('should still be reactive to data changes', () => {
        const state = new ReactiveState({ tasks: [{ id: 1, title: 'Task 1' }] });
        const listener = jest.fn();
        state.subscribe('tasks.0.title', listener);

        state.data.tasks[0].title = 'Updated Task';
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle bracket notation in paths', () => {
        const state = new ReactiveState({ 
            $registry: { 
                nodes: { 
                    'mesht-gateway': { status: 'Running' } 
                } 
            } 
        });

        expect(state.getValue('$registry.nodes["mesht-gateway"].status')).toBe('Running');
        
        state.set('$registry.nodes["mesht-gateway"].status', 'Offline');
        expect(state.data.$registry.nodes['mesht-gateway'].status).toBe('Offline');

        const listener = jest.fn();
        state.subscribe('$registry.nodes["mesht-gateway"].status', listener);
        state.data.$registry.nodes['mesht-gateway'].status = 'Running';
        expect(listener).toHaveBeenCalledTimes(1);

        state.dirty('$registry.nodes["mesht-gateway"].status');
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
