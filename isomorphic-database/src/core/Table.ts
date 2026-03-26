import { z } from 'zod';
import { IDatabaseAdapter, DatabaseResult, QueryAST, FilterOperator } from '../interfaces/IDatabaseAdapter';

export { IDatabaseAdapter, DatabaseResult, QueryAST, FilterOperator };

/**
 * TableDefinition — Stores the metadata and schema for a table.
 */
export interface TableDefinition<T extends z.AnyZodObject, N extends string = string> {
    name: N;
    schema: T;
}

/**
 * defineTable — Creates a type-safe table definition from a Zod schema.
 */
export function defineTable<T extends z.AnyZodObject, N extends string>(name: N, schema: T): TableDefinition<T, N> {
    return { name, schema };
}
