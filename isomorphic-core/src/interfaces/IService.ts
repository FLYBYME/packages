import { IContext } from './IContext';
import { ILogger } from './ILogger';
import { IServiceBroker } from './IServiceBroker';

export interface IActionDefinition<TParams = Record<string, unknown>, TReturns = unknown> {
    params?: import('zod').ZodType<TParams>;
    returns?: import('zod').ZodType<TReturns>;
    handler: IActionHandler<TParams, TReturns>;
    mutates?: boolean;
    timeout?: number;
}

export type IActionHandler<TParams = Record<string, unknown>, TReturns = unknown> = (
    ctx: IContext<TParams, Record<string, unknown>>
) => Promise<TReturns>;

export type ServiceState =
    | 'started'
    | 'stopped'
    | 'starting'
    | 'stopping'
    | 'pausing'
    | 'paused'
    | 'errored'
    | 'initializing'
    | 'running';

export interface ICronDefinition {
    schedule: string;
    action: string;
    params?: Record<string, unknown>;
    timeZone?: string;
}

export interface IServiceSchema {
    name: string;
    version?: string | number;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    dependencies?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions?: Record<string, IActionDefinition<any, any>>;
    events?: Record<string, unknown>;
    methods?: Record<string, (...args: unknown[]) => unknown>;
    cron?: ICronDefinition[];

    // Lifecycle hooks
    created?: (app: unknown) => void | Promise<void>;
    started?: () => void | Promise<void>;
    stopped?: () => void | Promise<void>;
    paused?: () => void | Promise<void>;
    resumed?: () => void | Promise<void>;
}

export interface IServiceInstance<TSchema extends IServiceSchema = IServiceSchema> {
    readonly name: string;
    readonly fullName: string;
    readonly version?: string | number;
    readonly schema: TSchema;
    state: ServiceState;
    logger: ILogger;
    broker: IServiceBroker;

    start(): Promise<void>;
    stop(): Promise<void>;
}
