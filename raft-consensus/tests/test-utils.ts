import { INetworkAdapter } from '../src/interfaces/INetworkAdapter';
import { IStorageAdapter } from '../src/interfaces/IStorageAdapter';
import { ILogger } from '../src/interfaces/ILogger';

export const createMockNetwork = (): jest.Mocked<INetworkAdapter> => ({
    send: jest.fn().mockImplementation(() => Promise.resolve()),
    broadcast: jest.fn().mockImplementation(() => Promise.resolve()),
    on: jest.fn(),
    getNodeID: jest.fn().mockReturnValue('node-1')
});

type SQLParam = string | number | boolean | null | Uint8Array;

interface MockLog {
    index: number;
    term: number;
    namespace: string;
    payload: string;
}

interface MockSnapshot {
    id: number;
    last_index: number;
    last_term: number;
    data: Uint8Array;
    timestamp: number;
}

interface MockLedger {
    index: number;
    namespace: string;
    tx_id: string;
    prev_tx_id: string;
    term: number;
    timestamp: number;
    node_id: string;
    payload: string;
}

export const createMockStorage = (): jest.Mocked<IStorageAdapter> => {
    let logs: MockLog[] = [];
    let snapshots: MockSnapshot[] = [];
    let ledgers: MockLedger[] = [];
    let snapId = 1;

    return {
        run: jest.fn().mockImplementation(async (sql: string, params: SQLParam[] = []) => {
            if (sql.includes('INSERT OR REPLACE INTO raft_log')) {
                const idx = params[0] as number;
                logs = logs.filter(l => l.index !== idx);
                logs.push({ 
                    index: params[0] as number, 
                    term: params[1] as number, 
                    namespace: params[2] as string, 
                    payload: params[3] as string 
                });
            } else if (sql.includes('DELETE FROM raft_log WHERE [index] >= ?')) {
                logs = logs.filter(l => l.index < (params[0] as number));
            } else if (sql.includes('DELETE FROM raft_log WHERE [index] <= ?')) {
                logs = logs.filter(l => l.index > (params[0] as number));
            } else if (sql.includes('INSERT INTO raft_snapshots')) {
                snapshots.push({ 
                    id: snapId++, 
                    last_index: params[0] as number, 
                    last_term: params[1] as number, 
                    data: params[2] as Uint8Array, 
                    timestamp: params[3] as number 
                });
            } else if (sql.includes('INSERT INTO ledger_transactions') || sql.includes('INSERT OR IGNORE INTO ledger_transactions')) {
                ledgers.push({
                    index: params[0] as number, 
                    namespace: params[1] as string, 
                    tx_id: params[2] as string,
                    prev_tx_id: params[3] as string, 
                    term: params[4] as number, 
                    timestamp: params[5] as number,
                    node_id: params[6] as string, 
                    payload: params[7] as string
                });
            } else if (sql.includes('DELETE FROM ledger_transactions WHERE [index] >= ?')) {
                ledgers = ledgers.filter(l => !(l.index >= (params[0] as number) && l.namespace === (params[1] as string)));
            } else if (sql.includes('DELETE FROM ledger_transactions WHERE [index] < ?')) {
                ledgers = ledgers.filter(l => !(l.index < (params[0] as number) && l.namespace === (params[1] as string)));
            }
            return { changes: 1 };
        }),
        get: jest.fn().mockImplementation(async (sql: string, params: SQLParam[] = []) => {
            if (sql.includes('SELECT MAX([index]) as lastIndex FROM raft_log')) {
                const max = logs.reduce((m, l) => Math.max(m, l.index), 0);
                return { lastIndex: max };
            }
            if (sql.includes('SELECT * FROM raft_log WHERE [index] = ?')) {
                return logs.find(l => l.index === (params[0] as number));
            }
            if (sql.includes('SELECT * FROM raft_snapshots ORDER BY last_index DESC LIMIT 1')) {
                const sorted = [...snapshots].sort((a,b) => b.last_index - a.last_index);
                return sorted[0];
            }
            if (sql.includes('SELECT tx_id, [index] FROM ledger_transactions WHERE namespace = ? ORDER BY [index] DESC LIMIT 1')) {
                const nsLedgers = ledgers.filter(l => l.namespace === (params[0] as string)).sort((a,b) => b.index - a.index);
                return nsLedgers[0];
            }
            if (sql.includes('SELECT tx_id FROM ledger_transactions WHERE namespace = ? AND [index] = ?')) {
                return ledgers.find(l => l.namespace === (params[0] as string) && l.index === (params[1] as number));
            }
            if (sql.includes('SELECT * FROM ledger_transactions WHERE [index] = ? AND namespace = ?')) {
                return ledgers.find(l => l.index === (params[0] as number) && l.namespace === (params[1] as string));
            }
            return undefined;
        }),
        all: jest.fn().mockImplementation(async (sql: string, params: SQLParam[] = []) => {
            if (sql.includes('SELECT * FROM raft_log WHERE [index] >= ? ORDER BY [index] ASC')) {
                return logs.filter(l => l.index >= (params[0] as number)).sort((a,b) => a.index - b.index);
            }
            if (sql.includes('SELECT id FROM raft_snapshots')) {
                return snapshots.sort((a,b) => b.last_index - a.last_index).map(s => ({id: s.id}));
            }
            if (sql.includes('SELECT * FROM ledger_transactions WHERE [index] > ? AND namespace = ? ORDER BY [index] ASC')) {
                return ledgers.filter(l => l.index > (params[0] as number) && l.namespace === (params[1] as string)).sort((a,b) => a.index - b.index);
            }
            return [];
        })
    };
};

export const createMockLogger = (): jest.Mocked<ILogger> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
    getLevel: jest.fn().mockReturnValue(1)
});
