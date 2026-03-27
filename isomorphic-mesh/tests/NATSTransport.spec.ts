import { NATSTransport } from '../src/transports/NATSTransport';
import { JSONSerializer } from '../src/serializers/JSONSerializer';
import { MeshPacket } from '../src/types/packet.types';
import { Env } from '../src/utils/Env';

// Mock nats
let closedPromise: Promise<void>;
let resolveClosed: () => void;

jest.mock('nats', () => {
    const mockSub = {
        unsubscribe: jest.fn(),
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
            next: jest.fn().mockResolvedValue({ done: true })
        })
    };
    const mockConn = {
        closed: jest.fn().mockImplementation(() => closedPromise),
        drain: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockReturnValue(mockSub),
        publish: jest.fn()
    };
    return {
        connect: jest.fn().mockResolvedValue(mockConn)
    };
});

describe('NATSTransport', () => {
    let transport: NATSTransport;
    let serializer: JSONSerializer;

    beforeEach(() => {
        jest.clearAllMocks();
        closedPromise = new Promise((resolve) => {
            resolveClosed = resolve;
        });
        serializer = new JSONSerializer();
        transport = new NATSTransport(serializer);
    });

    it('should connect to NATS', async () => {
        if (Env.isBrowser()) return;

        const connectSpy = (require('nats') as any).connect;
        await transport.connect({ url: 'nats://localhost:4222' } as any);
        
        expect(connectSpy).toHaveBeenCalledWith({ servers: 'nats://localhost:4222' });
        expect(transport.isConnected()).toBe(true);
    });

    it('should publish packets', async () => {
        if (Env.isBrowser()) return;

        await transport.connect({ url: 'nats://localhost:4222' } as any);
        const packet: MeshPacket = { 
            topic: 'test', 
            data: { foo: 'bar' }, 
            type: 'EVENT', 
            id: '1',
            senderNodeID: 'node-1',
            timestamp: Date.now()
        };
        
        const client = await (require('nats').connect as jest.Mock).mock.results[0].value;
        await transport.send('node-1', packet);
        
        expect(client.publish).toHaveBeenCalledWith('mesh.node-1', expect.any(Uint8Array));
    });

    it('should subscribe to topics', async () => {
        if (Env.isBrowser()) return;

        await transport.connect({ url: 'nats://localhost:4222' } as any);
        const client = await (require('nats').connect as jest.Mock).mock.results[0].value;
        
        const handler = jest.fn();
        (transport as any).subscriptions.set('test-topic', [handler]);
        
        await transport.subscribe('test-topic');
        expect(client.subscribe).toHaveBeenCalledWith('test-topic');
    });

    it('should disconnect from NATS', async () => {
        if (Env.isBrowser()) return;

        await transport.connect({ url: 'nats://localhost:4222' } as any);
        const client = await (require('nats').connect as jest.Mock).mock.results[0].value;
        
        await transport.disconnect();
        expect(client.drain).toHaveBeenCalled();
        expect(transport.isConnected()).toBe(false);
    });
});
