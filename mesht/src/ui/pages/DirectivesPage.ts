import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardHeader, CardBody, Badge, Heading, SmallText,
  Button, Section, DataTable,
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  FormLabel, FormControl, FormSelect
} from '@flybyme/isomorphic-ui';
import { Directive } from '../../domains/sys.directives/directives.schema';
import { LiveInspector } from '../components/LiveInspector';
import { Project, ProjectStatus } from '../../domains/sys.projects/projects.schema';
import { SubmitDirectiveResult } from '../../domains/sys.interface/interface.schema';

class ProjectSelect extends FormSelect {
  build(): ComponentChild[] {
    const projects = BrokerDOM.getStateService().getValue<Project[]>('projects.all') || [];
    return projects.map(p => new Section({
      tagName: 'option',
      value: p.id,
      text: p.name,
      selected: BrokerDOM.getStateService().getValue('ui.newDirective.projectId') === p.id ? true : undefined
    }));
  }
}

export class DirectivesPage extends BrokerPage {
  private createModal?: Modal;
  private inspectorModal?: Modal;
  private unsubs: Array<() => void> = [];

  public getSEO() { return { defaultTitle: 'Directives' }; }
  public getPageConfig() { return { title: 'Directives' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4 h-100 d-flex flex-column' });
    this.initCreateModal();
    this.initInspectorModal();
  }

  private initInspectorModal() {
    const state = BrokerDOM.getStateService();
    this.inspectorModal = new Modal({
      id: 'inspectorModal',
      size: 'xl',
      onHide: () => state.set('ui.selectedDirectiveID', null),
      children: [
        new ModalHeader({
          onClose: () => this.inspectorModal?.hide(),
          children: new ModalTitle({ text: 'Directive FSM Inspector' })
        }),
        new ModalBody({
          className: 'p-0',
          style: { height: '85vh' },
          children: [
            new LiveInspector({
              directiveID: '$state.ui.selectedDirectiveID'
            })
          ]
        })
      ]
    });

    // Reactive hide
    this.unsubs.push(state.subscribe('ui.selectedDirectiveID', (id) => {
      if (!id) this.inspectorModal?.hide();
    }));
  }

  private initCreateModal() {
    this.createModal = new Modal({
      id: 'createDirectiveModal',
      children: [
        new ModalHeader({ 
          onClose: () => this.createModal?.hide(),
          children: new ModalTitle({ text: 'New Grid Directive' }) 
        }),
        new ModalBody({
          children: [
            new FormLabel({ text: 'Title' }),
            new FormControl({
              id: 'directiveTitle',
              type: 'text',
              placeholder: 'Internal Refactoring',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newDirective.title', (e.target as HTMLInputElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Project' }),
            new ProjectSelect({
              id: 'directiveProject',
              value: '$state.ui.newDirective.projectId',
              onChange: (e: Event) => BrokerDOM.getStateService().set('ui.newDirective.projectId', (e.target as HTMLSelectElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Objective' }),
            new FormControl({
              id: 'directiveObjective',
              type: 'textarea',
              placeholder: 'Explain what the agent should do...',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newDirective.objective', (e.target as HTMLTextAreaElement).value)
            }),
          ]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createModal?.hide() }),
            new Button({ variant: 'primary', text: 'Launch', onClick: () => this.submitDirective() })
          ]
        })
      ]
    });
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
        className: 'flex-grow-1 position-relative overflow-hidden d-flex',
        children: [
          new Section({
            className: 'flex-grow-1 overflow-auto p-4',
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: 'Directives', className: 'mb-0' }) }),
                new CardBody({
                  children: new DataTable<Directive>({
                    columns: [
                      { key: 'id', label: 'ID', render: (row: Directive) => new SmallText({ text: row.id.slice(0, 8), className: 'font-monospace' }) },
                      { key: 'title', label: 'Title' },
                      { key: 'projectId', label: 'Project', render: (row: Directive) => new SmallText({ text: row.projectId || 'None', className: 'text-muted' }) },
                      { key: 'status', label: 'Status', render: (row: Directive) => new Badge({ 
                        text: row.status.toUpperCase(), 
                        variant: row.status === 'running' ? 'primary' : row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : row.status === 'paused' ? 'warning' : 'secondary' 
                      }) },
                      { key: 'currentNode', label: 'Node', render: (row: Directive) => new Badge({ variant: 'light', text: row.currentNode, className: 'text-dark border' }) },
                      { key: 'assignedPersona', label: 'Persona', render: (row: Directive) => new SmallText({ text: row.assignedPersona || 'Unassigned' }) },
                      { key: 'id', label: 'Actions', render: (row: Directive) => new Section({
                        className: 'd-flex gap-1',
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
      this.createModal!,
      this.inspectorModal!
    ];
  }

  private async pauseDirective(id: string) {
    try {
      await BrokerDOM.getBroker().call('sys.directives.updateContext', {
        id,
        contextMutation: {},
        status: 'paused'
      });
      this.refresh();
    } catch (err) {
      this.logger.error('Failed to pause directive', err);
    }
  }

  private async resumeDirective(id: string) {
    try {
      await BrokerDOM.getBroker().call('sys.directives.resume', { id });
      this.refresh();
    } catch (err) {
      this.logger.error('Failed to resume directive', err);
    }
  }

  private async cancelDirective(id: string) {
    if (!confirm('Are you sure you want to cancel this directive?')) return;
    try {
      await BrokerDOM.getBroker().call('sys.directives.cancel', { id });
      this.refresh();
    } catch (err) {
      this.logger.error('Failed to cancel directive', err);
    }
  }

  private async submitDirective() {
    const state = BrokerDOM.getStateService();
    const title = state.getValue<string>('ui.newDirective.title');
    const objective = state.getValue<string>('ui.newDirective.objective');
    const projectId = state.getValue<string>('ui.newDirective.projectId');

    if (!title || !objective) return;

    try {
      await BrokerDOM.getBroker().call<SubmitDirectiveResult>('sys.interface.submit', {
        title,
        objective,
        projectId
      });
      this.createModal?.hide();
      this.refresh();
      state.set('ui.newDirective.objective', '');
    } catch (err) {
      // Use the UI library for feedback if possible, or just log
      this.logger.error('Launch error', err);
    }
  }
}
