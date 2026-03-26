// FILE: src/ui/pages/ToolWorkbenchPage.ts
import { 
  BrokerPage, ComponentChild, BrokerDOM, 
  Row, Col, Card, CardHeader, CardBody, Heading,
  Button, Box, SmallText, FormLabel, FormControl, FormCheck,
  IBaseUIProps, FormSelect, DataTable, Badge
} from '@flybyme/isomorphic-ui';
import { Project, ProjectStatus } from '../../domains/sys.projects/projects.schema';
import { ForgeTool } from '../../domains/sys.forge/forge.schema';
import { InvokeToolResult, Tool, ToolParameter } from '../../domains/sys.tools/tools.schema';
import { JSONObject } from '../../shared/json.schema';

class ProjectSelect extends FormSelect {
  build(): ComponentChild[] {
    const projects = BrokerDOM.getStateService().getValue<Project[]>('projects.all') || [];
    return projects.map(p => new Box({
      tagName: 'option',
      value: p.id,
      text: p.name,
      selected: BrokerDOM.getStateService().getValue('workbench.projectId') === p.id ? true : undefined
    }));
  }
}

export class ToolWorkbenchPage extends BrokerPage {
  constructor(props: IBaseUIProps = {}) {
    super('div', { className: 'container-fluid py-4 h-100', ...props });
  }

  public getSEO() { return { defaultTitle: 'Tool Workbench' }; }
  public getPageConfig() { return { title: 'Workbench' }; }

  public async onEnter(): Promise<void> {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    // Default view
    if (!state.getValue('workbench.activeTab')) state.set('workbench.activeTab', 'explorer');

    try {
      const tools = await broker.call<Tool[]>('sys.tools.find', {});
      state.set('workbench.tools', tools);
      
      const allProjects = await broker.call<Project[]>('sys.projects.list', {});
      state.set('projects.all', allProjects);

      const projectStatus = await broker.call<ProjectStatus>('sys.projects.status', {});
      if (projectStatus?.activeProjectId) {
        state.set('workbench.projectId', projectStatus.activeProjectId);
      }

      if (tools.length > 0 && !state.getValue('workbench.selectedTool')) {
        this.selectTool(tools[0]);
      }

      await this.refreshForge();
    } catch (err) {
      this.logger.error('Failed to load workbench data', err);
    }
  }

  private selectTool(tool: Tool) {
    const state = BrokerDOM.getStateService();
    state.set('workbench.selectedTool', tool);
    // Reset arguments
    state.set('workbench.args', {});
    state.set('workbench.output', null);
    state.set('workbench.executing', false);
  }

  private async refreshForge() {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();
    try {
      const forged = await broker.call<ForgeTool[]>('sys.forge.list', {});
      state.set('workbench.forge.tools', forged);
    } catch (err) {
      this.logger.error('Failed to load forged tools', err);
    }
  }

  private async approveForgedTool(id: string, status: 'active' | 'quarantined') {
    try {
      await BrokerDOM.getBroker().call('sys.forge.approve', { id, status });
      await this.refreshForge();
      // Also refresh system tools to show newly active one
      const tools = await BrokerDOM.getBroker().call<Tool[]>('sys.tools.find', {});
      BrokerDOM.getStateService().set('workbench.tools', tools);
      this.logger.info(`Forged tool ${status === 'active' ? 'activated' : 'quarantined'}.`);
    } catch (err) {
      this.logger.error('Approval failed', err);
    }
  }

