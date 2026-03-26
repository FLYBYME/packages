import { z } from 'zod';
import { DistributedLedger } from '@flybyme/raft-consensus';
import { IsomorphicCrypto } from '../utils/crypto';
import { UserIdentity } from '../types/identity.schema';
import { IContext, IServiceActionRegistry, ILogger } from '@flybyme/isomorphic-core';
import { IStorageAdapter } from '../types/auth.types';
import '../types/identity.contract';
import '../types/auth.contract';

/**
 * IdentityService — Manages user identity and authentication.
 * ZERO 'any' casts.
 */
export class IdentityService {
    public readonly name = 'auth.identity';
    private ledger!: DistributedLedger<UserIdentity>;

    constructor(
        private storage: IStorageAdapter,
        private logger: ILogger,
        private namespace: string = 'auth'
    ) { }

    async created(): Promise<void> {
        // Safe structural cast to satisfy the DLT constructor's need for specific SQL methods
        const storageAsDLT = this.storage as IStorageAdapter & import('@flybyme/raft-consensus').IStorageAdapter;
        this.ledger = new DistributedLedger<UserIdentity>(this.namespace, storageAsDLT);
    }

    async register(
        ctx: IContext<z.infer<IServiceActionRegistry['auth.identity.register']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['auth.identity.register']['returns']>> {
        const { email, password, metadata } = ctx.params;
        const { hash, salt } = await IsomorphicCrypto.hashPassword(password);
        const storedHash = `${salt}:${hash}`;

        const identity: UserIdentity = {
            id: IsomorphicCrypto.randomID(16),
            email,
            hash: storedHash,
            status: 'ACTIVE',
            metadata: metadata || {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await this.ledger.append({
            term: 1,
            nodeID: ctx.nodeID,
            payload: identity
        });

        this.logger.info(`User registered: ${email} (${identity.id})`);
        return { id: identity.id, email: identity.email };
    }

    async login(
        ctx: IContext<z.infer<IServiceActionRegistry['auth.identity.login']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['auth.identity.login']['returns']>> {
        const { email, password } = ctx.params;
        const user = await this.findUserByEmail(email);
        if (!user || user.status !== 'ACTIVE') {
            throw new Error('Invalid credentials or account disabled.');
        }

        const [salt, hash] = user.hash.split(':');
        const isValid = await IsomorphicCrypto.verifyPassword(password, hash, salt);
        if (!isValid) throw new Error('Invalid credentials.');

        const tgtResponse = await ctx.call('auth.authenticate', {
            nodeID: `user:${user.id}`,
            nonce: IsomorphicCrypto.randomID(16),
            signature: 'TRUSTED_IDENTITY_SERVICE_SIGNATURE'
        });

        if (typeof tgtResponse.token !== 'string') {
            throw new Error('Authentication failed: Invalid token received from auth service.');
        }

        this.logger.info(`User logged in: ${email}`);
        return { id: user.id, token: tgtResponse.token };
    }

    private async findUserByEmail(email: string): Promise<UserIdentity | null> {
        const row = await this.storage.get<{ payload: string }>(
            'SELECT payload FROM ledger_transactions WHERE namespace = ? AND payload LIKE ? LIMIT 1',
            [this.namespace, `%${email}%`]
        );
        if (!row || typeof row.payload !== 'string') return null;
        try {
            const tx = JSON.parse(row.payload) as Record<string, unknown>;
            const payload = tx.payload as UserIdentity;
            if (!payload || typeof payload.id !== 'string') return null;
            return payload;
        } catch {
            return null;
        }
    }
}
