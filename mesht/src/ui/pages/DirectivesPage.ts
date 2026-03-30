// FILE: src/ui/pages/DirectivesPage.ts
import { 
  BrokerPage, ComponentChild, BrokerDOM, 
  DataTable, Badge, Section, SmallText,
  Button, Card, CardHeader, CardBody, Heading,
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  FormControl, FormLabel, FormSelect, FormOption
} from '@flybyme/isomorphic-ui';
import { Directive } from '../../domains/sys.directives/directives.schema';
import { Project, ProjectStatus } from '../../domains/sys.projects/projects.schema';
import { LiveInspector } from '../components/LiveInspector';

export class DirectivesPage extends BrokerPage {
  private unsubs: (() => void)[] = [];
  private createModal?: Modal;
  private inspectorModal?: Modal;

  constructor() {
    super('div', { className: 'mesh-directives-page h-100 d-flex flex-column' });
  }

  public getSEO() {
    return { defaultTitle: 'Directives Grid' };
  }

  public getPageConfig() {
    return { title: 'Directives' };
  }

  override onMount(): void {
    super.onMount();
    this.createModal = (this.element?.querySelector('#create-directive-modal') as unknown as { __brokerInstance?: Modal })?.__brokerInstance;
    this.inspectorModal = (this.element?.querySelector('#inspector-modal') as unknown as { __brokerInstance?: Modal })?.__brokerInstance;
  }

  public async onEnter(): Promise<void> {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    this.setHeaderActions([
      new Button({
        variant: 'primary',
        text: '+ New Directive',
        onClick: () => this.createModal?.show()
      })
    ]);

    // Initial Load
    try {
      const projects = await broker.call<Project[]>('sys.projects.list', {});
      state.set('projects.all', projects);

      const status = await broker.call<ProjectStatus>('sys.projects.status', {});
      if (status?.activeProjectId) {
        state.set('ui.newDirective.projectId', status.activeProjectId);
      }

      const directives = await broker.call<Directive[]>('sys.directives.list', {});
      state.set('directives.list', directives);
    } catch (err) {
      this.logger.error('Failed to load directives', err);
    }

    // Real-time updates
    this.unsubs.push(broker.on('sys.directives.created', () => this.refresh()));
    this.unsubs.push(broker.on('sys.directives.step_completed', () => this.refresh()));
  }

