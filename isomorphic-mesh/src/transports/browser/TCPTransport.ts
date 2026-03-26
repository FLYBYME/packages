import { BaseTransport } from '../BaseTransport';
import { TransportConnectOptions } from '../../types/mesh.types';
import { MeshPacket } from '../../types/packet.types';

export class TCPTransport extends BaseTransport {
    public readonly protocol = 'tcp';
    public readonly version = 1;
    async connect(opts: TransportConnectOptions): Promise<void> { throw new Error('[TCPTransport] Not available in browser.'); }
    async disconnect(): Promise<void> {}
    async send(targetNodeID: string, packet: MeshPacket): Promise<void> { throw new Error('[TCPTransport] Not available in browser.'); }
    async publish(topic: string, packet: MeshPacket): Promise<void> {}
}
