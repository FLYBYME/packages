import { StreamPlugin } from '../src/modules/StreamPlugin';
import { IServiceBroker, IMeshPacket, IMeshApp } from '@flybyme/isomorphic-core';
import { MeshStream } from '../src/core/MeshStream';

interface MockApp {
    nodeID: string;
    logger: any;
    registerProvider: jest.Mock;
    getProvider: jest.Mock;
}

interface MockBroker {
    app: MockApp;
    on: jest.Mock;
    off: jest.Mock;
    emit: jest.Mock;
}

describe('StreamPlugin Extensive', () => {
    let plugin: StreamPlugin;
    let mockBroker: MockBroker;
    let mockApp: MockApp;

    beforeEach(() => {
        mockApp = {
            nodeID: 'local-node',
            getProvider: jest.fn(),
            logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
            registerProvider: jest.fn()
        };
        mockBroker = {
            app: mockApp,
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn()
        };
        plugin = new StreamPlugin();
        plugin.onRegister(mockBroker as unknown as IServiceBroker);
    });

    it('should validate senderNodeID in handleData', async () => {
        const stream = plugin.createStream({ targetNodeID: 'authorized-node' });
        const streamId = stream.id;

        const packet = {
            id: 'p1',
            type: 'STREAM_DATA',
            topic: '$stream.data',
            senderNodeID: 'hacker-node', // Not authorized
            streamID: streamId,
            data: 'bad-data',
            timestamp: Date.now()
        };

        const onData = jest.fn();
        stream.on('data', (d) => onData(d));

        // Manually trigger the handler retrieved from broker.on
        const dataHandler = mockBroker.on.mock.calls.find((call: unknown[]) => call[0] === '$stream.data')[1];
        await dataHandler(packet);

        expect(onData).not.toHaveBeenCalled();
    });

    it('should allow data from authorized node', async () => {
        const stream = plugin.createStream({ targetNodeID: 'authorized-node' });
        const streamId = stream.id;

        const packet = {
            id: 'p2',
            type: 'STREAM_DATA',
            topic: '$stream.data',
            senderNodeID: 'authorized-node',
            streamID: streamId,
            data: 'good-data',
            timestamp: Date.now()
        };

        const onData = jest.fn();
        stream.on('data', (d) => onData(d));

        const dataHandler = mockBroker.on.mock.calls.find((call: unknown[]) => call[0] === '$stream.data')[1];
        await dataHandler(packet);

        expect(onData).toHaveBeenCalledWith('good-data');
    });


    it('should cleanup idle streams', async () => {
        const stream = plugin.createStream({ targetNodeID: 'peer' });
        const streamId = stream.id;

        // Verify it exists (access private map via any for testing)
        expect((plugin as any).streams.get(streamId)).toBeDefined();

        // Manually set lastActivity to long ago
        (plugin as any).streams.get(streamId).lastActivity = Date.now() - (10 * 60 * 1000);
        
        // Trigger private cleanup method
        (plugin as any).cleanupIdleStreams();

        expect((plugin as any).streams.get(streamId)).toBeUndefined();
        expect(stream.status).toBe('ERROR');
    });



    it('should reset idle timer on activity', async () => {
        jest.useFakeTimers();
        const stream = plugin.createStream({ targetNodeID: 'peer' });
        const streamId = stream.id;

        jest.advanceTimersByTime(4 * 60 * 1000);

        const ackHandler = mockBroker.on.mock.calls.find((call: any) => call[0] === '$stream.ack')[1];
        await ackHandler({ streamID: streamId, senderNodeID: 'peer' }, { streamID: streamId, senderNodeID: 'peer' } as any);

        jest.advanceTimersByTime(2 * 60 * 1000);

        expect((plugin as any).streams.get(streamId)).toBeDefined();
        
        jest.useRealTimers();
    });
});
