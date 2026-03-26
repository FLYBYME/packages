// FILE: src/ui/pages/PersonasPage.ts
import {
  BrokerPage, ComponentChild, BrokerDOM,
  Row, Col, Card, CardHeader, CardBody, CardFooter,
  Badge, Heading, SmallText, Button, Box,
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  FormLabel, FormControl, FormCheck, IBaseUIProps
} from '@flybyme/isomorphic-ui';
import { Persona, Blueprint } from '../../domains/sys.personas/personas.schema';

interface Tool {
  toolId: string;
  name: string;
  description: string;
}

interface ToolSelectionProps extends IBaseUIProps {
  statePath: string;
}

class ToolSelection extends Box {
  private statePath: string;

  constructor(props: ToolSelectionProps) {
    super({ className: 'd-flex flex-wrap gap-2', ...props });
    this.statePath = props.statePath;
  }

  build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const allTools = state.getValue<Tool[]>('ui.allTools') || [];
    const selectedTools = state.getValue<string[]>(this.statePath) || [];

    return allTools.map(t => new FormCheck({
      label: t.name,
      checked: selectedTools.includes(t.name),
      onChange: (e: Event) => {
        const target = e.target as HTMLInputElement;
        const current = state.getValue<string[]>(this.statePath) || [];
        if (target.checked) {
          state.set(this.statePath, [...current, t.name]);
        } else {
          state.set(this.statePath, current.filter(name => name !== t.name));
        }
      }
    }));
  }
}

export class PersonasPage extends BrokerPage {
  private configModal?: Modal;
  private createModal?: Modal;

  public getSEO() { return { defaultTitle: 'Personas' }; }
  public getPageConfig() { return { title: 'Personas' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4' });
    this.initModals();
  }

  private initModals() {
    this.configModal = new Modal({
      id: 'configPersonaModal',
      size: 'lg',
      children: [
        new ModalHeader({
          children: new ModalTitle({
            text: 'Persona Configuration',
            id: 'modalTitle'
          })
        }),
        new ModalBody({
          children: [
            new Row({
              children: [
                new Col({
                  span: 6,
                  children: [
                    new FormLabel({ text: 'Deployment Alias' }),
                    new FormControl({
                      plaintext: true,
                      readOnly: true,
                      className: 'p-2 bg-light border rounded mb-3 font-monospace small',
                      value: '$state.ui.configPersona.alias'
                    }),
                  ]
                }),
                new Col({
                  span: 6,
                  children: [
                    new FormLabel({ text: 'Model Name' }),
                    new FormControl({
                      plaintext: true,
                      readOnly: true,
                      className: 'p-2 bg-light border rounded mb-3 font-monospace small',
                      value: '$state.ui.configPersona.model'
                    }),
                  ]
                })
              ]
            }),
            new FormLabel({ text: 'System Prompt (Base Instructions)' }),
            new FormControl({
              id: 'configPrompt',
              type: 'textarea',
              rows: 8,
              readOnly: true,
              value: '$state.ui.configPersona.prompt',
              className: 'font-monospace small'
            }),
            new Box({ className: 'mt-3' }),
            new Row({
              children: [
                new Col({
                  span: 6,
                  children: [
                    new FormLabel({ text: 'Temperature' }),
                    new FormControl({
                      plaintext: true,
                      readOnly: true,
                      className: 'p-2 bg-light border rounded small',
                      value: '$state.ui.configPersona.temperature'
                    })
                  ]
                }),
                new Col({
                  span: 6,
                  children: [
                    new FormLabel({ text: 'Max Tool Rounds' }),
                    new FormControl({
                      plaintext: true,
                      readOnly: true,
                      className: 'p-2 bg-light border rounded small',
                      value: '$state.ui.configPersona.maxRounds'
                    })
                  ]
                })
              ]
            }),
            new Box({ className: 'mt-3' }),
            new FormLabel({ text: 'Tool Belt (Select capabilities)' }),
            new ToolSelection({ statePath: 'ui.configPersona.allowedTools' }),
            new Button({
              variant: 'primary',
              size: 'sm',
              text: 'Save Tool Belt',
              className: 'mt-2',
              onClick: () => this.onSaveTools()
            })
          ]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Close', onClick: () => this.configModal?.hide() })
          ]
        })
      ]
    });

    this.createModal = new Modal({
      id: 'createPersonaModal',
      children: [
        new ModalHeader({ children: new ModalTitle({ text: 'Instantiate New Persona' }) }),
        new ModalBody({
          children: [
            new FormLabel({ text: 'Alias (Unique ID)' }),
            new FormControl({
              id: 'newPersonaAlias',
              placeholder: 'e.g. security_auditor',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newPersona.alias', (e.target as HTMLInputElement).value)
            }),
            new Box({ className: 'mt-3' }),
            new FormLabel({ text: 'Role' }),
            new FormControl({
              id: 'newPersonaRole',
              type: 'select',
              options: [
                { value: 'worker', label: 'Worker' },
                { value: 'architect', label: 'Architect' },
                { value: 'judge', label: 'Judge' },
                { value: 'operator', label: 'Operator' }
              ],
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newPersona.role', (e.target as HTMLSelectElement).value)
            }),
            new Box({ className: 'mt-3' }),
            new FormLabel({ text: 'System Prompt' }),
            new FormControl({
              id: 'newPersonaPrompt',
              type: 'textarea',
              rows: 4,
              placeholder: 'Identify security vulnerabilities...',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newPersona.prompt', (e.target as HTMLTextAreaElement).value)
            }),
            new Box({ className: 'mt-3' }),
            new FormLabel({ text: 'LLM Deployment' }),
            new FormControl({
              id: 'newPersonaDeployment',
              placeholder: 'e.g. qwen3:4b-instruct',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newPersona.deployment', (e.target as HTMLInputElement).value)
            }),
            new Box({ className: 'mt-3' }),
            new FormLabel({ text: 'Allowed Tools' }),
            new ToolSelection({ statePath: 'ui.newPersona.allowedTools' }),
          ]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createModal?.hide() }),
            new Button({ variant: 'primary', text: 'Initialize', onClick: () => this.submitPersona() })
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
        text: '+ New Persona',
        onClick: () => this.createModal?.show()
      })
    ]);

