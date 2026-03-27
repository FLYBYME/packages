import { IMeshModule, IMeshApp, ILogger, IServiceBroker, IMeshNetwork } from '@flybyme/isomorphic-core';
import { MetricsRegistry } from './metrics/MetricsRegistry';
import { LogDrainer } from './logging/LogDrainer';
import { StructuredLogger } from './logging/StructuredLogger';
import { LogImporter } from './logging/LogImporter';
import { PrometheusExporter } from './metrics/PrometheusExporter';
import { DatadogExporter } from './metrics/DatadogExporter';
import { ConsoleMetricsExporter } from './metrics/ConsoleMetricsExporter';
import { ITraceExporter } from './tracing/ITraceExporter';
import { JaegerExporter } from './tracing/JaegerExporter';
import { ZipkinExporter } from './tracing/ZipkinExporter';
import { TraceDrainer } from './tracing/TraceDrainer';
import { ConsoleTraceExporter } from './tracing/ConsoleTraceExporter';
import { ILogDrain } from './logging/ILogDrain';
import { ConsoleLogDrain } from './logging/drains/ConsoleLogDrain';
import { MeshLogDrain } from './logging/drains/MeshLogDrain';
import { LoggerPlugin } from './logging/LoggerPlugin';

export interface TelemetryModuleOptions {
    logging?: {
        enabled?: boolean;
        level?: number;
        drains?: ('console' | 'mesh' | ILogDrain)[];
    };
    metrics?: {
        enabled?: boolean;
        console?: { enabled: boolean; intervalMs?: number };
        prometheus?: { enabled: boolean; path?: string };
        datadog?: { enabled: boolean; apiKey: string; intervalMs?: number };
    };
    tracing?: {
        enabled?: boolean;
        exporters?: ('jaeger' | 'zipkin' | 'console' | ITraceExporter)[];
        jaegerEndpoint?: string;
        zipkinEndpoint?: string;
        flushIntervalMs?: number;
    };
    isSink?: boolean;
    
    // Legacy support (to be removed)
    enableLogging?: boolean;
}

/**
 * TelemetryModule — Manages the lifecycle of observability components.
 * Configures registries, drains, and enhanced logging.
 */
export class TelemetryModule implements IMeshModule {
    public readonly name = 'telemetry';
    private metricsRegistry: MetricsRegistry;
    private logDrainer: LogDrainer;
    private logImporter: LogImporter | null = null;
    private datadogExporter: DatadogExporter | null = null;
    private consoleMetricsExporter: ConsoleMetricsExporter | null = null;
    private traceDrainer: TraceDrainer | null = null;
    public logger: ILogger | undefined;
    private loggerPlugin: LoggerPlugin | null = null;

    constructor(private options: TelemetryModuleOptions = {}) {
        this.metricsRegistry = new MetricsRegistry();
        this.logDrainer = new LogDrainer();
    }

    /**
     * Initialize observability providers and background workers.
     */
    public onInit(app: IMeshApp): void {
        // 1. Register Metrics Registry
        app.registerProvider('metrics', this.metricsRegistry);

        // 2. Initialize Logging
        this.setupLogging(app);

        // 3. Initialize Sink (if configured)
        if (this.options.isSink) {
            app.logger.info('Initializing LogImporter sink...', { internal: true });
            this.logImporter = new LogImporter(app);
            this.logImporter.start();
        }

        // 4. Initialize Metrics Exporters
        const metOpts = this.options.metrics || {};
        if (metOpts.console?.enabled) {
            this.consoleMetricsExporter = new ConsoleMetricsExporter(this.metricsRegistry, { intervalMs: metOpts.console.intervalMs });
            this.consoleMetricsExporter.start();
        }

        if (metOpts.prometheus?.enabled) {
            this.setupPrometheus(app);
        }

        if (metOpts.datadog?.enabled && metOpts.datadog.apiKey) {
            this.datadogExporter = new DatadogExporter(this.metricsRegistry, {
                apiKey: metOpts.datadog.apiKey,
                intervalMs: metOpts.datadog.intervalMs
            });
            this.datadogExporter.start();
        }

        // 5. Initialize Tracing Exporters
        const trcOpts = this.options.tracing || {};
        if (trcOpts.enabled) {
            this.setupTracing();
        }

        // 6. Tie to Network Stack for resiliency tracking
        try {
            const network = app.getProvider<IMeshNetwork>('network');
            if (typeof network.setMetrics === 'function') {
                network.setMetrics(this.metricsRegistry);
            }
        } catch {
            // Network not available
        }

        // 7. Setup Metrics & Tracing Middleware in ServiceBroker
        try {
            const broker = app.getProvider<IServiceBroker>('broker');
            this.setupBrokerMiddleware(broker);
            
            // Pipe Logger Plugin
            if (this.loggerPlugin) {
                broker.pipe(this.loggerPlugin);
            }
        } catch {
            // Broker may be registered later.
        }
    }

    /**
     * Stop background telemetry workers.
     */
    public async onStop(): Promise<void> {
        await this.logDrainer.stop();
        if (this.datadogExporter) this.datadogExporter.stop();
        if (this.consoleMetricsExporter) this.consoleMetricsExporter.stop();
        if (this.traceDrainer) await this.traceDrainer.stop();
    }

