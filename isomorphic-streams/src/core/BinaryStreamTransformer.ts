import { MeshStream } from './MeshStream';
import { MeshError } from '@flybyme/isomorphic-core';

/**
 * BinaryStreamTransformer — Handles data normalization for binary streams.
 * Fix: Per Strict Type Safety Policy, treats everything as Uint8Array (Isomorphic).
 */
export class BinaryStreamTransformer {
    /**
     * toUint8Array — Normalizes input into a Uint8Array.
     * Avoids redundant Buffer casting by relying on Uint8Array as the base type.
     */
    public static toUint8Array(data: unknown): Uint8Array {
        if (data instanceof Uint8Array) {
            return data;
        }
        if (typeof data === 'string') {
            return new TextEncoder().encode(data);
        }
        if (ArrayBuffer.isView(data)) {
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        }
        if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        }
        // Fallback for Node.js Buffers (they are Uint8Arrays)
        if (data && typeof data === 'object' && 'buffer' in data) {
             return new Uint8Array(data as unknown as ArrayBuffer);
        }
        return new Uint8Array();
    }

    /**
     * pipeBinary — Pipes a stream while ensuring all chunks are Uint8Array.
     */
    public static pipeBinary(input: MeshStream<unknown>, output: MeshStream<Uint8Array>): void {
        input.on('data', (chunk: unknown) => {
            output.write(this.toUint8Array(chunk));
        });
        input.on('end', () => output.end());
        input.on('error', (err: MeshError) => output.error(err));
    }
}