  private async executeTool() {
    const state = BrokerDOM.getStateService();
    const tool = state.getValue<Tool>('workbench.selectedTool');
    const args = state.getValue<JSONObject>('workbench.args') || {};
    const projectId = state.getValue<string>('workbench.projectId');

    if (!tool || !projectId) {
      this.logger.warn('Tool and Project context are required.');
      return;
    }

    state.set('workbench.executing', true);
    state.set('workbench.output', 'Invoking tool...');

    const start = Date.now();
    try {
      const response = await BrokerDOM.getBroker().call<InvokeToolResult>('sys.tools.invoke', {
        toolName: tool.name,
        arguments: args,
        projectId
      });
      
      const duration = Date.now() - start;
      state.set('workbench.output', {
        status: response.success ? 'SUCCESS' : 'FAILURE',
        latency: `${duration}ms`,
        result: response.result
      });
    } catch (err) {
      state.set('workbench.output', {
        status: 'ERROR',
        error: (err as Error).message
      });
    } finally {
      state.set('workbench.executing', false);
    }
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const activeTab = state.getValue<string>('workbench.activeTab') || 'explorer';
    const tools = state.getValue<Tool[]>('workbench.tools') || [];
    const selectedTool = state.getValue<Tool>('workbench.selectedTool');
    const executing = state.getValue<boolean>('workbench.executing') || false;
    const output = state.getValue<object | string | null>('workbench.output');
    const forgedTools = state.getValue<ForgeTool[]>('workbench.forge.tools') || [];

    return [
      new Box({
        className: 'd-flex gap-3 mb-3 border-bottom pb-2',
        children: [
          new Button({
            variant: activeTab === 'explorer' ? 'primary' : 'link',
            text: 'Tool Explorer',
            onClick: () => BrokerDOM.getStateService().set('workbench.activeTab', 'explorer')
          }),
          new Button({
            variant: activeTab === 'forge' ? 'primary' : 'link',
            text: `Forge (${forgedTools.filter(t => t.status === 'pending_approval').length})`,
            onClick: () => BrokerDOM.getStateService().set('workbench.activeTab', 'forge')
          })
        ]
      }),

      activeTab === 'explorer' ? new Row({
        className: 'h-100',
        children: [
          // Sidebar
          new Col({
            span: 3,
            className: 'h-100 border-end overflow-auto',
            children: [
              new Box({
                className: 'p-3 border-bottom mb-3',
                children: [
                  new FormLabel({ text: 'Project Context' }),
                  new ProjectSelect({
                    id: 'workbenchProject',
                    value: '$state.workbench.projectId',
                    onChange: (e: Event) => BrokerDOM.getStateService().set('workbench.projectId', (e.target as HTMLSelectElement).value)
                  })
                ]
              }),
              new Heading(5, { text: 'Tool Explorer', className: 'mb-3 px-3' }),
              new Box({
                className: 'list-group list-group-flush',
                children: tools.map((tool) => new Button({
                  variant: 'link',
                  className: `list-group-item list-group-item-action border-0 text-start ${selectedTool?.name === tool.name ? 'active text-white' : ''}`,
                  onClick: () => this.selectTool(tool),
                  children: [
                    new Box({ text: tool.name, className: 'fw-bold d-block' }),
                    new SmallText({ text: tool.description, className: 'x-small text-truncate d-block' })
                  ]
                }))
              })
            ]
          }),

          // Main Panel
          new Col({
            span: 9,
            className: 'h-100 d-flex flex-column p-4',
            children: selectedTool ? [
              new Box({
                className: 'flex-shrink-0 mb-4',
                children: [
                  new Heading(3, { text: selectedTool.name }),
                  new SmallText({ text: selectedTool.description, className: 'text-muted' })
                ]
              }),

              // Dynamic Form
              new Card({
                className: 'mb-4',
                children: [
                  new CardHeader({ children: new Heading(6, { text: 'Parameters', className: 'mb-0' }) }),
                  new CardBody({
                    children: [
                      new Row({
                        children: (selectedTool.parameters || []).map((parameter) => new Col({
                          span: parameter.type === 'string' && parameter.name.includes('content') ? 12 : 6,
                          className: 'mb-3',
                          children: [
                            new FormLabel({ text: `${parameter.name} (${parameter.type})${parameter.required ? ' *' : ''}` }),
                            this.renderParamInput(parameter)
                          ]
                        }))
                      }),
                      new Button({
                        variant: 'primary',
                        text: executing ? 'Executing...' : 'Execute Tool',
                        disabled: executing,
                        onClick: () => this.executeTool()
                      })
                    ]
                  })
                ]
              }),

              // Output Terminal
              new Box({
                className: 'flex-grow-1 d-flex flex-column',
                children: [
                  new Heading(6, { text: 'Output Terminal', className: 'mb-2' }),
                  new Box({
                    className: 'flex-grow-1 bg-dark text-light p-3 rounded font-monospace overflow-auto',
                    style: { fontSize: '13px', minHeight: '200px' },
                    text: output ? JSON.stringify(output, null, 2) : 'Ready for execution.'
                  })
                ]
              })
            ] : [
              new Box({
                className: 'h-100 d-flex align-items-center justify-content-center text-muted',
                text: 'Select a tool from the explorer to begin.'
              })
            ]
          })
        ]
      }) : this.buildForgeView(forgedTools)
    ];
  }

