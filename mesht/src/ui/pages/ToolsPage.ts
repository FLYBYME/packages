import {
  BrokerPage, ComponentChild, BrokerDOM,
  Row, Col, Card, CardHeader, CardBody,
  Heading, Badge, Table, TableHead, TableBody, TableRow, TableCell,
  SmallText, Section, Button, IBaseUIProps
} from '@flybyme/isomorphic-ui';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: 'safe' | 'moderate' | 'dangerous';
  requiresApproval: boolean;
  status: 'active' | 'disabled';
}

interface PendingApproval {
  approvalId: string;
  toolName: string;
  id?: string;
}

export class ToolsPage extends BrokerPage {
  constructor(props: IBaseUIProps = {}) {
    super('div', { className: 'container-fluid py-4', ...props });
  }

  public getSEO() { return { defaultTitle: 'Capabilities' }; }
  public getPageConfig() { return { title: 'Tools & Capabilities' }; }

  public async onEnter(): Promise<void> {
    await this.refresh();
  }

  private async refresh() {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    try {
      // Fetch all tools from sys.tools.find (proxied via find)
      const tools = await broker.call<Tool[]>('sys.tools.find', {});
      state.set('tools.registry', tools);

      // Fetch pending approvals
      const pending = await broker.call<PendingApproval[]>('sys.tools.list_pending_approvals', {});
      state.set('hitl.pending', pending);
    } catch {
      state.set('tools.registry', []);
    }
  }

  private async toggleTool(name: string, status: string) {
    try {
      if (status === 'active') {
        await BrokerDOM.getBroker().call('sys.tools.disable', { name });
      }
      await this.refresh();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const tools = state.getValue<Tool[]>('tools.registry') || [];
    const pending = state.getValue<PendingApproval[]>('hitl.pending') || [];

    return [
      new Heading(2, { text: 'Grid Capabilities', className: 'mb-4' }),
      
      new Row({
        children: [
          // Tool Registry Table
          new Col({
            span: 12,
            children: new Card({
              className: 'shadow-sm border-0 mb-4',
              children: [
                new CardHeader({ 
                  className: 'bg-white border-bottom py-3',
                  children: new Heading(5, { text: 'Capability Registry', className: 'mb-0 fw-bold' }) 
                }),
                new CardBody({
                  className: 'p-0',
                  children: new Table({
                    className: 'table table-hover mb-0 align-middle',
                    children: [
                      new TableHead({
                        className: 'table-light',
                        children: new TableRow({
                          children: [
                            new TableCell({ tag: 'th', text: 'Name' }),
                            new TableCell({ tag: 'th', text: 'Category' }),
                            new TableCell({ tag: 'th', text: 'Risk' }),
                            new TableCell({ tag: 'th', text: 'HITL' }),
                            new TableCell({ tag: 'th', text: 'Status' }),
                            new TableCell({ tag: 'th', className: 'text-end', text: 'Actions' })
                          ]
                        })
                      }),
                      new TableBody({
                        children: tools.map(t => new TableRow({
                          children: [
                            new TableCell({ children: [
                              new Section({ text: t.name, className: 'fw-bold' }),
                              new SmallText({ text: t.description, className: 'text-muted d-block x-small' })
                            ]}),
                            new TableCell({ children: new Badge({ variant: 'light', text: t.category, className: 'text-dark border' }) }),
                            new TableCell({ children: new Badge({ 
                              variant: t.riskLevel === 'dangerous' ? 'danger' : t.riskLevel === 'moderate' ? 'warning' : 'success',
                              text: t.riskLevel.toUpperCase() 
                            }) }),
                            new TableCell({ children: t.requiresApproval ? 
                              new SmallText({ text: '✓ Required', className: 'text-warning fw-bold' }) : 
                              new SmallText({ text: 'Auto', className: 'text-muted' }) 
                            }),
                            new TableCell({ children: new Badge({ 
                              variant: t.status === 'active' ? 'success' : 'secondary',
                              text: t.status 
                            }) }),
                            new TableCell({ className: 'text-end', children: [
                                new Button({
                                  variant: t.status === 'active' ? 'outline-danger' : 'outline-success',
                                  text: t.status === 'active' ? 'Disable' : 'Enable',
                                  className: 'btn-sm',
                                  onClick: () => this.toggleTool(t.name, t.status)
                                })
                            ]})
                          ]
                        }))
                      })
                    ]
                  })
                })
              ]
            })
          }),
          
          // Pending Approvals Summary
          new Col({
            span: 12,
            children: new Card({
              className: 'shadow-sm border-0 bg-dark text-white',
              children: [
                new CardHeader({ 
                  className: 'bg-transparent border-secondary py-3',
                  children: new Heading(5, { text: 'Pending Approvals', className: 'mb-0 fw-bold text-warning' }) 
                }),
                new CardBody({
                  children: pending.length > 0 ? 
                    pending.map(p => new Section({
                      className: 'p-2 mb-2 border border-secondary rounded d-flex justify-content-between align-items-center',
                      children: [
                        new Section({ children: [
                          new SmallText({ text: p.toolName, className: 'fw-bold d-block' }),
                          new SmallText({ text: `ID: ${p.approvalId.slice(0, 8)}`, className: 'text-muted x-small' })
                        ]}),
                        new Button({ 
                          variant: 'info', 
                          text: 'Go to Toast', 
                          className: 'btn-sm',
                          onClick: () => window.scrollTo(0, document.body.scrollHeight) // Approximation to show toasts
                        })
                      ]
                    })) : 
                    new SmallText({ text: 'All tools clear. No pending approvals.', className: 'text-muted' })
                })
              ]
            })
          })
        ]
      })
    ];
  }
}
