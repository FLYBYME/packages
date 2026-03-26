import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardHeader, CardBody, Badge, Heading, SmallText,
  Box, DataTable, Button, IBadgeProps
} from '@flybyme/isomorphic-ui';
import { GitflowSession, GitflowSessionStatus } from '../../domains/sys.gitflow/gitflow.schema';

const GITFLOW_STATUS_VARIANTS: Record<GitflowSessionStatus, IBadgeProps['variant']> = {
  active: 'primary',
  pending: 'secondary',
  merging: 'warning',
  merged: 'success',
  conflict: 'danger',
};

export class GitflowPage extends BrokerPage {
  private unsubscribe: (() => void)[] = [];

  public getSEO() { return { defaultTitle: 'Gitflow Dashboard' }; }
  public getPageConfig() { return { title: 'Gitflow Operations' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4 h-100 d-flex flex-column' });
  }

  public async onEnter(): Promise<void> {
    this.refresh();
    const broker = BrokerDOM.getBroker();
    this.unsubscribe.push(broker.on('sys.gitflow.session_updated', () => this.refresh()));
  }

  public async onLeave(): Promise<void> {
    this.unsubscribe.forEach(u => u());
    this.unsubscribe = [];
  }

  private async refresh() {
    try {
      const sessions = await BrokerDOM.getBroker().call<GitflowSession[]>('sys.gitflow.list_sessions', {});
      BrokerDOM.getStateService().set('gitflow.sessions', sessions);
      this.update();
    } catch (err) {
      this.logger.error('Failed to load gitflow sessions', err);
    }
  }

  build(): ComponentChild[] {
    const sessions = BrokerDOM.getStateService().getValue<GitflowSession[]>('gitflow.sessions') || [];

    const stats = {
      total: sessions.length,
      pending: sessions.filter((session) => session.status === 'pending').length,
      active: sessions.filter((session) => session.status === 'active').length,
      conflicts: sessions.filter((session) => session.status === 'conflict').length,
    };

    return [
      // Stats Bar
      new Box({
        className: 'row g-3 mb-4',
        children: [
          this.renderStatCard('Total Workspaces', stats.total, 'primary'),
          this.renderStatCard('Active Branches', stats.active, 'info'),
          this.renderStatCard('Pending Merge', stats.pending, 'warning'),
          this.renderStatCard('Merge Conflicts', stats.conflicts, stats.conflicts > 0 ? 'danger' : 'success'),
        ]
      }),

      // Workspaces Table
      new Card({
        className: 'flex-grow-1 overflow-hidden',
        children: [
          new CardHeader({ 
            className: 'd-flex justify-content-between align-items-center',
            children: [
              new Heading(5, { text: 'Active Workspaces', className: 'mb-0' }),
              new Button({ size: 'sm', variant: 'outline-secondary', text: 'Refresh', onClick: () => this.refresh() })
            ]
          }),
          new CardBody({
            className: 'p-0 overflow-auto',
            children: new DataTable<GitflowSession>({
              columns: [
                { key: 'projectId', label: 'Project', render: (row: GitflowSession) => new SmallText({ text: row.projectId, className: 'fw-bold' }) },
                { key: 'directiveId', label: 'Directive', render: (row: GitflowSession) => new SmallText({ text: row.directiveId.slice(0, 8), className: 'font-monospace' }) },
                { key: 'branchName', label: 'Branch', render: (row: GitflowSession) => new SmallText({ text: row.branchName, className: 'font-monospace text-info' }) },
                { key: 'status', label: 'Status', render: (row: GitflowSession) => {
                  return new Badge({ text: row.status.toUpperCase(), variant: GITFLOW_STATUS_VARIANTS[row.status] });
                }},
                { key: 'updatedAt', label: 'Last Activity', render: (row: GitflowSession) => new SmallText({ text: new Date(row.updatedAt).toLocaleString(), className: 'text-muted small' }) },
                { 
                  key: 'id', 
                  label: 'Actions', 
                  render: (row: GitflowSession) => new Button({
                    size: 'sm',
                    variant: 'info',
                    text: 'View Workspace',
                    onClick: () => {
                      BrokerDOM.getStateService().set('ui.selectedDirectiveID', row.directiveId);
                      // In a real app we might want to navigate to the directive page and open the Gitflow tab
                      BrokerDOM.navigate('/directives');
                    }
                  })
                }
              ],
              data: sessions
            })
          })
        ]
      })
    ];
  }

  private renderStatCard(label: string, value: number, variant: IBadgeProps['variant']): ComponentChild {
    return new Box({
      className: 'col-md-3',
      children: new Card({
        className: `border-start border-4 border-${variant}`,
        children: new CardBody({
          children: [
            new SmallText({ text: label, className: 'text-muted uppercase x-small fw-bold d-block' }),
            new Heading(3, { text: value.toString(), className: 'mb-0 mt-1' })
          ]
        })
      })
    });
  }
}
