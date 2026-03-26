import { MetricsRegistry } from '../src/metrics/MetricsRegistry';

describe('MetricsRegistry Memory Leak', () => {
    let registry: MetricsRegistry;

    beforeEach(() => {
        registry = new MetricsRegistry();
    });

    it('should NOT grow histograms Map indefinitely with unique labels', () => {
        // This is the "leak" protection - it should clear the map after 2000 unique labels
        for (let i = 0; i < 5000; i++) {
            registry.observe('test_histogram', Math.random(), { userId: `user_${i}` });
        }

        const snapshots = registry.getMetrics();
        // Since it clears at 2000, and then adds more, it should have (5000 % 2000) labels left
        // 5000 % 2000 = 1000 labels
        // 1000 * 14 = 14000 snapshots
        expect(snapshots.length).toBeLessThan(2000 * 15);
        expect(snapshots.length).toBeGreaterThan(0);
    });
});
