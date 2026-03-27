import { TokenPayload, NodeRecord } from './auth.schema';

export interface ILogger {
    debug(msg: string, data?: Record<string, unknown>): void;
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
    child(context: Record<string, unknown>): ILogger;
    getLevel(): number;
}

export interface IAuditLogger {
    log(event: {
        subject: string;
        action: string;
        resource: string;
        result: 'ALLOW' | 'DENY' | 'ERROR';
        metadata?: Record<string, unknown>;
        timestamp?: number;
    }): void | Promise<void>;
}

export interface IStorageAdapter {
    getNode(key: string): Promise<NodeRecord | null>;
    setNode(key: string, value: NodeRecord): Promise<void>;
    deleteNode(key: string): Promise<void>;
    run(sql: string, params?: unknown[]): Promise<unknown>;
    get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
    all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface IAuthUser {
    id: string;
    groups: string[];
    type: TokenPayload['type'];
    tenant_id?: string;
}

/**
 * Type-safe metadata for the ServiceBroker context
 */
export interface IAuthMetadata {
    token?: string;
    user?: IAuthUser;
    [key: string]: unknown;
}

export interface BaseMeshToken {
    iss: string;
    iat?: number;
    exp?: number;
}

export interface TicketGrantingTicketPayload extends BaseMeshToken {
    type: 'TGT';
    sub: string;
    capabilities: string[];
}

export interface ServiceTicketPayload extends BaseMeshToken {
    type: 'ST';
    sub: string;
    aud: string;
    sessionKey?: string;
}
