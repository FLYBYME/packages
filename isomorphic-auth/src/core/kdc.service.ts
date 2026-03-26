import { z } from 'zod';
import { mKDC } from './mKDC';
import { MeshTokenManager } from './MeshTokenManager';
import { ILogger, IContext, IServiceActionRegistry } from '@flybyme/isomorphic-core';
import { IStorageAdapter } from '../types/auth.types';
import '../types/kdc.contract';
import '../types/auth.contract';

/**
 * KDCService — Key Distribution Center Service.
 */
export class KDCService {
    public readonly name = 'sys.kdc';
    private mkdc!: mKDC;

    constructor(
        private storage: IStorageAdapter,
        private logger: ILogger,
        private issuer: string = 'sys.kdc'
    ) {}

    async created(): Promise<void> {
        const tokenManager = new MeshTokenManager(this.issuer);
        this.mkdc = new mKDC(this.issuer, tokenManager, this.storage, this.logger);
    }

    async authenticate(
        ctx: IContext<z.infer<IServiceActionRegistry['sys.kdc.authenticate']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['sys.kdc.authenticate']['returns']>> {
        const result = await this.mkdc.authenticate(ctx.params);
        return { token: result.token };
    }

    async getServiceTicket(
        ctx: IContext<z.infer<IServiceActionRegistry['sys.kdc.getServiceTicket']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['sys.kdc.getServiceTicket']['returns']>> {
        const result = await this.mkdc.issueServiceTicket(ctx.params);
        return { token: result.token };
    }

    async validate_pac(
        ctx: IContext<z.infer<IServiceActionRegistry['sys.kdc.validate_pac']['params']>>
    ): Promise<z.infer<IServiceActionRegistry['sys.kdc.validate_pac']['returns']>> {
        const { subjectID } = ctx.params;
        const record = await this.storage.getNode(subjectID);
        
        if (!record || record.status === 'revoked') {
            return { status: 'REVOKED', valid: false };
        }

        return { 
            status: record.status.toUpperCase() as z.infer<IServiceActionRegistry['sys.kdc.validate_pac']['returns']>['status'], // Simplified cast since Zod inference on interface members is tricky in this context
            valid: record.status === 'active' 
        };
    }
}
