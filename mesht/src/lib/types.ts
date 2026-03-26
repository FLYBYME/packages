// FILE: src/lib/types.ts
// Shared type utilities for MeshT domain services.

import { z } from 'zod';
import { QueryBuilder } from '@flybyme/isomorphic-database';
import { IServiceBroker, ILogger } from '@flybyme/isomorphic-core';

/**
 * Shape injected by DatabaseMixin onto `this`.
 *
 * DatabaseMixin(primaryTable, ...extraTables)(BaseClass) injects:
 *   - db:      QueryBuilder<T>          (for the primary table)
 *   - dbs:     Record<string, QueryBuilder<ZodObject>>  (all tables by name)
 *   - broker:  IServiceBroker
 *   - logger:  ILogger                   (child logger with service context)
 */
export interface MixinContext<T extends z.ZodObject<z.ZodRawShape>> {
  readonly db: QueryBuilder<T>;
  readonly dbs: Record<string, QueryBuilder<z.ZodObject<z.ZodRawShape>>>;
  readonly broker: IServiceBroker;
  readonly logger: ILogger;
}

/**
 * Inferred row type from a Zod schema (what .execute() returns).
 */
export type Row<T extends z.ZodObject<z.ZodRawShape>> = z.infer<T>;
