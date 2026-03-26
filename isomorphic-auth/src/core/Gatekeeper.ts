import { MeshTokenManager } from './MeshTokenManager';
import { TokenPayload } from '../types/auth.schema';
import { ILogger, IAuditLogger } from '../types/auth.types';

/**
 * Gatekeeper — enforces strict ticket validation and audience checks for incoming calls.
 */
export class Gatekeeper {
    constructor(
        private nodeID: string,
        private tokenManager: MeshTokenManager,
        private logger: ILogger,
        private audit: IAuditLogger,
        private kdcPublicKey?: string
    ) {}

    /**
     * Verify a Service Ticket (ST) for an incoming request.
     */
    async verifyServiceTicket(ticket: string): Promise<TokenPayload | null> {
        try {
            const payload = await this.tokenManager.verify(ticket, this.kdcPublicKey);
            
            if (!payload) {
                this.logger.warn('Invalid ticket signature or expired ticket.');
                await this.audit.log({
                    subject: 'unknown',
                    action: 'VERIFY_ST',
                    resource: this.nodeID,
                    result: 'DENY',
                    metadata: { reason: 'INVALID_SIGNATURE_OR_EXPIRED' }
                });
                return null;
            }

            // 1. Strict Ticket Type Check
            if (payload.type !== 'ST' && payload.type !== 'TGT') {
                this.logger.warn(`Incorrect ticket type: expected ST/TGT, got ${payload.type}`);
                await this.audit.log({
                    subject: payload.sub,
                    action: 'VERIFY_ST',
                    resource: this.nodeID,
                    result: 'DENY',
                    metadata: { reason: 'INVALID_TYPE', type: payload.type }
                });
                return null;
            }

            // 2. Strict Audience Check (for ST)
            if (payload.type === 'ST' && payload.aud !== this.nodeID) {
                this.logger.error(`Audience mismatch: expected ${this.nodeID}, got ${payload.aud}`);
                await this.audit.log({
                    subject: payload.sub,
                    action: 'VERIFY_ST',
                    resource: this.nodeID,
                    result: 'DENY',
                    metadata: { reason: 'AUDIENCE_MISMATCH', expected: this.nodeID, actual: payload.aud }
                });
                return null;
            }

            await this.audit.log({
                subject: payload.sub,
                action: 'VERIFY_ST',
                resource: this.nodeID,
                result: 'ALLOW'
            });

            return payload;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.logger.error('Error during ticket verification', { error: errorMsg });
            await this.audit.log({
                subject: 'unknown',
                action: 'VERIFY_ST',
                resource: this.nodeID,
                result: 'ERROR',
                metadata: { error: errorMsg }
            });
            return null;
        }
    }

    /**
     * Optional: Synchronous high-security PAC check-back (requires network access).
     */
    async checkPAC(subjectID: string, kdcCaller: (action: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>): Promise<boolean> {
        try {
            const res = await kdcCaller('sys.kdc.validate_pac', { subjectID });
            return res.valid === true;
        } catch (err) {
            this.logger.error('PAC check-back failed', { subjectID, error: err instanceof Error ? err.message : String(err) });
            return false;
        }
    }
}
