import { IInterceptor } from '@flybyme/isomorphic-core';
import { MeshPacket } from '../types/packet.types';
import { Env } from '../utils/Env';

/**
 * CompressionInterceptor — Environment-aware compression.
 * Automatically skips compression in the browser to avoid Node.js dependencies.
 */
export class CompressionInterceptor implements IInterceptor<MeshPacket, MeshPacket> {
    public readonly name = 'compression';

    async onOutbound(packet: MeshPacket): Promise<MeshPacket> {
        if (Env.isBrowser() || !packet.data) return packet;

        try {
            // Use direct require so bundlers can intercept/shim it if needed, 
            // but we still guard with Env.isBrowser() for safety.
            const zlib = require('node:zlib');
            const compressed = zlib.gzipSync(JSON.stringify(packet.data));
            return {
                ...packet,
                data: compressed,
                meta: { ...packet.meta, compressed: true }
            };
        } catch (e) {
            return packet;
        }
    }

    async onInbound(packet: MeshPacket): Promise<MeshPacket> {
        if (Env.isBrowser() || !packet.meta?.compressed || !packet.data) return packet;

        try {
            const zlib = require('node:zlib');
            const decompressed = zlib.gunzipSync(packet.data as Buffer);
            return {
                ...packet,
                data: JSON.parse(decompressed.toString()),
                meta: { ...packet.meta, compressed: false }
            };
        } catch (e) {
            return packet;
        }
    }
}
