import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardBody, Heading, SmallText,
  Box, Badge, DataTable, Button, Modal, ModalHeader, ModalTitle, ModalBody
} from '@flybyme/isomorphic-ui';
import { AuditLog } from '../../domains/sys.audit/audit.schema';

export class TelemetryPage extends BrokerPage {
  private inspectModal?: Modal;

  public getSEO() { return { defaultTitle: 'Swarm Telemetry' }; }
  public getPageConfig() { return { title: 'Telemetry & Cognition' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4' });
    this.initInspectModal();
  }

  public async onEnter(): Promise<void> {
    await this.refresh();
  }

  private async refresh() {
    const broker = BrokerDOM.getBroker();
    try {
      const logs = await broker.call<AuditLog[]>('sys.audit.query', {
        changeType: 'COGNITION_TRACE',
        limit: 100
      });
      BrokerDOM.getStateService().set('telemetry.logs', logs);
    } catch (err) {
      this.logger.error('Failed to load telemetry', err);
    }
  }

  private initInspectModal() {
    this.inspectModal = new Modal({
      id: 'telemetryInspectModal',
      size: 'xl',
      children: [
        new ModalHeader({
          onClose: () => this.inspectModal?.hide(),
          children: new ModalTitle({ text: 'Raw Cognition Trace' })
        }),
        new ModalBody({
          children: [
            new Box({
              tag: 'pre',
              className: 'bg-dark text-light p-3 rounded small overflow-auto',
              style: { maxHeight: '70vh', whiteSpace: 'pre-wrap' },
              children: '$state.ui.telemetryInspect.payload'
            })
          ]
        })
      ]
    });
  }

  public build(): ComponentChild[] {
    const logs = BrokerDOM.getStateService().getValue<AuditLog[]>('telemetry.logs') || [];

    return [
      new Box({
        className: 'd-flex justify-content-between align-items-center mb-4',
        children: [
          new Heading(4, { text: 'Swarm Telemetry & Cognition Logs' }),
          new Button({
            variant: 'outline-primary',
            text: 'Refresh',
            onClick: () => this.refresh()
          })
        ]
      }),
      new Card({
        children: [
          new CardBody({
            children: new DataTable({
              columns: [
                {
                  key: 'timestamp',
                  label: 'Time',
                  render: (row: AuditLog) => new SmallText({ text: new Date(row.timestamp).toLocaleTimeString(), className: 'text-muted' })
                },
                {
                  key: 'traceId',
                  label: 'Execution Span',
                  render: (row: AuditLog) => new Box({ tag: 'code', children: row.traceId?.slice(0, 8) || 'N/A' })
                },
                {
                  key: 'context',
                  label: 'Context',
                  render: (row: AuditLog) => new Box({
                    children: [
                      new SmallText({ text: `Dir: ${row.directiveId?.slice(0, 8) || 'N/A'}`, className: 'd-block fw-bold' }),
                      new SmallText({ text: `Node: ${row.payload?.nodeId || 'N/A'}`, className: 'text-muted' })
                    ]
                  })
                },
                {
                  key: 'tokens',
                  label: 'Tokens',
                  render: (row: AuditLog) => new Badge({
                    text: `P: ${row.promptTokens || 0} / C: ${row.completionTokens || 0}`,
                    variant: 'secondary'
                  })
                },
                {
                  key: 'preview',
                  label: 'Preview',
                  render: (row: AuditLog) => new SmallText({
                    text: (row.payload?.response || '').slice(0, 50) + '...',
                    className: 'text-muted d-inline-block text-truncate',
                    style: { maxWidth: '250px' }
                  })
                },
                {
                  key: 'actions',
                  label: 'Action',
                  render: (row: AuditLog) => new Button({
                    size: 'sm',
                    variant: 'outline-primary',
                    text: 'Inspect',
                    onClick: () => {
                      BrokerDOM.getStateService().set('ui.telemetryInspect.payload', JSON.stringify(row.payload, null, 2));
                      this.inspectModal?.show();
                    }
                  })
                }
              ],
              data: logs.sort((a, b) => b.timestamp - a.timestamp)
            })
          })
        ]
      }),
      this.inspectModal!
    ];
  }
}
