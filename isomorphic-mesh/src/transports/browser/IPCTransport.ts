import { BaseTransport } from '../BaseTransport';
import { TransportConnectOptions } from '../../types/mesh.types';
import { MeshPacket } from '../../types/packet.types';

export class IPCTransport extends BaseTransport {
    public readonly protocol = 'ipc';
    public readonly version = 1;
    async connect(opts: TransportConnectOptions): Promise<void> { throw new Error('[IPCTransport] Not available in browser.'); }
    async disconnect(): Promise<void> {}
    async send(targetNodeID: string, packet: MeshPacket): Promise<void> { throw new Error('[IPCTransport] Not available in browser.'); }
    async publish(topic: string, packet: MeshPacket): Promise<void> {}
}
