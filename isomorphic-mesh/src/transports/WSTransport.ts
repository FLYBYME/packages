/**
 * WSTransport — Isomorphic WebSocket Transport
 * Automatically resolves to Node.js or Browser implementation based on environment.
 */
import { BaseSerializer } from '../serializers/BaseSerializer';
import { BaseTransport } from './BaseTransport';

export let WSTransport: any;

if (typeof window !== 'undefined' || typeof self !== 'undefined') {
    // Browser Environment
    const { BrowserWebSocketTransport } = require('./browser/BrowserWebSocketTransport');
    WSTransport = BrowserWebSocketTransport;
} else {
    // Node.js Environment
    const { WSTransport: NodeTransport } = require('./node/WSTransport');
    WSTransport = NodeTransport;
}

export interface WSTransport extends BaseTransport {
    readonly protocol: 'ws';
    readonly version: number;
}
