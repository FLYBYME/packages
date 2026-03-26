import { IDatabaseAdapter, DatabaseResult, QueryAST } from '../interfaces/IDatabaseAdapter';

/**
 * MockDatabaseAdapter — In-memory mock for testing.
 * Supports basic SQL parsing for QueryBuilder compatibility.
 */
export class MockDatabaseAdapter implements IDatabaseAdapter {
    public name = 'mock-db';
    public queries: { sql: string, params: unknown[] }[] = [];
    private store: Map<string, Record<string, unknown>[]> = new Map();

    async init(): Promise<void> {}
    async disconnect(): Promise<void> {}

    async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
        return this.query<T>(sql, params);
    }

    async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
        const results = await this.all<T>(sql, params);
        return results[0];
    }

    async query<T = unknown>(sql: string, params: unknown[]): Promise<T[]> {
        this.queries.push({ sql, params });
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (!tableMatch) return [];
        
        const tableName = tableMatch[1];
        let results = (this.store.get(tableName) || []) as Record<string, unknown>[];

        // Basic WHERE id = ? filtering
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
            const column = whereMatch[1];
            const value = params[0];
            results = results.filter(row => row[column] === value);
        }

        return results as T[];
    }

    async run(sql: string, params: unknown[] = []): Promise<DatabaseResult> {
        this.queries.push({ sql, params });
        const sqlTrim = sql.trim().toUpperCase();

        if (sqlTrim.startsWith('INSERT INTO')) {
            const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
            if (tableMatch) {
                const tableName = tableMatch[1];
                const existing = this.store.get(tableName) || [];
                
                const colsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
                if (colsMatch) {
                    const cols = colsMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
                    const row: Record<string, unknown> = {};
                    cols.forEach((col, i) => {
                        if (col !== 'id') {
                            row[col] = params[i];
                        }
                    });
                    const id = String(existing.length + 1);
                    row.id = id;
                    existing.push(row);
                    this.store.set(tableName, existing);
                    return { changes: 1, lastInsertId: id };
                }
            }
        }

        if (sqlTrim.startsWith('UPDATE')) {
            const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
            if (tableMatch) {
                const tableName = tableMatch[1];
                const existing = this.store.get(tableName) || [];
                
                // Very basic UPDATE ... SET ... WHERE id = ?
                const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                    const whereCol = whereMatch[1];
                    const whereVal = params[params.length - 1]; // Assume last param is for WHERE
                    
                    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
                    if (setMatch) {
                        const setParts = setMatch[1].split(',').map(s => s.trim().split('=')[0].trim().replace(/"/g, ''));
                        let changes = 0;
                        const updated = existing.map((row): Record<string, unknown> => {
                            if (row[whereCol] === whereVal) {
                                changes++;
                                setParts.forEach((col, i) => {
                                    row[col] = params[i];
                                });
                            }
                            return row;
                        });
                        this.store.set(tableName, updated);
                        return { changes };
                    }
                }
            }
        }

        return { changes: 0 };
    }

    private applyASTFilters(row: Record<string, unknown>, ast: QueryAST): boolean {
        if (ast.tenantId && row.tenant_id !== ast.tenantId) return false;
        for (const f of ast.filters) {
            const val = row[f.column];
            if (f.operator === '=' || f.operator === '$eq') { if (val !== f.value) return false; }
            else if (f.operator === '!=' || f.operator === '$ne') { if (val === f.value) return false; }
            else if (f.operator === '>' || f.operator === '$gt') { if ((val as any) <= (f.value as any)) return false; }
            else if (f.operator === '<' || f.operator === '$lt') { if ((val as any) >= (f.value as any)) return false; }
            else if (f.operator === '>=' || f.operator === '$gte') { if ((val as any) < (f.value as any)) return false; }
            else if (f.operator === '<=' || f.operator === '$lte') { if ((val as any) > (f.value as any)) return false; }
            else if (f.operator === '$contains') {
                if (!Array.isArray(val)) return false;
                if (!val.includes(f.value)) return false;
            }
            else if (f.operator === '$like') {
                if (typeof val !== 'string' || typeof f.value !== 'string') return false;
                const regex = new RegExp(f.value.replace(/%/g, '.*'), 'i');
                if (!regex.test(val)) return false;
            }
        }
        return true;
    }

    async find<T = unknown>(ast: QueryAST): Promise<T[]> {
        let existing = (this.store.get(ast.table) || []) as T[];
        existing = existing.filter(row => this.applyASTFilters(row as Record<string, unknown>, ast));
        
        if (ast.offset) existing = existing.slice(ast.offset);
        if (ast.limit) existing = existing.slice(0, ast.limit);
        
        if (ast.select && ast.select.length > 0) {
            existing = existing.map(row => {
                const picked: any = {};
                for (const col of ast.select!) picked[col] = (row as any)[col];
                return picked;
            });
        }
        return existing;
    }

    async count(ast: QueryAST): Promise<number> {
        const existing = (this.store.get(ast.table) || []) as Record<string, unknown>[];
        return existing.filter(row => this.applyASTFilters(row, ast)).length;
    }

    async insert<T = unknown>(table: string, data: T): Promise<DatabaseResult> {
        const existing = this.store.get(table) || [];
        const { id: _ignored, ...cleanData } = data as any;
        const id = String(existing.length + 1);
        const row = { ...cleanData, id };
        existing.push(row);
        this.store.set(table, existing);
        return { changes: 1, lastInsertId: id };
    }

    async update<T = unknown>(ast: QueryAST, data: Partial<T>): Promise<DatabaseResult> {
        const existing = (this.store.get(ast.table) || []) as T[];
        let changes = 0;
        const updated = existing.map(row => {
            if (this.applyASTFilters(row as Record<string, unknown>, ast)) {
                changes++;
                return { ...row, ...data };
            }
            return row;
        });
        this.store.set(ast.table, updated as Record<string, unknown>[]);
        return { changes };
    }

    async delete(ast: QueryAST): Promise<DatabaseResult> {
        const existing = (this.store.get(ast.table) || []) as Record<string, unknown>[];
        const initialCount = existing.length;
        const filtered = existing.filter(row => !this.applyASTFilters(row, ast));
        this.store.set(ast.table, filtered);
        return { changes: initialCount - filtered.length };
    }

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
        return fn();
    }
}