    try {
      const tools = await broker.call<Tool[]>('sys.tools.find', {});
      state.set('ui.allTools', tools);
    } catch (err) {
      this.logger.error('Failed to fetch tools', err);
    }

    await this.refresh();
  }

  private async refresh() {
    try {
      const personas = await BrokerDOM.getBroker().call<Persona[]>('sys.personas.list', {});
      console.log(personas)
      BrokerDOM.getStateService().set('personas', personas);
    } catch (err) {
      this.logger.error('Failed to load personas', err);
    }
  }

  private async onConfig(p: Persona) {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    // Update title immediately
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.innerText = `Configuration: ${p.alias}`;

    state.set('ui.configPersona.alias', p.alias);
    state.set('ui.configPersona.allowedTools', p.allowedTools || []);

    // Set loading indicators in state
    state.set('ui.configPersona.deployment', 'Loading...');
    state.set('ui.configPersona.model', 'Loading...');
    state.set('ui.configPersona.prompt', 'Loading...');
    state.set('ui.configPersona.temperature', '...');
    state.set('ui.configPersona.maxRounds', '...');

    this.configModal?.show();

    try {
      const blueprint = await broker.call<Blueprint>('sys.personas.getBlueprint', { alias: p.alias });

      state.set('ui.configPersona.deployment', blueprint.persona.llmDeploymentAlias);
      state.set('ui.configPersona.model', String((blueprint.llmDeployment as { modelName?: string }).modelName || 'Unknown'));
      state.set('ui.configPersona.prompt', blueprint.persona.systemPrompt);
      state.set('ui.configPersona.temperature', String(blueprint.persona.temperature ?? 'N/A'));
      state.set('ui.configPersona.maxRounds', String(blueprint.persona.maxToolRounds));
      state.set('ui.configPersona.allowedTools', blueprint.persona.allowedTools || []);

    } catch (err) {
      this.logger.error('Failed to fetch blueprint', err);
      state.set('ui.configPersona.deployment', 'Error');
      state.set('ui.configPersona.model', 'Error');
    }
  }

  private async onSaveTools() {
    const state = BrokerDOM.getStateService();
    const alias = state.getValue<string>('ui.configPersona.alias');
    const selectedTools = state.getValue<string[]>('ui.configPersona.allowedTools') || [];

    if (!alias) return;

    try {
      const personas = state.getValue<Persona[]>('personas') || [];
      const currentPersona = personas.find(p => p.alias === alias);
      const currentTools = currentPersona?.allowedTools || [];

      const addTools = selectedTools.filter(t => !currentTools.includes(t));
      const removeTools = currentTools.filter(t => !selectedTools.includes(t));

      if (addTools.length > 0 || removeTools.length > 0) {
        await BrokerDOM.getBroker().call('sys.personas.updateTools', {
          alias,
          addTools,
          removeTools
        });
        await this.refresh();
        this.logger.info(`Updated tools for ${alias}`);
      }
    } catch (err) {
      this.logger.error('Failed to update tools', err);
    }
  }

  private async submitPersona() {
    const state = BrokerDOM.getStateService();
    const alias = state.getValue<string>('ui.newPersona.alias');
    const role = (state.getValue<string>('ui.newPersona.role') as Persona['role']) || 'worker';
    const systemPrompt = state.getValue<string>('ui.newPersona.prompt');
    const llmDeploymentAlias = state.getValue<string>('ui.newPersona.deployment');
    const allowedTools = state.getValue<string[]>('ui.newPersona.allowedTools') || [];

    if (!alias || !systemPrompt || !llmDeploymentAlias) return;

    try {
      await BrokerDOM.getBroker().call('sys.personas.create', {
        alias,
        role,
        systemPrompt,
        llmDeploymentAlias,
        allowedTools,
        traits: []
      });
      this.createModal?.hide();
      this.refresh();
    } catch (err) {
      this.logger.error('Creation error', err);
    }
  }

  private async onDeletePersona(p: Persona) {
    if (!confirm(`Are you sure you want to remove persona '${p.alias}'?`)) return;

    try {
      await BrokerDOM.getBroker().call('sys.personas.remove', { alias: p.alias });
      this.refresh();
    } catch (err) {
      this.logger.error('Deletion error', err);
    }
  }

  public build(): ComponentChild[] {
    const personas = BrokerDOM.getStateService().getValue<Persona[]>('personas') || [];

    return [
      new Heading(2, { text: 'Persona Matrix', className: 'mb-4' }),
      new Row({
        children: personas.map(p => new Col({
          span: 4,
          className: 'mb-4',
          children: new Card({
            children: [
              new CardHeader({
                className: 'd-flex justify-content-between align-items-center',
                children: [
                  new Box({
                    children: [
                      new Heading(5, { text: p.alias, className: 'mb-0' }),
                      new Badge({ variant: 'primary', text: p.role, className: 'mt-1' })
                    ]
                  }),
                  new Button({
                    variant: 'outline-danger',
                    size: 'sm',
                    text: '×',
                    onClick: () => this.onDeletePersona(p)
                  })
                ]
              }),
              new CardBody({
                children: [
                  new SmallText({ text: 'Traits', className: 'text-muted fw-bold d-block mb-1' }),
                  new Box({
                    className: 'd-flex gap-1 flex-wrap mb-3',
                    children: (p.traits || []).map((t: string) => new Badge({ variant: 'light', text: t, className: 'text-dark border' }))
                  }),
                  new SmallText({ text: 'Model Deployment', className: 'text-muted fw-bold d-block mb-1' }),
                  new Box({ text: p.llmDeploymentAlias, className: 'font-monospace small' })
                ]
              }),
              new CardFooter({
                className: 'bg-transparent',
                children: new Button({
                  variant: 'secondary',
                  size: 'sm',
                  text: 'Configuration',
                  className: 'w-100',
                  onClick: () => this.onConfig(p)
                })
              })
            ]
          })
        }))
      }),
      this.configModal!,
      this.createModal!
    ];
  }
}
