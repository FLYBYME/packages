export interface DatabaseResult {
    lastInsertId?: number | string;
    changes: number;
}

export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | '$eq' | '$ne' | '$gt' | '$lt' | '$gte' | '$lte' | '$contains' | '$like';

export interface QueryFilter {
    column: string;
    operator: FilterOperator;
    value: unknown;
}

export interface QueryAST {
    table: string;
    select?: string[];
    filters: QueryFilter[];
    limit?: number;
    offset?: number;
    tenantId?: string;
}

/**
 * IDatabaseAdapter — Abstract interface for pluggable database engines.
 */
export interface IDatabaseAdapter {
    name: string;
    
    init(): Promise<void>;
    disconnect(): Promise<void>;

    // Type-Bound CRUD operations using AST
    find<T = unknown>(ast: QueryAST): Promise<T[]>;
    count(ast: QueryAST): Promise<number>;
    insert<T = unknown>(table: string, data: T): Promise<DatabaseResult>;
    update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult>;
    delete(ast: QueryAST): Promise<DatabaseResult>;

    transaction?<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Global Context Augmentation
 */
declare module '@flybyme/isomorphic-core' {
    export interface IContext {
        db?: IDatabaseAdapter;
        repos?: Record<string, { find(id: string | number): Promise<unknown | null> }>;
    }
}