  public async onLeave(): Promise<void> {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private async refresh() {
    const list = await BrokerDOM.getBroker().call<Directive[]>('sys.directives.list', {});
    BrokerDOM.getStateService().set('directives.list', list);
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const directives = state.getValue<Directive[]>('directives.list') || [];

    return [
      new Section({
        flexGrow: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        children: [
          new Section({
            flexGrow: 1,
            overflow: 'auto',
            padding: 4,
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: 'Directives', mb: 0 }) }),
                new CardBody({
                  children: new DataTable<Directive>({
                    columns: [
                      { key: 'id', label: 'ID', render: (row: Directive) => new SmallText({ text: row.id.slice(0, 8), className: 'font-monospace' }) },
                      { key: 'title', label: 'Title' },
                      { key: 'projectId', label: 'Project', color: 'muted', render: (row: Directive) => new SmallText({ text: row.projectId || 'None' }) },
                      { key: 'status', label: 'Status', render: (row: Directive) => new Badge({
                        text: row.status.toUpperCase(),
                        variant: row.status === 'running' ? 'primary' : row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : row.status === 'paused' ? 'warning' : 'secondary'
                      }) },
                      { key: 'currentNode', label: 'Node', render: (row: Directive) => new Badge({ variant: 'light', text: row.currentNode, color: 'dark', border: true }) },
                      { key: 'assignedPersona', label: 'Persona', render: (row: Directive) => new SmallText({ text: row.assignedPersona || 'Unassigned' }) },
                      { key: 'id', label: 'Actions', render: (row: Directive) => new Section({
                        display: 'flex',
                        gap: 1,
                        children: [
                          new Button({
                            size: 'sm',
                            variant: 'info',
                            text: 'Inspect',
                            onClick: () => {
                              BrokerDOM.getStateService().set('ui.selectedDirectiveID', row.id);
                              this.inspectorModal?.show();
                            }
                          }),
                          new Button({
                            size: 'sm',
                            variant: 'secondary',
                            text: 'Trace',
                            onClick: () => {
                              BrokerDOM.navigate(`/directive-trace?id=${row.id}`);
                            }
                          }),
                          row.status === 'running' ? new Button({ size: 'sm', variant: 'warning', text: 'Pause', onClick: () => this.pauseDirective(row.id) }) : null,
                          row.status === 'paused' ? new Button({ size: 'sm', variant: 'success', text: 'Resume', onClick: () => this.resumeDirective(row.id) }) : null,
                          ['running', 'paused', 'initialized'].includes(row.status) ? new Button({ size: 'sm', variant: 'danger', text: 'Cancel', onClick: () => this.cancelDirective(row.id) }) : null,
                        ]
                      }) }
                    ],
                    data: directives
                  })
                })
              ]
            })
          })
        ]
      }),

      this.buildCreateModal(),
      this.buildInspectorModal()
    ];
  }

  private buildCreateModal(): Modal {
    const state = BrokerDOM.getStateService();
    const projects = state.getValue<Project[]>('projects.all') || [];

    return new Modal({
      id: 'create-directive-modal',
      size: 'lg',
      centered: true,
      children: [
        new ModalHeader({ children: new ModalTitle({ text: 'Launch New Directive' }) }),
        new ModalBody({
          children: [
            new Section({
              mb: 3,
              children: [
                new FormLabel({ text: 'Project Context' }),
                new FormSelect({
                  value: state.getValue<string>('ui.newDirective.projectId') || '',
                  onChange: (e: Event) => state.set('ui.newDirective.projectId', (e.target as HTMLSelectElement).value),
                  children: [
                    new FormOption({ value: '', text: '-- Select Project --' }),
                    ...projects.map(p => new FormOption({ value: p.id, text: `${p.name} (${p.id})` }))
                  ]
                })
              ]
            }),
            new Section({
              mb: 3,
              children: [
                new FormLabel({ text: 'Directive Title' }),
                new FormControl({
                  placeholder: 'e.g., Refactor Auth Domain',
                  value: state.getValue<string>('ui.newDirective.title') || '',
                  onInput: (e: Event) => state.set('ui.newDirective.title', (e.target as HTMLInputElement).value)
                })
              ]
            }),
            new Section({
              children: [
                new FormLabel({ text: 'Objective' }),
                new FormControl({
                  type: 'textarea',
                  placeholder: 'What is the end goal?',
                  style: { height: '150px' },
                  value: state.getValue<string>('ui.newDirective.objective') || '',
                  onInput: (e: Event) => state.set('ui.newDirective.objective', (e.target as HTMLTextAreaElement).value)
                })
              ]
            })
          ]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createModal?.hide() }),
            new Button({ 
              variant: 'primary', 
              text: 'Launch Grid', 
              onClick: () => this.createDirective() 
            })
          ]
        })
      ]
    });
  }

  private buildInspectorModal(): Modal {
    return new Modal({
      id: 'inspector-modal',
      fullscreen: 'lg',
      scrollable: true,
      children: new LiveInspector({ 
        directiveID: '$state.ui.selectedDirectiveID' as unknown as string,
        onClose: () => this.inspectorModal?.hide()
      })
    });
  }

  private async createDirective() {
    const state = BrokerDOM.getStateService();
    const projectId = state.getValue<string>('ui.newDirective.projectId');
    const title = state.getValue<string>('ui.newDirective.title');
    const objective = state.getValue<string>('ui.newDirective.objective');

    if (!projectId || !title || !objective) {
      this.logger.warn('Missing required fields');
      return;
    }

    try {
      await BrokerDOM.getBroker().call('sys.directives.create', {
        projectId,
        title,
        objective
      });
      this.createModal?.hide();
      state.set('ui.newDirective.title', '');
      state.set('ui.newDirective.objective', '');
    } catch (err) {
      this.logger.error('Failed to create directive', err);
    }
  }

  private async pauseDirective(id: string) {
    await BrokerDOM.getBroker().call('sys.directives.pause', { id });
    this.refresh();
  }

  private async resumeDirective(id: string) {
    await BrokerDOM.getBroker().call('sys.directives.resume', { id });
    this.refresh();
  }

  private async cancelDirective(id: string) {
    if (!confirm('Are you sure you want to cancel this directive?')) return;
    await BrokerDOM.getBroker().call('sys.directives.cancel', { id });
    this.refresh();
  }
}
