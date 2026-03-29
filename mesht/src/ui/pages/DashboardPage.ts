import {
  BrokerPage, ComponentChild, BrokerDOM, Row, Col,
  Card, CardHeader, CardBody, Heading, SmallText,
  Button, FormLabel, FormControl, FormSelect, Section
} from '@flybyme/isomorphic-ui';
import { AuditLog } from '../../domains/sys.audit/audit.schema';
import { Project, ProjectStatus } from '../../domains/sys.projects/projects.schema';
import { SchedulerConfig } from '../../domains/sys.scheduler/scheduler.schema';
import { SubmitDirectiveResult } from '../../domains/sys.interface/interface.schema';
import { AuditTrailTable } from '../components/AuditTrailTable';

type RegistryNodes = Record<string, { id?: string }>;

class ProjectSelect extends FormSelect {
  build(): ComponentChild[] {
    const projects = BrokerDOM.getStateService().getValue<Project[]>('projects.all') || [];
    return projects.map(p => new Section({
      tagName: 'option',
      value: p.id,
      text: p.name,
      selected: BrokerDOM.getStateService().getValue('ui.quickDirective.projectId') === p.id ? true : undefined
    }));
  }
}

export class DashboardPage extends BrokerPage {
  private unsubs: Array<() => void> = [];

  constructor() {
    super('div', { className: 'container-fluid py-4' });
  }

  public getSEO() {
    return { defaultTitle: 'Dashboard' };
  }

  public getPageConfig() {
    return { title: 'Dashboard' };
  }

  public async onEnter(): Promise<void> {
    const state = BrokerDOM.getStateService();
    const broker = BrokerDOM.getBroker();

    // 1. Initial State Setup
    if (!state.getValue('audit_logs')) state.set('audit_logs', []);

    // 2. Fetch Initial Telemetry
    try {
      const stats = await broker.call<SchedulerConfig>('sys.scheduler.status', {});
      state.set('system.status', stats?.status || 'idle');

      const logs = await broker.call<AuditLog[]>('sys.audit.query', { query: {}, limit: 10 });
      state.set('audit_logs', logs);

      const projectStatus = await broker.call<ProjectStatus>('sys.projects.status', {});
      state.set('projects.status', projectStatus);

      const allProjects = await broker.call<Project[]>('sys.projects.list', {});
      state.set('projects.all', allProjects);

      if (projectStatus?.activeProjectId) {
        state.set('ui.quickDirective.projectId', projectStatus.activeProjectId);
      }
    } catch (err) {
      this.logger.error('Failed to fetch dashboard data', err);
    }

    // 3. Global Header Actions
    this.refreshHeaderActions();

    // 4. Real-time Events
    this.unsubs.push(broker.on('sys.scheduler.started', () => {
      state.set('system.status', 'running');
      this.refreshHeaderActions();
      this.update();
    }));
    this.unsubs.push(broker.on('sys.scheduler.stopped', () => {
      state.set('system.status', 'paused');
      this.refreshHeaderActions();
      this.update();
    }));
  }

  private refreshHeaderActions() {
    const state = BrokerDOM.getStateService();
    const broker = BrokerDOM.getBroker();
    const status = state.getValue<string>('system.status');

    this.setHeaderActions([
      new Button({
        variant: 'primary',
        text: 'Manual Tick',
        onClick: () => broker.call('sys.scheduler.tick', {}, { timeout: 600000 })
      }),
      new Button({
        variant: 'success',
        text: 'Start Scheduler',
        disabled: status === 'running',
        onClick: () => broker.call('sys.scheduler.start', {})
      }),
      new Button({
        variant: 'danger',
        text: 'Stop Scheduler',
        disabled: status !== 'running',
        onClick: () => broker.call('sys.scheduler.stop', { reason: 'User requested stop' })
      })
    ]);
  }

  public async onLeave(): Promise<void> {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const sysStatus = state.getValue<string>('system.status') || 'offline';
    const logs = state.getValue<AuditLog[]>('audit_logs') || [];
    const projectStatus = state.getValue<ProjectStatus>('projects.status') || { projectCount: 0 };
    const isSubmitting = state.getValue<boolean>('ui.quickDirective.submitting') || false;
    const quickObjective = state.getValue<string>('ui.quickDirective.objective') || '';
    const registryNodes = state.getValue<RegistryNodes>('$registry.nodes') || {};

    return [
      new Row({
        children: [
          // Metrics Cards
          this.buildStatCard('Grid Status', sysStatus, sysStatus === 'running' ? 'success' : 'warning'),
          this.buildStatCard('Active Project', projectStatus.activeProjectId || 'None', 'primary'),
          this.buildStatCard('Mesh Nodes', String(Object.keys(registryNodes).length), 'info'),
        ]
      }),
      new Row({
        className: 'mt-4',
        children: [
          new Col({
            span: 8,
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: 'Recent Audit Trail' }) }),
                new CardBody({
                  children: new AuditTrailTable({
                    pageSize: 5,
                    data: logs
                  })
                })
              ]
            })
          }),
          new Col({
            span: 4,
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: 'Quick Directive' }) }),
                new CardBody({
                  children: [
                    new FormLabel({ text: 'Project' }),
                    new ProjectSelect({
                      id: 'quickProject',
                      className: 'mb-3',
                      value: '$state.ui.quickDirective.projectId',
                      onChange: (e: Event) => BrokerDOM.getStateService().set('ui.quickDirective.projectId', (e.target as HTMLSelectElement).value)
                    }),
                    new FormLabel({ text: 'Objective' }),
                    new FormControl({
                      id: 'quickObjective',
                      type: 'textarea',
                      placeholder: 'e.g. "Implement a new API endpoint"',
                      value: '$state.ui.quickDirective.objective',
                      disabled: isSubmitting,
                      onInput: (e: Event) => BrokerDOM.getStateService().set('ui.quickDirective.objective', (e.target as HTMLTextAreaElement).value)
                    }),
                    new Button({
                      className: 'mt-3 w-100',
                      variant: 'primary',
                      text: isSubmitting ? 'Submitting...' : 'Submit to Grid',
                      disabled: isSubmitting || !quickObjective,
                      onClick: () => this.submitQuick()
                    })
                  ]
                })
              ]
            })
          })
        ]
      })
    ];
  }

  private buildStatCard(label: string, value: string, color: string): ComponentChild {
    return new Col({
      span: 4,
      children: new Card({
        className: `border-start border-4 border-${color}`,
        children: new CardBody({
          children: [
            new SmallText({ text: label, className: 'text-uppercase text-muted fw-bold' }),
            new Heading(3, { text: value, className: 'mb-0' })
          ]
        })
      })
    });
  }

  private async submitQuick() {
    const state = BrokerDOM.getStateService();
    const objective = state.getValue<string>('ui.quickDirective.objective');
    const projectId = state.getValue<string>('ui.quickDirective.projectId');
    if (!objective) return;

    state.set('ui.quickDirective.submitting', true);

    try {
      await BrokerDOM.getBroker().call<SubmitDirectiveResult>('sys.interface.submit', {
        title: 'Quick Directive',
        objective: objective,
        projectId: projectId
      });
      state.set('ui.quickDirective.objective', '');
    } catch (err) {
      this.logger.error('Error submitting directive', err);
    } finally {
      state.set('ui.quickDirective.submitting', false);
    }
  }
}
