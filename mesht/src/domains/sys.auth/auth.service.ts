import { IContext, ILogger, IServiceBroker, IServiceSchema, IMeshApp } from '@flybyme/isomorphic-core';
import {
  IssueTicketParams,
  IssueTicketParamsSchema,
  IssueTicketResult,
  ServiceTicket,
  VerifyTicketParams,
  VerifyTicketParamsSchema,
  VerifyTicketResult,
} from './auth.schema';

import './auth.contract';

/**
 * AuthService — The Mesh Key Distribution Center (mKDC).
 *
 * Implements Layer 6 (Governance & Security) of the spec (§7).
 * Issues short-lived service tickets (ST) to agents to authorize
 * RPC calls and tool executions.
 */
export class AuthService implements IServiceSchema {
  public readonly name = 'sys.auth';
  public logger!: ILogger;
  public broker!: IServiceBroker;

  private activeTickets = new Map<string, ServiceTicket>();

  public actions = {
    issue_ticket: {
      params: IssueTicketParamsSchema,
      handler: this.issueTicket.bind(this),
    },
    verify_ticket: {
      params: VerifyTicketParamsSchema,
      handler: this.verifyTicket.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    this.logger = _logger;
  }

  async onInit(app: IMeshApp): Promise<void> {
    this.broker = app.getProvider<IServiceBroker>('broker');
    this.logger = app.getProvider<ILogger>('logger') || app.logger;
  }

  /**
   * Issues a short-lived service ticket for a persona.
   */
  async issueTicket(ctx: IContext<IssueTicketParams>): Promise<IssueTicketResult> {
    const { personaId, targetDomain, ttlMs } = IssueTicketParamsSchema.parse(ctx.params);

    const ticketId = `ST-${crypto.randomUUID()}`;
    const entry = {
      ticketId,
      personaId,
      targetDomain,
      expiresAt: Date.now() + ttlMs,
    };
    this.activeTickets.set(ticketId, entry);

    this.logger.info(`[sys.auth] mKDC: Issued ticket for ${personaId} → ${targetDomain} (Exp: ${new Date(entry.expiresAt).toISOString()})`);
    return { ticket: ticketId };
  }

  /**
   * Verifies an incoming service ticket.
   */
  async verifyTicket(ctx: IContext<VerifyTicketParams>): Promise<VerifyTicketResult> {
    const { ticket } = VerifyTicketParamsSchema.parse(ctx.params);

    const entry = this.activeTickets.get(ticket);
    if (!entry) {
      return { valid: false };
    }

    if (Date.now() > entry.expiresAt) {
      this.activeTickets.delete(ticket);
      this.logger.warn(`[sys.auth] Ticket ${ticket} expired.`);
      return { valid: false };
    }

    return { valid: true, personaId: entry.personaId };
  }
}

export default AuthService;