    /**
     * Called when the broker is ready.
     */
    public onStart(app: IMeshApp): void {
        try {
            const broker = app.getProvider<IServiceBroker>('broker');
            if (this.loggerPlugin) {
                broker.pipe(this.loggerPlugin);
            }
        } catch {
            // No broker
        }
    }

    private setupLogging(app: IMeshApp): void {
        const logOpts = this.options.logging || {};
        const isEnabled = logOpts.enabled ?? this.options.enableLogging ?? true;
        if (!isEnabled) return;

        const drains = logOpts.drains || ['console', 'mesh'];
        
        // Use the existing drainer if available (e.g. from app shell or previous module)
        if (app.hasProvider('log_drainer')) {
            this.logDrainer = app.getProvider<LogDrainer>('log_drainer');
        } else {
            app.registerProvider('log_drainer', this.logDrainer);
        }

        for (const d of drains) {
            if (d === 'console') {
                this.logDrainer.addDrain(new ConsoleLogDrain({ pretty: true }));
            } else if (d === 'mesh') {
                this.logDrainer.addDrain(new MeshLogDrain(app));
            } else if (typeof d === 'object') {
                this.logDrainer.addDrain(d);
            }
        }

        this.logDrainer.start();

        let parsedLevel = logOpts.level ?? app.logger?.getLevel() ?? 1;
        const rawLevel = (this.options as Record<string, unknown>).logLevel;
        if (typeof rawLevel === 'string') {
            const map: Record<string, number> = { 'debug': 0, 'info': 1, 'warn': 2, 'error': 3, 'trace': 0, 'fatal': 3 };
            parsedLevel = map[rawLevel.toLowerCase()] ?? parsedLevel;
        }

        const currentLevel = parsedLevel;
        this.logger = new StructuredLogger({ nodeID: app.nodeID }, this.logDrainer, currentLevel);
        
        // Overwrite the app's default logger with our enhanced structured logger.
        app.logger = this.logger;
        app.registerProvider('logger', this.logger);

        // Initialize Logger Plugin
        this.loggerPlugin = new LoggerPlugin(this.logger);
    }

    private setupPrometheus(app: IMeshApp): void {
        const prometheus = new PrometheusExporter(this.metricsRegistry);
        const path = this.options.metrics?.prometheus?.path || '/metrics';

        try {
            const network = app.getProvider<IMeshNetwork>('network');
            // Define a local structural interface for the Prometheus check
            interface IMeshWithServer {
                server?: {
                    getApp: () => {
                        get: (path: string, cb: (req: unknown, res: { set: (k: string, v: string) => void, send: (v: string) => void }) => void) => void;
                    };
                };
            }
            
            const server = (network as unknown as IMeshWithServer).server;
            if (server?.getApp()) {
                const expressApp = server.getApp();
                expressApp.get(path, (_req: unknown, res: { set: (k: string, v: string) => void, send: (v: string) => void }) => {
                    res.set('Content-Type', 'text/plain');
                    res.send(prometheus.handlePull());
                });
            }
        } catch {
            // Network not available
        }
    }

    private setupTracing(): void {
        const tracingOpts = this.options.tracing!;
        this.traceDrainer = new TraceDrainer({ flushIntervalMs: tracingOpts.flushIntervalMs });

        const exporters = tracingOpts.exporters || ['console'];

        for (const exporter of exporters) {
            if (typeof exporter === 'string') {
                if (exporter === 'jaeger' && tracingOpts.jaegerEndpoint) {
                    this.traceDrainer.addExporter(new JaegerExporter(tracingOpts.jaegerEndpoint));
                } else if (exporter === 'zipkin' && tracingOpts.zipkinEndpoint) {
                    this.traceDrainer.addExporter(new ZipkinExporter(tracingOpts.zipkinEndpoint));
                } else if (exporter === 'console') {
                    this.traceDrainer.addExporter(new ConsoleTraceExporter());
                }
            } else {
                this.traceDrainer.addExporter(exporter);
            }
        }

        this.traceDrainer.start();
    }

    private setupBrokerMiddleware(broker: IServiceBroker): void {
        broker.use(async (ctx, next) => {
            const startTime = Date.now();

            // 1. Record Request Metric
            this.metricsRegistry.increment('mesh.request.count', 1, { action: ctx.actionName });

            try {
                const result = await next();

                const latency = Date.now() - startTime;

                // 2. Record Latency Metric
                this.metricsRegistry.observe('mesh.request.latency', latency, { action: ctx.actionName });

                // 3. Record Span if tracing enabled
                if (this.options.tracing?.enabled && ctx.traceId && ctx.spanId && this.traceDrainer) {
                    this.traceDrainer.push({
                        traceId: ctx.traceId,
                        spanId: ctx.spanId,
                        parentId: ctx.parentId,
                        name: ctx.actionName,
                        startTime,
                        endTime: Date.now(),
                        tags: { nodeID: ctx.nodeID }
                    });
                }

                return result;
            } catch (err) {
                // 4. Record Error Metric
                this.metricsRegistry.increment('mesh.request.error', 1, { action: ctx.actionName });
                throw err;
            }
        });
    }
}
