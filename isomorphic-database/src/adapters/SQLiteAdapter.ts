import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';
import * as crypto from 'crypto';

export interface SQLiteConfig {
    filename: string;
}

export class SQLiteAdapter implements IDatabaseAdapter {
    public readonly name = 'native-sqlite';
    private db: any;
    private initializedTables = new Set<string>();

    constructor(private readonly config: SQLiteConfig) {}

    async init(): Promise<void> {
        try {
            // @ts-ignore
            const Database = (await import('better-sqlite3')).default;
            this.db = new Database(this.config.filename);
        } catch (error) {
            throw new Error(`Failed to initialize SQLiteAdapter: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            this.db.close();
        }
    }

    private ensureTable(table: string, columns: string[]): void {
        // We still check set to avoid repeated PRAGMA calls in a single session if possible,
        // but we'll be more careful.
        
        // Ensure table exists with an 'id' primary key
        this.db.prepare(`CREATE TABLE IF NOT EXISTS ${this.escape(table)} (id TEXT PRIMARY KEY)`).run();

        // Check existing columns
        const info = this.db.prepare(`PRAGMA table_info(${this.escape(table)})`).all();
        const existingCols = new Set(info.map((c: any) => c.name));

        // Add missing columns
        for (const col of columns) {
            if (!existingCols.has(col)) {
                this.db.prepare(`ALTER TABLE ${this.escape(table)} ADD COLUMN ${this.escape(col)} NUMERIC`).run();
            }
        }

        this.initializedTables.add(table);
    }

    async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
        const rows = this.db.prepare(sql).all(this.mapParams(params));
        return rows.map((row: any) => this.mapResult(row)) as T[];
    }

    async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
        const row = this.db.prepare(sql).get(this.mapParams(params));
        return this.mapResult(row) as T | undefined;
    }

    async run(sql: string, params: unknown[] = []): Promise<DatabaseResult> {
        const res = this.db.prepare(sql).run(this.mapParams(params));
        return { changes: res.changes, lastInsertId: res.lastInsertRowid };
    }

    private mapParams(params: unknown[]): unknown[] {
        return params.map(p => {
            if (p !== null && typeof p === 'object' && !Buffer.isBuffer(p)) {
                return JSON.stringify(p);
            }
            return p;
        });
    }

    private mapResult(row: any): any {
        if (!row) return row;
        const mapped: any = {};
        for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                    mapped[key] = JSON.parse(value);
                } catch {
                    mapped[key] = value;
                }
            } else {
                mapped[key] = value;
            }
        }
        return mapped;
    }

    async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
        return this.all<T>(sql, params);
    }

    // High Level CRUD using AST
    private processAST(ast: QueryAST): { where: string; params: unknown[] } {
        const clauses: string[] = [];
        const params: unknown[] = [];
        const ALLOWED_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS', 'IS NOT'];

        if (ast.tenantId) {
            clauses.push(`${this.escape('tenant_id')} = ?`);
            params.push(ast.tenantId);
        }

        for (const f of ast.filters) {
            const op = ALLOWED_OPERATORS.includes(f.operator.toUpperCase()) ? f.operator : '=';
            clauses.push(`${this.escape(f.column)} ${op} ?`);
            params.push(f.value);
        }

        const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
        return { where, params };
    }

    async find<T = unknown>(ast: QueryAST): Promise<T[]> {
        try {
            const { where, params } = this.processAST(ast);
            const cols = ast.select && ast.select.length > 0 ? ast.select.map(c => this.escape(c)).join(', ') : '*';
            let sql = `SELECT ${cols} FROM ${this.escape(ast.table)} ${where}`.trim();

            if (ast.limit !== undefined) {
                sql += ` LIMIT ?`;
                params.push(ast.limit);
            } else if (ast.offset !== undefined) {
                // SQLite requires LIMIT if OFFSET is used. -1 means no limit.
                sql += ` LIMIT -1`;
            }

            if (ast.offset !== undefined) {
                sql += ` OFFSET ?`;
                params.push(ast.offset);
            }

            return await this.all<T>(sql, params);
        } catch (e: any) {
            if (e.message.includes('no such table')) return [];
            throw e;
        }
    }

    async count(ast: QueryAST): Promise<number> {
        try {
            const { where, params } = this.processAST(ast);
            const sql = `SELECT COUNT(*) as count FROM ${this.escape(ast.table)} ${where}`.trim();
            const rows = await this.query<{ count: number }>(sql, params);
            return rows[0]?.count || 0;
        } catch (e: any) {
            if (e.message.includes('no such table')) return 0;
            throw e;
        }
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        const { id, ...cleanData } = data as any;
        const generatedId = crypto.randomUUID();
        const payload = { id: generatedId, ...cleanData };

        const keys = Object.keys(payload);
        this.ensureTable(table, keys);

        const columns = keys.map(k => this.escape(String(k))).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.escape(table)} (${columns}) VALUES (${placeholders})`;
        const params = keys.map(k => payload[k]);
        
        await this.run(sql, params);
        return { changes: 1, lastInsertId: generatedId };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        const { id, ...cleanData } = data as any;
        const setKeys = Object.keys(cleanData);
        
        if (setKeys.length > 0) {
            this.ensureTable(ast.table, setKeys);
        }

        const setClause = setKeys.map(k => `${this.escape(String(k))} = ?`).join(', ');
        const { where, params: whereParams } = this.processAST(ast);
        const sql = `UPDATE ${this.escape(ast.table)} SET ${setClause} ${where}`.trim();
        const params = [...setKeys.map(k => cleanData[k]), ...whereParams];
        
        try {
            return await this.run(sql, params);
        } catch (e: any) {
            if (e.message.includes('no such table')) return { changes: 0 };
            throw e;
        }
    }

    async delete(ast: QueryAST): Promise<DatabaseResult> {
        try {
            const { where, params } = this.processAST(ast);
            const sql = `DELETE FROM ${this.escape(ast.table)} ${where}`.trim();
            return await this.run(sql, params);
        } catch (e: any) {
            if (e.message.includes('no such table')) return { changes: 0 };
            throw e;
        }
    }

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
        this.db.prepare('BEGIN TRANSACTION').run();
        try {
            const result = await fn();
            this.db.prepare('COMMIT').run();
            return result;
        } catch (e) {
            this.db.prepare('ROLLBACK').run();
            throw e;
        }
    }

    private escape(name: string): string {
        return `"${name.replace(/"/g, '""')}"`;
    }
}
