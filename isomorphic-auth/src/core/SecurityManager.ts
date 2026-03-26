import { SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';

/**
 * SecurityManager — provides AES-256-GCM authenticated encryption.
 * Browser-safe and isomorphic via WebCrypto.
 */
export class SecurityManager {
    private key: CryptoKey | null = null;
    private static readonly IV_LENGTH = 12;
    private static readonly AUTH_TAG_BIT_LENGTH = 128;

    /** 
     * Replay Protection: Cache of recently seen nonces (IVs).
     * Nonces must be unique per key within the timestamp window.
     */
    private nonceCache = new Map<string, number>();
    private static readonly REPLAY_WINDOW_MS = 30000;
    private static readonly MAX_CACHE_SIZE = 10000; // Hard cap against memory exhaustion

    private cleanupInterval?: TimerHandle;
    public clockOffsetMs: number = 0; // Allows drift compensation tracking

    constructor(private secret?: string) { 
        this.startJanitor();
    }

    private startJanitor() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupNonceCache();
        }, 5000); // 5 seconds

        SafeTimer.unref(this.cleanupInterval);
    }

    public stop(): void {
        if (this.cleanupInterval) {
            SafeTimer.clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.nonceCache.clear();
    }

    /**
     * Initialize the key from the secret.
     */
    async init(): Promise<void> {
        if (!this.secret) return;

        const raw = new TextEncoder().encode(this.secret);
        const hash = await globalThis.crypto.subtle.digest('SHA-256', raw);

        this.key = await globalThis.crypto.subtle.importKey(
            'raw',
            hash,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encrypt(data: string): Promise<string>;
    async encrypt(data: Uint8Array): Promise<Uint8Array>;
    async encrypt(data: string | Uint8Array): Promise<string | Uint8Array> {
        if (!this.key) await this.init();
        if (!this.key) return data;

        const isString = typeof data === 'string';
        const raw = isString ? new TextEncoder().encode(data) : data;

        // Prepend 8-byte timestamp for replay protection
        const payload = new Uint8Array(8 + raw.length);
        const view = new DataView(payload.buffer);
        view.setBigUint64(0, BigInt(Date.now()));
        payload.set(raw, 8);

        const iv = globalThis.crypto.getRandomValues(new Uint8Array(SecurityManager.IV_LENGTH));

        const ciphertext = await globalThis.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: SecurityManager.AUTH_TAG_BIT_LENGTH
            },
            this.key,
            payload
        );

        // Concatenate IV + Ciphertext for transmission
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return isString ? Buffer.from(combined).toString('base64') : combined;
    }

    async decrypt(data: string): Promise<string>;
    async decrypt(data: Uint8Array): Promise<Uint8Array>;
    async decrypt(data: string | Uint8Array): Promise<string | Uint8Array> {
        if (!this.key) await this.init();
        if (!this.key) return data;

        const isString = typeof data === 'string';
        const combined = isString ? Buffer.from(data, 'base64') : data;

        if (combined.length < SecurityManager.IV_LENGTH) {
            throw new Error('Invalid encrypted data: too short');
        }

        const iv = combined.slice(0, SecurityManager.IV_LENGTH);
        const ciphertext = combined.slice(SecurityManager.IV_LENGTH);

        // Replay Protection: Nonce check
        const ivHex = Buffer.from(iv).toString('hex');
        if (this.nonceCache.has(ivHex)) {
            throw new Error('Potential Replay Attack: Nonce already used (Replay detected)');
        }
        
        const decryptedPayload = await globalThis.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: SecurityManager.AUTH_TAG_BIT_LENGTH
            },
            this.key,
            ciphertext
        );

        // Extract and check timestamp
        const view = new DataView(decryptedPayload);
        const timestamp = Number(view.getBigUint64(0));
        const now = Date.now();

        if (Math.abs(now - timestamp) > SecurityManager.REPLAY_WINDOW_MS) {
            throw new Error('Possible replay attack: timestamp out of window');
        }

        // Add to cache and prune if needed
        if (this.nonceCache.size >= SecurityManager.MAX_CACHE_SIZE) {
            this.cleanupNonceCache();
        }
        this.nonceCache.set(ivHex, now);

        const originalData = new Uint8Array(decryptedPayload, 8);
        return isString ? new TextDecoder().decode(originalData) : originalData;
    }

    private cleanupNonceCache(): void {
        const now = Date.now();
        for (const [nonce, time] of this.nonceCache.entries()) {
            if (now - time > SecurityManager.REPLAY_WINDOW_MS) {
                this.nonceCache.delete(nonce);
            }
        }
    }
}
