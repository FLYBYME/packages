import { z } from 'zod';
import { IContext, ILogger, MeshError } from '@flybyme/isomorphic-core';
import { DatabaseMixin, defineTable, QueryBuilder } from '@flybyme/isomorphic-database';
import { LoginParams, GetTicketParams } from './auth.schema';
import { MeshTokenManager } from './core/MeshTokenManager';
import { IsomorphicCrypto } from './utils/crypto';

/**
 * Auth Node Schema for database
 */
const NodeSchema = z.object({
    id: z.string(),
    publicKey: z.string(),
    capabilities: z.array(z.string()).default([]),
    status: z.enum(['active', 'revoked']).default('active')
});

const NodeTable = defineTable('auth_nodes', NodeSchema);

interface IAuthService {
    db: QueryBuilder<typeof NodeSchema>;
}

/**
 * AuthService — Re-implemented as a Triad-compliant Service.
 */
export class AuthService extends DatabaseMixin(NodeTable)(class {}) {
    public readonly name = 'auth';
    private tokenManager!: MeshTokenManager;

    public actions = {
        authenticate: { handler: this.authenticate.bind(this) },
        getServiceTicket: { handler: this.getServiceTicket.bind(this) }
    };

    constructor(private logger: ILogger, private issuer: string = '@flybyme/isomorphic-auth') {
        super();
        this.tokenManager = new MeshTokenManager(this.issuer);
    }

    /**
     * Authenticate a node via signature check.
     */
    async authenticate(ctx: IContext<z.infer<typeof LoginParams>>): Promise<{ token: string }> {
        const { nodeID, signature, nonce } = ctx.params;
        
        const nodes = await (this as unknown as IAuthService).db.where('id', '=', nodeID).execute();
        const node = nodes[0];

        if (!node || node.status === 'revoked') {
            throw new MeshError({ code: 'UNAUTHORIZED', message: `Node ${nodeID} not registered or revoked`, status: 401 });
        }

        const isValid = await IsomorphicCrypto.verifyEd25519(signature, nonce, node.publicKey);
        if (!isValid) {
            throw new MeshError({ code: 'UNAUTHORIZED', message: 'Invalid signature', status: 401 });
        }

        const token = await this.tokenManager.sign({
            type: 'TGT',
            sub: nodeID,
            capabilities: node.capabilities
        });

        return { token };
    }

    /**
     * Issue a Service Ticket (ST) using a valid TGT.
     */
    async getServiceTicket(ctx: IContext<z.infer<typeof GetTicketParams>>): Promise<{ token: string }> {
        const { tgt, targetNodeID } = ctx.params;
        
        const decoded = await this.tokenManager.verify(tgt);
        if (!decoded || decoded.type !== 'TGT') {
            throw new MeshError({ code: 'UNAUTHORIZED', message: 'Invalid or expired TGT', status: 401 });
        }

        const targetNodes = await (this as unknown as IAuthService).db.where('id', '=', targetNodeID).execute();
        if (!targetNodes[0] || targetNodes[0].status === 'revoked') {
            throw new MeshError({ code: 'NOT_FOUND', message: `Target node ${targetNodeID} not found or inactive`, status: 404 });
        }

        const token = await this.tokenManager.sign({
            type: 'ST',
            sub: decoded.sub,
            aud: targetNodeID
        }, 900); // 15 min ST

        return { token };
    }
}
