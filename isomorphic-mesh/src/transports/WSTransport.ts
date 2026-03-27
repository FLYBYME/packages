/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

import { BaseTransport } from './BaseTransport';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
