import { IFileSystemProvider } from '../types/fs.interfaces';
import { VirtualNode } from '../fs.schema';
import { IServiceBroker, IMeshStream, MeshError, IMeshPacket } from '@flybyme/isomorphic-core';
import { MeshStream } from '@flybyme/isomorphic-streams';

/**
 * RemoteFSProvider — Proxies filesystem calls to another node via Mesh RPC.
 */
export class RemoteFSProvider implements IFileSystemProvider {
    public readonly name: string;

    constructor(
        private broker: IServiceBroker,
        private targetNodeID: string,
        private remoteRoot: string = '/'
    ) {
        this.name = `remote-fs:${targetNodeID}`;
    }

    private getRemotePath(p: string): string {
        return p; 
    }

    async readFile(p: string): Promise<Uint8Array> {
        const result = (await this.broker.call('fs.readFile', { path: this.getRemotePath(p) })) as { data: string | Uint8Array };
        const data = result.data;
        if (typeof data === 'string') {
            return Buffer.from(data, 'base64');
        }
        return new Uint8Array(data);
    }

    readStream(p: string): IMeshStream<Uint8Array> {
        const stream = new MeshStream<Uint8Array>({});
        
        this.broker.call('fs.openStream', { path: this.getRemotePath(p) }).then((res) => {
            const remoteStreamID = (res as { streamID: string }).streamID;
            
            const handler = (data: Uint8Array, packet?: IMeshPacket<Uint8Array>) => {
                if (packet && packet.streamID === remoteStreamID) {
                    stream.write(data).catch((err: Error) => {
                        stream.error(new MeshError({ message: err.message, code: 'STREAM_WRITE_ERROR', status: 500 }));
                    });
                }
            };
            
            this.broker.on(`$stream.data`, handler);
            this.broker.on(`$stream.close`, (packet: { streamID: string }) => {
                if (packet.streamID === remoteStreamID) {
                    stream.end();
                    this.broker.off(`$stream.data`, handler);
                }
            });
            this.broker.on(`$stream.error`, (packet: { streamID: string, error: { message: string, code: string } }) => {
                if (packet.streamID === remoteStreamID) {
                    stream.error(new MeshError({ message: packet.error.message, code: packet.error.code, status: 500 }));
                    this.broker.off(`$stream.data`, handler);
                }
            });
        }).catch((err: Error) => {
            stream.error(new MeshError({ message: err.message, code: 'REMOTE_STREAM_OPEN_FAILED', status: 500 }));
        });

        return stream;
    }

    async writeFile(p: string, data: Uint8Array): Promise<void> {
        const lockAcquired = (await this.broker.call('fs.lock', { path: this.getRemotePath(p) })) as { success: boolean };
        if (!lockAcquired.success) {
            throw new MeshError({ message: `Failed to acquire lock for ${p}`, code: 'LOCKED', status: 423 });
        }

        try {
            await this.broker.call('fs.writeFile', { 
                path: this.getRemotePath(p),
                data: Buffer.from(data).toString('base64')
            });
        } finally {
            await this.broker.call('fs.unlock', { path: this.getRemotePath(p) });
        }
    }

    async mkdir(p: string, options?: { recursive: boolean }): Promise<void> {
        await this.broker.call('fs.mkdir', { path: this.getRemotePath(p), recursive: options?.recursive });
    }

    async readdir(p: string): Promise<VirtualNode[]> {
        const result = await this.broker.call('fs.readdir', { path: this.getRemotePath(p) });
        return result as VirtualNode[];
    }

    async stat(p: string): Promise<VirtualNode> {
        const result = await this.broker.call('fs.stat', { path: this.getRemotePath(p) });
        return result as VirtualNode;
    }

    async unlink(p: string): Promise<void> {
        await this.broker.call('fs.unlink', { path: this.getRemotePath(p) });
    }

    async rmdir(p: string, options?: { recursive: boolean }): Promise<void> {
        await this.broker.call('fs.rmdir', { path: this.getRemotePath(p), recursive: options?.recursive });
    }

    async exists(p: string): Promise<boolean> {
        try {
            await this.stat(p);
            return true;
        } catch {
            return false;
        }
    }
}
