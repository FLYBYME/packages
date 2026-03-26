/**
 * MetricType — Strictly defined metric aggregation types.
 */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * IMetricMetadata — Basic labels and identification for a metric.
 */
export interface IMetricMetadata {
    name: string;
    help?: string;
    labels?: Record<string, string>;
}

/**
 * IMetricsRegistry — Strictly typed registry for application health and performance.
 */
export interface IMetricsRegistry {
    /**
     * Increment a counter (monotonically increasing value).
     */
    increment(name: string, value?: number, labels?: Record<string, string>): void;

    /**
     * Set a gauge (arbitrary numerical value).
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void;

    /**
     * Observe a value for a histogram (distribution).
     */
    observe(name: string, value: number, labels?: Record<string, string>): void;

    /**
     * Retrieve all registered metrics for exporting.
     */
    getMetrics(): IMetricSnapshot[];

    /**
     * Reset all gauges to clear stale data.
     */
    resetGauges(): void;
}

/**
 * IMetricSnapshot — Point-in-time state of a registered metric.
 */
export interface IMetricSnapshot {
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
    timestamp: number;
}
