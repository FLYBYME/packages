import { IsomorphicCrypto } from '../utils/crypto';
import { TokenPayload } from '../types/auth.schema';

export interface TokenKeys {
    privateKey?: string;
    publicKey?: string;
}

export interface IKeyProvider {
    sign(payload: string): Promise<string>;
    getPublicKey(): Promise<string>;
}

/**
 * MeshTokenManager — handles creation and verification of signed mesh tokens.
 */
export class MeshTokenManager {
    private keyProvider?: IKeyProvider;
    private privateKey?: string;
    private publicKey?: string;
    private defaultTTL: number;
    private issuer: string;

    constructor(issuer: string, keys?: TokenKeys | IKeyProvider, defaultTTL = 3600) {
        if (keys && 'sign' in keys) {
            this.keyProvider = keys;
        } else {
            this.privateKey = (keys as TokenKeys)?.privateKey;
            this.publicKey = (keys as TokenKeys)?.publicKey;
        }
        this.defaultTTL = defaultTTL;
        this.issuer = issuer;
    }

    /** Create a signed token */
    async sign(payload: Omit<TokenPayload, 'iss' | 'iat' | 'exp' | 'jti'>, ttl?: number): Promise<string> {
        const fullPayload: TokenPayload = {
            ...payload,
            iss: this.issuer,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (ttl ?? this.defaultTTL),
            jti: IsomorphicCrypto.randomID(16)
        } as TokenPayload;

        const json = JSON.stringify(fullPayload);
        let signature: string;

        if (this.keyProvider) {
            signature = await this.keyProvider.sign(json);
        } else {
            if (!this.privateKey) throw new Error('No private key available for signing');
            signature = await IsomorphicCrypto.signEd25519(json, this.privateKey);
        }

        const envelope = JSON.stringify({
            p: fullPayload,
            s: signature
        });

        const bytes = new TextEncoder().encode(envelope);
        return IsomorphicCrypto.toBase64(bytes);
    }

    /** Verify a signed token */
    async verify(ticket: string, overridePublicKey?: string): Promise<TokenPayload | null> {
        try {
            let pubKey = overridePublicKey;
            if (!pubKey) {
                pubKey = this.keyProvider ? await this.keyProvider.getPublicKey() : this.publicKey;
            }
            if (!pubKey) throw new Error('No public key available for verification');

            const bytes = IsomorphicCrypto.fromBase64(ticket);
            const envelopeStr = new TextDecoder().decode(bytes);
            const envelope = JSON.parse(envelopeStr) as { p: TokenPayload, s: string };
            const { p, s } = envelope;

            const json = JSON.stringify(p);
            const isValid = await IsomorphicCrypto.verifyEd25519(s, json, pubKey);
            if (!isValid) return null;

            if (p.exp && p.exp < Math.floor(Date.now() / 1000)) return null;

            return p;
        } catch {
            return null;
        }
    }

    /** Decode a token without verification */
    decode(ticket: string): TokenPayload | null {
        try {
            const bytes = IsomorphicCrypto.fromBase64(ticket);
            const envelopeStr = new TextDecoder().decode(bytes);
            const envelope = JSON.parse(envelopeStr);
            return envelope.p as TokenPayload;
        } catch {
            return null;
        }
    }
}
