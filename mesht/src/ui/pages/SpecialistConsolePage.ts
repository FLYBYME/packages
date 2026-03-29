// FILE: src/ui/pages/SpecialistConsolePage.ts
import { 
  BrokerPage, ComponentChild, BrokerDOM, 
  Row, Col, Card, CardBody,
  Button, Section, SmallText, FormLabel, FormControl, FormCheck, Badge, FormSelect,
  IBaseUIProps
} from '@flybyme/isomorphic-ui';
import { Project, ProjectStatus } from '../../domains/sys.projects/projects.schema';
import { CatalogModel } from '../../domains/sys.catalog/catalog.schema';

class ProjectSelect extends FormSelect {
  build(): ComponentChild[] {
    const projects = BrokerDOM.getStateService().getValue<Project[]>('projects.all') || [];
    return projects.map(p => new Section({
      tagName: 'option',
      value: p.id,
      text: p.name,
      selected: BrokerDOM.getStateService().getValue('specialist.ui.projectId') === p.id ? true : undefined
    }));
  }
}

interface SpecialistLog {
  source: string;
  text: string;
  type: 'stdout' | 'warn' | 'info' | 'success' | 'danger';
  timestamp: number;
}

export class SpecialistConsolePage extends BrokerPage {
  private unsubs: Array<() => void> = [];

  constructor(props: IBaseUIProps = {}) {
    super('div', { className: 'container-fluid py-4 h-100 d-flex flex-column', ...props });
  }

  public getSEO() { return { defaultTitle: 'Specialist Console' }; }
  public getPageConfig() { return { title: 'Specialists' }; }

  public async onEnter(): Promise<void> {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    // Initial state
    state.set('specialist.ui.target', 'gemini');
    state.set('specialist.ui.hintSimple', false);
    state.set('specialist.ui.status', 'Idle');
    state.set('specialist.ui.logs', [] as SpecialistLog[]);
    state.set('specialist.ui.working', false);

    try {
      const projectStatus = await broker.call<ProjectStatus>('sys.projects.status', {});
      if (projectStatus?.activeProjectId) {
        state.set('specialist.ui.projectId', projectStatus.activeProjectId);
      }

      const allProjects = await broker.call<Project[]>('sys.projects.list', {});
      state.set('projects.all', allProjects);
    } catch (err) {
      this.logger.error('Failed to fetch project status', err);
    }

    await this.refreshModels();

    // Event Listeners
    this.unsubs.push(broker.on('sys.tools.specialist_start', (payload: { model: string }) => {
      state.set('specialist.ui.status', `Working (${payload.model})`);
      state.set('specialist.ui.working', true);
      this.appendLog('SYSTEM', `Started session with model: ${payload.model}`, 'info');
    }));

    this.unsubs.push(broker.on('sys.tools.specialist_log', (payload: { specialist: string, text: string, stream: string }) => {
      this.appendLog(payload.specialist, payload.text, payload.stream === 'stderr' ? 'warn' : 'stdout');
    }));

    this.unsubs.push(broker.on('sys.tools.specialist_complete', (payload: { exitCode: number, durationMs: number }) => {
      state.set('specialist.ui.status', payload.exitCode === 0 ? 'Idle' : 'Error');
      state.set('specialist.ui.working', false);
      this.appendLog('SYSTEM', `Process completed in ${payload.durationMs}ms with exit code ${payload.exitCode}`, payload.exitCode === 0 ? 'success' : 'danger');
    }));
  }

