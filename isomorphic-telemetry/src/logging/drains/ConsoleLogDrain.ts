import { ILogger } from '@flybyme/isomorphic-core';
import { ILogDrain } from '../ILogDrain';
import { LogEntry } from '../LogDrainer';

/**
 * ConsoleLogDrain — A log drain that outputs to the system console.
 * Includes robust pretty-printing for development environments.
 */
export class ConsoleLogDrain implements ILogDrain {
    public readonly name = 'console';

    private readonly colors = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        blue: "\x1b[34m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
    };

    private readonly levelColors: Record<string, string> = {
        info: this.colors.blue,
        warn: this.colors.yellow,
        error: this.colors.red,
        debug: this.colors.magenta,
    };

    constructor(private options: { pretty?: boolean, logger?: ILogger } = { pretty: true }) {}

    public push(entry: LogEntry): void {
        if ((globalThis as unknown as Record<string, unknown>).MESH_SILENT) return;
        
        // Hide internal system chatter from the console to keep it clean.
        // Internal logs are intended for the mesh telemetry sink only.
        if (entry.internal || entry.data?.internal === true || entry.context?.internal === true) {
            return;
        }

        if (this.options.logger) {
            this.logToLogger(entry);
            return;
        }

        if (this.options.pretty) {
            this.logPretty(entry);
        } else {
            console.log(JSON.stringify(entry));
        }
    }

    private logToLogger(entry: LogEntry): void {
        const logger = this.options.logger!;
        // Ensure internal flag is stripped before delegating if needed, 
        // but here we just pass the data.
        switch (entry.level) {
            case 'debug': logger.debug(entry.message, entry.data); break;
            case 'info': logger.info(entry.message, entry.data); break;
            case 'warn': logger.warn(entry.message, entry.data); break;
            case 'error': logger.error(entry.message, entry.data); break;
        }
    }

    private logPretty(entry: LogEntry): void {
        const color = this.levelColors[entry.level] || this.colors.reset;
        const ts = new Date(entry.timestamp).toISOString().replace(/T/, ' ').replace(/\..+/, '');
        const lvl = `${color}${this.colors.bright}${entry.level.toUpperCase().padEnd(5)}${this.colors.reset}`;
        const msg = `${this.colors.bright}${entry.message}${this.colors.reset}`;
        
        // Extract nodeID and component from data or context if present
        const ctx = { ...(entry.context || {}), ...(entry.data || {}) };
        const nodeID = entry.nodeID || ctx.nodeID;
        const component = ctx.component;
        
        const nodeInfo = nodeID ? ` \x1b[32m[${nodeID}]\x1b[0m` : '';
        const compInfo = component ? ` \x1b[36m[${component}]\x1b[0m` : '';

        // Compact Data Printing (Single line)
        let dataStr = '';
        const displayData = { ...entry.data };
        delete (displayData as Record<string, unknown>).nodeID;
        delete (displayData as Record<string, unknown>).component;
        delete (displayData as Record<string, unknown>).internal;

        if (Object.keys(displayData).length > 0) {
            try {
                const json = JSON.stringify(displayData);
                dataStr = ` \x1b[2m${json}\x1b[0m`;
            } catch {
                dataStr = ' [Circular Data]';
            }
        }

        const traceInfo = entry.traceId ? ` [trace=${entry.traceId.substring(0, 8)}]` : '';

        console.log(`${this.colors.dim}[${ts}]${this.colors.reset}${nodeInfo}${compInfo} ${lvl}${traceInfo} ${msg}${dataStr}`);
    }
}
