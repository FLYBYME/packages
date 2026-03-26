import { SQLiteAdapter } from '../src/adapters/SQLiteAdapter';
import { MockDatabaseAdapter } from '../src/adapters/MockDatabaseAdapter';

const mockRun = jest.fn().mockReturnValue({ changes: 0, lastInsertRowid: 0 });
const mockPrepare = jest.fn().mockReturnValue({
    run: mockRun,
    all: jest.fn().mockReturnValue([]),
    get: jest.fn().mockReturnValue(undefined)
});

jest.mock('better-sqlite3', () => {
    return jest.fn().mockImplementation(() => {
        return {
            prepare: mockPrepare,
            close: jest.fn()
        };
    });
}, { virtual: true });

describe('Database Adapters', () => {
    test('SQLiteAdapter should initialize with config', async () => {
        const adapter = new SQLiteAdapter({ filename: ':memory:' });
        expect(adapter.name).toBe('native-sqlite');

        await adapter.init();
        const results = await adapter.query('SELECT 1', []);
        expect(results).toEqual([]);
        expect(mockPrepare).toHaveBeenCalledWith('SELECT 1');
    });

    test('MockDatabaseAdapter should store and retrieve data', async () => {
        const adapter = new MockDatabaseAdapter();
        await adapter.init();
        await adapter.insert('users', { id: '1', name: 'Alice' });

        const results = await adapter.query('SELECT * FROM users WHERE id = ?', ['1']);
        expect(results).toEqual([{ id: '1', name: 'Alice' }]);
        expect(adapter.queries[0].sql).toContain('FROM users');
    });
});
