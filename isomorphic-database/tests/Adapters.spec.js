"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQLiteAdapter_1 = require("../src/adapters/SQLiteAdapter");
const MockDatabaseAdapter_1 = require("../src/adapters/MockDatabaseAdapter");
const mockDriver = {
    prepare: () => ({
        run: () => ({ changes: 0 }),
        all: () => [],
        get: () => undefined
    }),
    close: () => { }
};
describe('Database Adapters', () => {
    test('SQLiteAdapter should initialize with driver', async () => {
        const adapter = new SQLiteAdapter_1.SQLiteAdapter(mockDriver);
        expect(adapter.name).toBe('native-sqlite');
        const results = await adapter.query('SELECT 1', []);
        expect(results).toEqual([]);
    });
    test('MockDatabaseAdapter should store and retrieve data', async () => {
        const adapter = new MockDatabaseAdapter_1.MockDatabaseAdapter();
        await adapter.insert('users', { id: 1, name: 'Alice' });
        const results = await adapter.query('SELECT * FROM users WHERE id = ?', [1]);
        expect(results).toEqual([{ id: 1, name: 'Alice' }]);
        expect(adapter.queries[0].sql).toContain('FROM users');
    });
});
