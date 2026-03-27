import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';
import * as crypto from 'crypto';

export interface PostgresConfig {
    connectionString: string;
    ssl?: boolean | object;
}

interface IPostgresResult<T = unknown> {
    rows: T[];
    rowCount: number;
}

interface IPostgresClient {
    query<T = unknown>(sql: string, params?: unknown[]): Promise<IPostgresResult<T>>;
    release(): void;
}

interface IPostgresPool {
    query<T = unknown>(sql: string, params?: unknown[]): Promise<IPostgresResult<T>>;
    connect(): Promise<IPostgresClient>;
    end(): Promise<void>;
}

interface IPostgresStatic {
    Pool: new (config: object) => IPostgresPool;
}

export class PostgresAdapter implements IDatabaseAdapter {
    public readonly name = 'native-postgres';
    private pool?: IPostgresPool;
    private initializedTables = new Set<string>();

    constructor(private readonly config: PostgresConfig) {}

    async init(): Promise<void> {
        try {
            // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
            // @ts-ignore - pg might not be available at compile time or type mismatch during dynamic import
            const { Pool } = await import('pg') as unknown as IPostgresStatic;
            this.pool = new Pool({
                connectionString: this.config.connectionString,
                ssl: this.config.ssl
            });
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            throw new Error(`Failed to initialize PostgresAdapter: ${error.message}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
        }
    }

    private async ensureTable(table: string, columns: string[]): Promise<void> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        // Ensure table exists with an 'id' primary key
        await this.pool.query(`CREATE TABLE IF NOT EXISTS ${this.escape(table)} (id TEXT PRIMARY KEY)`);

        // Check existing columns
        const info = await this.pool.query<{ column_name: string }>(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [table]);
        const existingCols = new Set(info.rows.map(r => r.column_name));

        // Add missing columns
        for (const col of columns) {
            if (!existingCols.has(col)) {
                await this.pool.query(`ALTER TABLE ${this.escape(table)} ADD COLUMN ${this.escape(col)} TEXT`);
            }
        }

        this.initializedTables.add(table);
    }

    private escape(name: string): string {
        return `"${name.replace(/"/g, '""')}"`;
    }

    private processAST(ast: QueryAST, startIndex = 1): { where: string; params: unknown[] } {
        const clauses: string[] = [];
        const params: unknown[] = [];
        let index = startIndex;

        if (ast.tenantId) {
            clauses.push(`${this.escape('tenant_id')} = $${index++}`);
            params.push(ast.tenantId);
        }

        for (const f of ast.filters) {
            clauses.push(`${this.escape(f.column)} ${f.operator} $${index++}`);
            params.push(f.value);
        }

        const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
        return { where, params };
    }

    async find<T = unknown>(ast: QueryAST): Promise<T[]> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        try {
            const { where, params } = this.processAST(ast, 1);
            const cols = ast.select && ast.select.length > 0 ? ast.select.map(c => this.escape(c)).join(', ') : '*';
            let sql = `SELECT ${cols} FROM ${this.escape(ast.table)} ${where}`.trim();

            if (ast.limit !== undefined) sql += ` LIMIT ${ast.limit}`;
            if (ast.offset !== undefined) sql += ` OFFSET ${ast.offset}`;

            const res = await this.pool.query<T>(sql, params);
            return res.rows;
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message.includes('does not exist')) return [];
            throw error;
        }
    }

    async count(ast: QueryAST): Promise<number> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        try {
            const { where, params } = this.processAST(ast, 1);
            const sql = `SELECT COUNT(*) as count FROM ${this.escape(ast.table)} ${where}`.trim();
            const res = await this.pool.query<{ count: string | number }>(sql, params);
            return Number(res.rows[0]?.count || 0);
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message.includes('does not exist')) return 0;
            throw error;
        }
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...cleanData } = data as unknown as Record<string, unknown>;
        const generatedId = crypto.randomUUID();
        const payload: Record<string, unknown> = { id: generatedId, ...cleanData };

        const keys = Object.keys(payload);
        await this.ensureTable(table, keys);

        const columns = keys.map(k => this.escape(String(k))).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${this.escape(table)} (${columns}) VALUES (${placeholders}) RETURNING id`;
        const params = keys.map(k => payload[k]);
        
        const res = await this.pool.query<{ id: string }>(sql, params);
        return { changes: res.rowCount, lastInsertId: res.rows[0]?.id || generatedId };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...cleanData } = data as unknown as Record<string, unknown>;
        const setKeys = Object.keys(cleanData);
        
        if (setKeys.length > 0) {
            await this.ensureTable(ast.table, setKeys);
        }

        const params: unknown[] = [];
        let index = 1;
        const setClause = setKeys.map(k => {
            params.push(cleanData[k]);
            return `${this.escape(String(k))} = $${index++}`;
        }).join(', ');
        
        const { where, params: whereParams } = this.processAST(ast, index);
        params.push(...whereParams);

        const sql = `UPDATE ${this.escape(ast.table)} SET ${setClause} ${where}`.trim();
        try {
            const res = await this.pool.query(sql, params);
            return { changes: res.rowCount };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message.includes('does not exist')) return { changes: 0 };
            throw error;
        }
    }

    async delete(ast: QueryAST): Promise<DatabaseResult> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        try {
            const { where, params } = this.processAST(ast, 1);
            const sql = `DELETE FROM ${this.escape(ast.table)} ${where}`.trim();
            const res = await this.pool.query(sql, params);
            return { changes: res.rowCount };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message.includes('does not exist')) return { changes: 0 };
            throw error;
        }
    }

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
        if (!this.pool) throw new Error('PostgresAdapter not initialized');
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn();
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
