// FILE: src/ui/components/GlobalToastProvider.ts
import {
  BrokerComponent, ComponentChild, BrokerDOM,
  ToastContainer, Toast, ToastHeader, ToastBody,
  Section, Button, SmallText, IBaseUIProps
} from '@flybyme/isomorphic-ui';

/**
 * Approval request payload from the mesh event.
 */
interface ApprovalRequest {
  approvalId: string;
  type: 'tool' | 'directive';
  toolName?: string;
  nodeId?: string;
  arguments?: Record<string, unknown>;
  id: string; // directive ID
  personaId?: string;
  riskLevel: 'safe' | 'moderate' | 'dangerous';
  description: string;
  objective?: string;
}

interface DirectiveApprovalRequest {
  id: string;
  nodeId: string;
  objective: string;
  stateContext: Record<string, string | number | boolean | null | object>;
}

/**
 * GlobalToastProvider — HITL Approval Toast System.
 *
 * Mounted high in the AppShell DOM tree. Listens for
 * `sys.tools.approval_requested` events and renders
 * persistent toast notifications with Approve/Reject buttons.
 */
export class GlobalToastProvider extends BrokerComponent {
  private unsubscribe: (() => void) | null = null;

  constructor(props: IBaseUIProps = {}) {
    super('div', {
      id: 'hitl-toast-provider',
      className: 'position-fixed bottom-0 end-0 p-3',
      style: { zIndex: '1090' },
      ...props,
    });
  }

  override onMount(): void {
    super.onMount();
    // Subscribe to approval_requested events
    try {
      const broker = BrokerDOM.getBroker();
      this.unsubscribe = broker.on('sys.tools.approval_requested', (data: ApprovalRequest) => {
        const request = data;
        this.addApprovalToast({ ...request, type: 'tool' });
      });

      const unsubDirectives = broker.on('sys.directives.approval_requested', (data: DirectiveApprovalRequest) => {
        const payload = data;
        this.addApprovalToast({
          approvalId: `dir-${payload.id}-${payload.nodeId}`,
          type: 'directive',
          id: payload.id,
          nodeId: payload.nodeId,
          objective: payload.objective,
          description: `FSM Gate reached: ${payload.nodeId}`,
          riskLevel: 'moderate',
        });
      });

      const originalUnsubscribe = this.unsubscribe;
      this.unsubscribe = () => {
        if (originalUnsubscribe) originalUnsubscribe();
        unsubDirectives();
      };
    } catch {
      // Broker may not be ready, silent fallback
    }
  }

  override dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    super.dispose();
  }

  private addApprovalToast(request: ApprovalRequest): void {
    const state = BrokerDOM.getStateService();
    const pending = state.getValue<ApprovalRequest[]>('hitl.pending') || [];
    pending.push(request);
    state.set('hitl.pending', pending);
  }

  private async resolveApproval(req: ApprovalRequest, approved: boolean): Promise<void> {
    const broker = BrokerDOM.getBroker();
    try {
      if (req.type === 'tool') {
        await broker.call('sys.tools.resolve_approval', {
          approvalId: req.approvalId,
          id: req.id,
          toolName: req.toolName!,
          approved,
        }, { timeout: 15000 });
      } else {
        await broker.call('sys.directives.resolveApproval', {
          id: req.id,
          verdict: approved ? 'APPROVED' : 'REJECTED',
          feedback: approved ? 'Operator approved.' : 'Operator rejected.',
        }, { timeout: 15000 });
      }
    } catch (err) {
      console.error('[HITL] Failed to resolve approval:', err);
    }

    // Remove from pending list
    const state = BrokerDOM.getStateService();
    const pending = state.getValue<ApprovalRequest[]>('hitl.pending') || [];
    state.set('hitl.pending', pending.filter(p => p.approvalId !== req.approvalId));
  }

  build(): ComponentChild[] {
    const pending = BrokerDOM.getStateService().getValue<ApprovalRequest[]>('hitl.pending') || [];

    if (pending.length === 0) return [];

    return [
      new ToastContainer({
        className: 'position-fixed bottom-0 end-0 p-3',
        style: { zIndex: '1090' },
        children: pending.map(req => this.buildApprovalToast(req)),
      }),
    ];
  }

  private buildApprovalToast(req: ApprovalRequest): ComponentChild {
    const riskBadge = req.riskLevel === 'dangerous' ? 'bg-danger' : req.riskLevel === 'moderate' ? 'bg-warning' : 'bg-info';
    const argsPreview = JSON.stringify(req.arguments, null, 2).slice(0, 200);

    return new Toast({
      autohide: false,
      variant: req.riskLevel === 'dangerous' ? 'danger' : 'warning',
      className: 'show mb-2',
      style: { minWidth: '360px' },
      children: [
        new ToastHeader({
          children: [
            new Section({
              className: `badge ${riskBadge} me-2`,
              children: req.riskLevel.toUpperCase(),
            }),
            new Section({
              className: 'me-auto fw-bold',
              children: `⚠ Tool Approval Required`,
            }),
          ],
        }),
        new ToastBody({
          children: [
            new Section({
              className: 'mb-2',
              children: [
                new SmallText({ text: `Tool: `, className: 'text-muted' }),
                new Section({ tag: 'code', className: 'text-dark', children: req.toolName }),
              ],
            }),
            req.id ? new Section({
              className: 'mb-2',
              children: [
                new SmallText({ text: `Directive: `, className: 'text-muted' }),
                new Section({ tag: 'code', className: 'text-dark', children: req.id.slice(0, 8) }),
              ],
            }) : null,
            new Section({
              className: 'mb-2',
              children: [
                new SmallText({ text: 'Arguments:', className: 'd-block text-muted mb-1' }),
                new Section({
                  tag: 'pre',
                  className: 'bg-dark text-white p-2 rounded small mb-0',
                  style: { maxHeight: '120px', overflow: 'auto', fontSize: '11px' },
                  children: argsPreview,
                }),
              ],
            }),
            new Section({
              className: 'd-flex gap-2 mt-2',
              children: [
                new Button({
                  text: '✓ Approve',
                  className: 'btn btn-success btn-sm flex-grow-1',
                  onClick: () => this.resolveApproval(req, true),
                }),
                new Button({
                  text: '✕ Reject',
                  className: 'btn btn-danger btn-sm flex-grow-1',
                  onClick: () => this.resolveApproval(req, false),
                }),
              ],
            }),
          ].filter(Boolean),
        }),
      ],
    });
  }
}
