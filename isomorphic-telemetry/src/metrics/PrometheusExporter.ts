import { IMetricsRegistry } from './IMetricsRegistry';

/**
 * PrometheusExporter — Exposes metrics in standard Prometheus text format.
 */
export class PrometheusExporter {
    constructor(private registry: IMetricsRegistry) {}

    /**
     * Handle the /metrics pull request and return standard Prometheus string.
     */
    public handlePull(): string {
        const snapshots = this.registry.getMetrics();
        let output = '';

        for (const metric of snapshots) {
            const labelStr = metric.labels ? 
                `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : '';
            
            // Format: metric_name{label="value"} value timestamp
            output += `${metric.name.replace(/\./g, '_')}${labelStr} ${metric.value}\n`;
        }

        return output;
    }
}
