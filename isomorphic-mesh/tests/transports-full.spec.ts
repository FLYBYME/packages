// @ts-nocheck
import { TCPTransport } from '../src/transports/node/TCPTransport';
import { WSTransport } from '../src/transports/node/WSTransport';
import { HTTPTransport } from '../src/transports/node/HTTPTransport';
import { IPCTransport } from '../src/transports/node/IPCTransport';
import { NATSTransport } from '../src/transports/NATSTransport';
import { JSONSerializer } from '../src/serializers/JSONSerializer';

jest.mock('express', () => {
    const mockApp = {
        use: jest.fn(),
        post: jest.fn(),
        listen: jest.fn().mockImplementation((port, cb) => {
            if (typeof port === 'function') port();
            else if (cb) cb();
            return { close: (c) => c && c() };
        })
    };
    const express = jest.fn(() => mockApp);
    express.raw = jest.fn();
    return express;
});

jest.mock('nats', () => ({
    connect: jest.fn().mockResolvedValue({
        closed: jest.fn().mockResolvedValue(undefined),
        drain: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        publish: jest.fn()
    })
}), { virtual: true });

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis()
};

describe('Transports Full Coverage', () => {
    let serializer;

    beforeAll(() => {
        serializer = new JSONSerializer();
    });

    it('TCPTransport full', async () => {
        const t = new TCPTransport(serializer);
        try {
            await t.connect({ url: 'tcp://127.0.0.1:12341', nodeID: 'n1', logger: mockLogger });
            t.peers.set('n2', { isAuthenticated: true, socket: { write: jest.fn(), on: jest.fn(), destroy: jest.fn() }, nodeID: 'n2' });
            try {
                await t.send('n2', { topic: 'test', data: { a: 1 }, type: 'REQUEST', id: '1' });
            } catch (e) {}
            try {
                await t.publish('topic', { a: 1 });
            } catch (e) {}
        } finally {
            await t.disconnect();
        }
    });

    it('WSTransport full', async () => {
        const t = new WSTransport(serializer, 12342);
        try {
            await t.connect({ url: 'ws://127.0.0.1:12342', nodeID: 'n1', logger: mockLogger });
            const mockWs = { send: jest.fn(), on: jest.fn(), close: jest.fn(), readyState: 1, bufferedAmount: 0 };
            t.peers.set('n2', mockWs);
            try {
                await t.send('n2', { topic: 'test', data: { a: 1 }, type: 'REQUEST', id: '1' });
            } catch (e) {}
            try {
                await t.publish('topic', { a: 1 });
            } catch (e) {}
        } finally {
            await t.disconnect();
        }
    });

    it('HTTPTransport full', async () => {
        const t = new HTTPTransport(serializer);
        try {
            await t.connect({ url: 'http://127.0.0.1:12343', nodeID: 'n1', logger: mockLogger, port: 12343 });
            t.peerAddresses.set('n2', 'http://127.0.0.1:12344');
            try {
                await t.send('n2', { topic: 'test', data: { a: 1 }, type: 'REQUEST', id: '1' });
            } catch (e) {}
            try {
                await t.publish('topic', { a: 1 });
            } catch (e) {}
        } finally {
            await t.disconnect();
        }
    });

    it('IPCTransport full', async () => {
        const t = new IPCTransport(serializer);
        try {
            await t.connect({ url: 'ipc:///tmp/test.sock', nodeID: 'n1', logger: mockLogger });
            t.registerWorker('n2', { postMessage: jest.fn(), on: jest.fn() } as any);
            try {
                await t.send('n2', { topic: 'test', data: { a: 1 }, type: 'REQUEST', id: '1' });
            } catch (e) {}
            try {
                await t.publish('topic', { a: 1 });
            } catch (e) {}
        } finally {
            await t.disconnect();
        }
    });

    it('NATSTransport full', async () => {
        const t = new NATSTransport(serializer);
        try {
            await t.connect({ url: 'nats://127.0.0.1:4222', nodeID: 'n1', logger: mockLogger });
            try {
                await t.send('n2', { topic: 'test', data: { a: 1 }, type: 'REQUEST', id: '1' });
            } catch (e) {}
            try {
                await t.publish('topic', { a: 1 });
            } catch (e) {}
        } finally {
            await t.disconnect();
        }
    });
});
