import { MeshStream } from './MeshStream';
import { MeshError } from '@flybyme/isomorphic-core';

/**
 * NativeStreamAdapter — Bridges Web ReadableStream or Node Stream to MeshStream.
 */
export class NativeStreamAdapter {
    /**
     * wrapReadable — Converts a browser/node readable into a MeshStream.
     */
    public static wrapReadable<T = Uint8Array>(nativeStream: unknown): MeshStream<T> {
        const meshStream = new MeshStream<T>({});

        if (nativeStream && typeof nativeStream === 'object' && 'getReader' in nativeStream && typeof (nativeStream as { getReader: unknown }).getReader === 'function') {
            // Browser ReadableStream
            const reader = (nativeStream as { getReader: () => { read: () => Promise<{ done: boolean, value: T }> } }).getReader();
            (async () => {
                try {
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        await meshStream.write(value);
                    }
                    await meshStream.end();
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    await meshStream.error(new MeshError({ message, code: 'READABLE_ERROR', status: 500 }));
                }
            })();
        } else if (nativeStream && typeof nativeStream === 'object' && 'on' in nativeStream && typeof (nativeStream as { on: unknown }).on === 'function') {
            // Node.js Stream
            const stream = nativeStream as { on: (event: string, cb: (...args: unknown[]) => void) => void, destroy: () => void };
            stream.on('data', (chunk: unknown) => {
                // Ensure we use Uint8Array if possible
                const data = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer);
                meshStream.write(data as unknown as T).catch(err => {
                    stream.destroy();
                    meshStream.error(new MeshError({ message: err.message, code: 'NODE_STREAM_ERROR', status: 500 }));
                });
            });
            stream.on('end', () => meshStream.end());
            stream.on('error', (err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                meshStream.error(new MeshError({ message, code: 'NODE_STREAM_ERROR', status: 500 }));
            });
        }

        return meshStream;
    }
}
