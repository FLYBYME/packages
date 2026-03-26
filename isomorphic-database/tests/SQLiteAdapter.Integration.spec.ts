import { SQLiteAdapter } from '../src/adapters/SQLiteAdapter';
import { QueryAST } from '../src/interfaces/IDatabaseAdapter';

describe('SQLiteAdapter Integration', () => {
    let adapter: SQLiteAdapter;

    beforeEach(async () => {
        // Use :memory: for real SQLite integration test
        adapter = new SQLiteAdapter({ filename: ':memory:' });
        await adapter.init();
    });

    afterEach(async () => {
        await adapter.disconnect();
    });

    test('should handle find() on non-existent table by returning []', async () => {
        const ast: QueryAST = {
            table: 'non_existent',
            filters: []
        };
        const results = await adapter.find(ast);
        expect(results).toEqual([]);
    });

    test('should handle count() on non-existent table by returning 0', async () => {
        const ast: QueryAST = {
            table: 'non_existent',
            filters: []
        };
        const results = await adapter.count(ast);
        expect(results).toBe(0);
    });

    test('should automatically create table on insert()', async () => {
        const data = { name: 'Alice', age: 30 };
        const res = await adapter.insert('users', data);
        
        expect(res.changes).toBe(1);
        expect(res.lastInsertId).toBeDefined();

        // Verify it actually exists
        const results = await adapter.find({ table: 'users', filters: [] });
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
            name: 'Alice',
            age: 30
        });
    });

    test('should automatically add columns on insert() to existing table', async () => {
        await adapter.insert('users', { name: 'Alice' });
        
        // Insert with new column
        await adapter.insert('users', { name: 'Bob', age: 40 });
        
        const results = await adapter.find({ table: 'users', filters: [{ column: 'name', operator: '=', value: 'Bob' }] });
        expect(results[0]).toMatchObject({
            name: 'Bob',
            age: 40
        });
    });

    test('should handle update() on non-existent table gracefully', async () => {
        const res = await adapter.update({ table: 'non_existent', filters: [] }, { name: 'New' });
        expect(res.changes).toBe(0);
    });

    test('should handle delete() on non-existent table gracefully', async () => {
        const res = await adapter.delete({ table: 'non_existent', filters: [] });
        expect(res.changes).toBe(0);
    });
});
