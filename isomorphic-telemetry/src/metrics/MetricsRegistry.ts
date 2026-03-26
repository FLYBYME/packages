import { IMetricsRegistry, IMetricSnapshot } from './IMetricsRegistry';

interface HistogramData {
    sum: number;
    count: number;
    buckets: Map<number, number>;
    labels?: Record<string, string>;
}

/**
 * MetricsRegistry — Strictly typed registry for application performance monitoring.
 */
export class MetricsRegistry implements IMetricsRegistry {
    private counters = new Map<string, { value: number; labels?: Record<string, string> }>();
    private gauges = new Map<string, { value: number; labels?: Record<string, string> }>();
    private histograms = new Map<string, HistogramData>();

    private readonly DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    private readonly MAX_HISTOGRAMS = 2000;

    /**
     * Increment a counter (monotonically increasing value).
     */
    public increment(name: string, value: number = 1, labels?: Record<string, string>): void {
        const key = this.generateKey(name, labels);
        const existing = this.counters.get(key) || { value: 0, labels };
        this.counters.set(key, { value: existing.value + value, labels });
    }

    /**
     * Set a gauge (arbitrary numerical value).
     */
    public setGauge(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.generateKey(name, labels);
        this.gauges.set(key, { value, labels });
    }

    /**
     * Observe a value for a histogram (distribution).
     */
    public observe(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.generateKey(name, labels);
        let data = this.histograms.get(key);
        
        if (!data) {
            // Memory Leak Protection: prevent unbounded growth of histograms Map
            if (this.histograms.size >= this.MAX_HISTOGRAMS) {
                // Simplistic eviction: clear all histograms to prevent OOM
                // In a production environment, this should use a more sophisticated LRU strategy
                this.histograms.clear();
            }

            data = {
                sum: 0,
                count: 0,
                buckets: new Map(this.DEFAULT_BUCKETS.map(b => [b, 0])),
                labels
            };
            this.histograms.set(key, data);
        }

        data.sum += value;
        data.count += 1;

        for (const bucket of this.DEFAULT_BUCKETS) {
            if (value <= bucket) {
                data.buckets.set(bucket, (data.buckets.get(bucket) || 0) + 1);
            }
        }
    }

    /**
     * Reset all gauges to clear stale data.
     */
    public resetGauges(): void {
        this.gauges.clear();
    }

    /**
     * Export all metric snapshots.
     */
    public getMetrics(): IMetricSnapshot[] {
        const timestamp = Date.now();
        const snapshots: IMetricSnapshot[] = [];

        for (const [key, data] of this.counters.entries()) {
            snapshots.push({ 
                name: key.split(':')[0], 
                type: 'counter', 
                value: data.value, 
                labels: data.labels, 
                timestamp 
            });
        }

        for (const [key, data] of this.gauges.entries()) {
            snapshots.push({ 
                name: key.split(':')[0], 
                type: 'gauge', 
                value: data.value, 
                labels: data.labels, 
                timestamp 
            });
        }

        for (const [key, data] of this.histograms.entries()) {
            const name = key.split(':')[0];
            // Export sum, count, and buckets
            snapshots.push({ name: `${name}_sum`, type: 'histogram', value: data.sum, labels: data.labels, timestamp });
            snapshots.push({ name: `${name}_count`, type: 'histogram', value: data.count, labels: data.labels, timestamp });
            
            for (const [bucket, count] of data.buckets.entries()) {
                const bucketLabels = { ...data.labels, le: bucket.toString() };
                snapshots.push({ name: `${name}_bucket`, type: 'histogram', value: count, labels: bucketLabels, timestamp });
            }
            // Add +Inf bucket
            snapshots.push({ 
                name: `${name}_bucket`, 
                type: 'histogram', 
                value: data.count, 
                labels: { ...data.labels, le: '+Inf' }, 
                timestamp 
            });
        }

        return snapshots;
    }

    /**
     * Internal utility to generate a composite key based on name and labels.
     */
    private generateKey(name: string, labels?: Record<string, string>): string {
        if (!labels) return name;
        const serialized = JSON.stringify(labels);
        return `${name}:${serialized}`;
    }
}