  private renderParamInput(p: ToolParameter): ComponentChild {
    const state = BrokerDOM.getStateService();
    const value = state.getValue(`workbench.args.${p.name}`);

    if (p.type === 'boolean') {
      return new FormCheck({
        label: p.description,
        checked: !!value,
        onChange: (e: Event) => {
          const val = (e.target as HTMLInputElement).checked;
          state.set(`workbench.args.${p.name}`, val);
        }
      });
    }

    return new FormControl({
      type: p.name.includes('content') || p.name.includes('prompt') ? 'textarea' : 'text',
      placeholder: p.description,
      value: (value as string) || '',
      onInput: (e: Event) => {
        let val: unknown = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
        if (p.type === 'number') val = Number(val);
        if (p.type === 'object' || p.type === 'array') {
          try { val = JSON.parse(val as string); } catch { /* ignore invalid json while typing */ }
        }
        state.set(`workbench.args.${p.name}`, val);
      }
    });
  }

  private buildForgeView(tools: ForgeTool[]): ComponentChild {
    return new Row({
      children: [
        new Col({
          span: 12,
          children: new Card({
            children: [
              new CardHeader({ children: new Heading(5, { text: 'Dynamic Tool Forge Review', className: 'mb-0' }) }),
              new CardBody({
                children: new DataTable({
                  columns: [
                    { key: 'name', label: 'Tool Name' },
                    { key: 'description', label: 'Description' },
                    { key: 'status', label: 'Status', render: (row: ForgeTool) => new Badge({ 
                      text: row.status.toUpperCase(), 
                      variant: row.status === 'active' ? 'success' : (row.status === 'pending_approval' ? 'warning' : 'danger') 
                    }) },
                    { 
                      key: 'code', 
                      label: 'Code Review',
                      render: (row: ForgeTool) => new Box({
                        className: 'bg-dark text-warning p-2 rounded small font-monospace',
                        style: { whiteSpace: 'pre-wrap', maxHeight: '150px', overflow: 'auto' },
                        text: row.code
                      })
                    },
                    {
                      key: 'id',
                      label: 'Actions',
                      render: (row: ForgeTool) => new Box({
                        className: 'd-flex gap-1',
                        children: [
                          row.status === 'pending_approval' ? new Button({
                            size: 'sm',
                            variant: 'success',
                            text: 'Activate',
                            onClick: () => this.approveForgedTool(row.id, 'active')
                          }) : null,
                          row.status !== 'quarantined' ? new Button({
                            size: 'sm',
                            variant: 'danger',
                            text: 'Quarantine',
                            onClick: () => this.approveForgedTool(row.id, 'quarantined')
                          }) : null
                        ]
                      })
                    }
                  ],
                  data: tools
                })
              })
            ]
          })
        })
      ]
    });
  }
}