  public async onLeave(): Promise<void> {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private appendLog(source: string, text: string, type: SpecialistLog['type']) {
    const state = BrokerDOM.getStateService();
    const currentLogs = state.getValue<SpecialistLog[]>('specialist.ui.logs') || [];
    state.set('specialist.ui.logs', [...currentLogs, { source, text, type, timestamp: Date.now() }]);
    
    // Auto-scroll logic (best effort in BrokerComponent)
    setTimeout(() => {
      const terminal = document.getElementById('specialist-terminal');
      if (terminal) terminal.scrollTop = terminal.scrollHeight;
    }, 10);
  }

  private async refreshModels() {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();
    const specialist = state.getValue<string>('specialist.ui.target') || 'gemini';

    try {
      const models = await broker.call<CatalogModel[]>('sys.catalog.find', {
        query: {
          capabilities: { $contains: specialist },
          status: 'active'
        }
      });
      state.set('specialist.ui.models', models);
      if (models.length > 0) {
        state.set('specialist.ui.model', models[0].alias);
      } else {
        state.set('specialist.ui.model', '');
      }
    } catch (err) {
      this.logger.error('Failed to fetch models', err);
    }
  }

  private async sendPrompt() {
    const state = BrokerDOM.getStateService();
    const prompt = state.getValue<string>('specialist.ui.promptInput');
    const specialist = state.getValue<string>('specialist.ui.target');
    const simple = state.getValue<boolean>('specialist.ui.hintSimple');
    const projectId = state.getValue<string>('specialist.ui.projectId');
    const model = state.getValue<string>('specialist.ui.model');

    if (!prompt || !specialist || !projectId) {
      this.logger.warn('Prompt, Specialist, and Project context are required.');
      return;
    }

    // Clear input immediately for UX
    state.set('specialist.ui.promptInput', '');
    state.set('specialist.ui.working', true);
    
    try {
      await BrokerDOM.getBroker().call('sys.tools.invoke', {
        toolName: 'delegate_to_specialist',
        arguments: {
          specialist,
          prompt,
          hints: simple ? ['simple'] : [],
          projectId,
          model: model || undefined
        },
        projectId
      });
    } catch (err) {
      this.appendLog('ERROR', (err as Error).message, 'danger');
      state.set('specialist.ui.working', false);
    }
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const status = state.getValue<string>('specialist.ui.status') || 'Idle';
    const working = state.getValue<boolean>('specialist.ui.working') || false;
    const logs = state.getValue<SpecialistLog[]>('specialist.ui.logs') || [];
    const target = state.getValue<string>('specialist.ui.target') || 'gemini';
    const models = state.getValue<CatalogModel[]>('specialist.ui.models') || [];
    const selectedModel = state.getValue<string>('specialist.ui.model') || '';
    const hintSimple = state.getValue<boolean>('specialist.ui.hintSimple') || false;
    const promptInput = state.getValue<string>('specialist.ui.promptInput') || '';

    return [
      // Header / Controls
      new Card({
        className: 'mb-3',
        children: new CardBody({
          children: new Row({
            alignItems: 'center',
            children: [
              new Col({
                span: 3,
                children: [
                  new FormLabel({ text: 'Specialist' }),
                  new FormSelect({
                    id: 'specialistTarget',
                    value: target,
                    disabled: working,
                    onChange: (e: Event) => {
                      BrokerDOM.getStateService().set('specialist.ui.target', (e.target as HTMLSelectElement).value);
                      this.refreshModels();
                    },
                    children: [
                      new Section({ tagName: 'option', value: 'gemini', text: 'Gemini CLI' }),
                      new Section({ tagName: 'option', value: 'copilot', text: 'GitHub Copilot' }),
                      new Section({ tagName: 'option', value: 'opencode', text: 'OpenCode' })
                    ]
                  })
                ]
              }),
              new Col({
                span: 3,
                children: [
                  new FormLabel({ text: 'Project Context' }),
                  new ProjectSelect({
                    id: 'specialistProject',
                    value: '$state.specialist.ui.projectId',
                    disabled: working,
                    onChange: (e: Event) => BrokerDOM.getStateService().set('specialist.ui.projectId', (e.target as HTMLSelectElement).value)
                  })
                ]
              }),
              new Col({
                span: 3,
                children: [
                  new FormLabel({ text: 'Model' }),
                  new FormSelect({
                    id: 'specialistModel',
                    value: selectedModel,
                    disabled: working || models.length === 0,
                    onChange: (e: Event) => BrokerDOM.getStateService().set('specialist.ui.model', (e.target as HTMLSelectElement).value),
                    children: models.map((m: CatalogModel) => new Section({ tagName: 'option', value: m.alias, text: m.alias }))
                  })
                ]
              }),
              new Col({
                span: 3,
                className: 'pt-4',
                children: new FormCheck({
                  label: 'Simple Hint (Faster Models)',
                  switch: true,
                  checked: hintSimple,
                  disabled: working,
                  onChange: (e: Event) => BrokerDOM.getStateService().set('specialist.ui.hintSimple', (e.target as HTMLInputElement).checked)
                })
              }),
              new Col({
                span: 3,
                className: 'text-end pt-4',
                children: [
                  new SmallText({ text: 'Status:', className: 'me-2 text-muted' }),
                  new Badge({ 
                    text: status, 
                    variant: working ? 'primary' : (status.includes('Error') ? 'danger' : 'success') 
                  })
                ]
              })
            ]
          })
        })
      }),

      // Terminal View
      new Section({
        id: 'specialist-terminal',
        className: 'flex-grow-1 bg-dark text-light p-3 rounded font-monospace overflow-auto mb-3',
        style: { fontSize: '14px', border: '1px solid #333' },
        children: logs.length > 0 ? logs.map((log: SpecialistLog) => new Section({
          className: `mb-1 ${this.getLogClass(log.type)}`,
          children: [
            new SmallText({ text: `[${log.source}] `, className: 'opacity-50' }),
            new Section({ tagName: 'span', text: log.text, style: { whiteSpace: 'pre-wrap' } })
          ]
        })) : new Section({ className: 'text-muted italic', text: 'Waiting for specialist activity...' })
      }),

      // Input Area
      new Card({
        children: new CardBody({
          children: [
            new Row({
              children: [
                new Col({
                  span: 10,
                  children: new FormControl({
                    type: 'textarea',
                    id: 'specialist-input',
                    placeholder: 'Type your instruction for the specialist...',
                    rows: 3,
                    value: promptInput,
                    disabled: working,
                    onInput: (e: Event) => BrokerDOM.getStateService().set('specialist.ui.promptInput', (e.target as HTMLTextAreaElement).value)
                  })
                }),
                new Col({
                  span: 2,
                  className: 'd-flex flex-column gap-2',
                  children: [
                    new Button({
                      variant: 'primary',
                      className: 'h-100',
                      text: working ? 'Running...' : 'Send',
                      disabled: working || !promptInput,
                      onClick: () => this.sendPrompt()
                    })
                  ]
                })
              ]
            })
          ]
        })
      })
    ];
  }

  private getLogClass(type: SpecialistLog['type']): string {
    switch (type) {
      case 'warn': return 'text-warning';
      case 'info': return 'text-info';
      case 'success': return 'text-success';
      case 'danger': return 'text-danger';
      default: return 'text-light';
    }
  }
}
