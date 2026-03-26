// FILE: src/ui/pages/ProjectsPage.ts
import { 
  BrokerPage, ComponentChild, BrokerDOM, Row, Col, 
  Card, CardHeader, CardBody, Heading, SmallText,
  Button, DataTable, Badge, Box, FormControl, FormLabel
} from '@flybyme/isomorphic-ui';
import { Project, ProjectDeleteResult, ProjectStatus } from '../../domains/sys.projects/projects.schema';

export class ProjectsPage extends BrokerPage {
  constructor() {
    super('div', { className: 'container-fluid py-4' });
  }

  public getSEO() {
    return { defaultTitle: 'Project Management' };
  }

  public getPageConfig() {
    return { title: 'Projects' };
  }

  public async onEnter(): Promise<void> {
    await this.refreshData();
  }

  private async refreshData() {
    const state = BrokerDOM.getStateService();
    const broker = BrokerDOM.getBroker();

    try {
      const projects = await broker.call<Project[]>('sys.projects.list', {});
      state.set('projects.all', projects);

      const status = await broker.call<ProjectStatus>('sys.projects.status', {});
      state.set('projects.status', status);
    } catch (err) {
      this.logger.error('Failed to fetch projects', err);
    }
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const projects = state.getValue<Project[]>('projects.all') || [];
    const status = state.getValue<{
      activeProjectId?: string,
      activeProjectRoot?: string,
      projectCount?: number
    }>('projects.status') || {};
    const showForm = state.getValue<boolean>('projects.ui.showForm') || false;
    const editingId = state.getValue<string>('projects.ui.editingId');

    return [
      new Row({
        children: [
          new Col({
            span: 12,
            children: new Card({
              className: 'mb-4 border-start border-4 border-primary',
              children: new CardBody({
                children: [
                  new Row({
                    alignItems: 'center',
                    children: [
                      new Col({
                        children: [
                          new SmallText({ text: 'Active Project Root', className: 'text-uppercase text-muted fw-bold' }),
                          new Heading(4, { text: status.activeProjectRoot || 'Not Selected', className: 'mb-0' })
                        ]
                      }),
                      new Col({
                        span: 'auto',
                        children: new Badge({ 
                          text: status.activeProjectId || 'None', 
                          variant: 'primary' 
                        })
                      })
                    ]
                  })
                ]
              })
            })
          })
        ]
      }),

      // Form Card
      showForm ? new Row({
        className: 'mb-4',
        children: [
          new Col({
            span: 12,
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: editingId ? 'Edit Project' : 'Add New Project' }) }),
                new CardBody({
                  children: [
                    new Row({
                      children: [
                        new Col({
                          span: 6,
                          children: [
                            new FormLabel({ text: 'Project ID (unique)' }),
                            new FormControl({
                              id: 'proj-id',
                              value: state.getValue<string>('projects.form.id') || '',
                              disabled: !!editingId,
                              onInput: (e: Event) => state.set('projects.form.id', (e.target as HTMLInputElement).value)
                            })
                          ]
                        }),
                        new Col({
                          span: 6,
                          children: [
                            new FormLabel({ text: 'Display Name' }),
                            new FormControl({
                              id: 'proj-name',
                              value: state.getValue<string>('projects.form.name') || '',
                              onInput: (e: Event) => state.set('projects.form.name', (e.target as HTMLInputElement).value)
                            })
                          ]
                        })
                      ]
                    }),
                    new Row({
                      className: 'mt-3',
                      children: [
                        new Col({
                          span: 12,
                          children: [
                            new FormLabel({ text: 'Git Repository URL' }),
                            new FormControl({
                              id: 'proj-repository',
                              value: state.getValue<string>('projects.form.repository') || '',
                              onInput: (e: Event) => state.set('projects.form.repository', (e.target as HTMLInputElement).value)
                            })
                          ]
                        })
                      ]
                    }),
                    new Row({
                      className: 'mt-3',
                      children: [
                        new Col({
                          span: 12,
                          children: [
                            new FormLabel({ text: 'Description' }),
                            new FormControl({
                              id: 'proj-desc',
                              type: 'textarea',
                              value: state.getValue<string>('projects.form.description') || '',
                              onInput: (e: Event) => state.set('projects.form.description', (e.target as HTMLTextAreaElement).value)
                            })
                          ]
                        })
                      ]
                    }),
                    new Box({
                      className: 'mt-4 d-flex gap-2',
                      children: [
                        new Button({
                          variant: 'success',
                          text: editingId ? 'Update Project' : 'Create Project',
                          onClick: () => this.saveProject()
                        }),
                        new Button({
                          variant: 'secondary',
                          text: 'Cancel',
                          onClick: () => this.cancelEdit()
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          })
        ]
      }) : null,

      new Row({
        children: [
          new Col({
            span: 12,
            children: new Card({
              children: [
                new CardHeader({ 
                  className: 'd-flex justify-content-between align-items-center',
                  children: [
                    new Heading(5, { text: 'Workspace Projects', className: 'mb-0' }),
                    new Button({
                      variant: 'primary',
                      size: 'sm',
                      text: 'Add Project',
                      onClick: () => this.showAddForm()
                    })
                  ] 
                }),
                new CardBody({
                  children: new DataTable({
                    columns: [
                      { key: 'id', label: 'ID' },
                      { key: 'name', label: 'Name' },
                      { key: 'repository', label: 'Repository' },
                      { key: 'rootPath', label: 'Root Path' },
                      { 
                        key: 'active', 
                        label: 'Status',
                        render: (row: Project) => row.active 
                          ? new Badge({ text: 'ACTIVE', variant: 'success' }) 
                          : new Badge({ text: 'INACTIVE', variant: 'secondary' })
                      },
                      {
                        key: 'id',
                        label: 'Actions',
                        render: (row: Project) => new Box({
                          className: 'd-flex gap-1',
                          children: [
                            new Button({
                              size: 'sm',
                              variant: row.active ? 'secondary' : 'primary',
                              text: row.active ? 'Active' : 'Select',
                              disabled: row.active,
                              onClick: () => this.selectProject(row.id)
                            }),
                            new Button({
                              size: 'sm',
                              variant: 'info',
                              text: 'Edit',
                              onClick: () => this.editProject(row)
                            }),
                            new Button({
                              size: 'sm',
                              variant: 'danger',
                              text: 'Delete',
                              disabled: row.active,
                              onClick: () => this.deleteProject(row.id)
                            })
                          ]
                        })
                      }
                    ],
                    data: projects
                  })
                })
              ]
            })
          })
        ]
      })
    ];
  }

  private async selectProject(id: string) {
    try {
      await BrokerDOM.getBroker().call<Project>('sys.projects.select', { id });
      
      // Short delay to ensure backend has processed and emitted events
      await new Promise(r => setTimeout(r, 100));
      
      await this.refreshData();
      this.logger.info(`Switched to project: ${id}`);
    } catch (err) {
      this.logger.error('Failed to select project', err);
    }
  }

  private showAddForm() {
    const state = BrokerDOM.getStateService();
    state.set('projects.ui.showForm', true);
    state.set('projects.ui.editingId', null);
    state.set('projects.form.id', '');
    state.set('projects.form.name', '');
    state.set('projects.form.repository', '');
    state.set('projects.form.description', '');
  }

  private editProject(project: Project) {
    const state = BrokerDOM.getStateService();
    state.set('projects.ui.showForm', true);
    state.set('projects.ui.editingId', project.id);
    state.set('projects.form.id', project.id);
    state.set('projects.form.name', project.name);
    state.set('projects.form.repository', project.repository);
    state.set('projects.form.description', project.description);
  }

  private cancelEdit() {
    const state = BrokerDOM.getStateService();
    state.set('projects.ui.showForm', false);
  }

  private async saveProject() {
    const state = BrokerDOM.getStateService();
    const broker = BrokerDOM.getBroker();
    const editingId = state.getValue<string>('projects.ui.editingId');
    
    const id = state.getValue<string>('projects.form.id');
    const name = state.getValue<string>('projects.form.name');
    const repository = state.getValue<string>('projects.form.repository');
    const description = state.getValue<string>('projects.form.description');

    if (!id || !name || !repository) {
      this.logger.warn('Please fill in all required fields');
      return;
    }

    try {
      if (editingId) {
        await broker.call<Project>('sys.projects.update', { id, name, repository, description });
      } else {
        await broker.call<Project>('sys.projects.create', { id, name, repository, description });
      }
      
      state.set('projects.ui.showForm', false);
      await this.refreshData();
    } catch (err) {
      this.logger.error('Failed to save project', err);
    }
  }

  private async deleteProject(id: string) {
    if (!confirm(`Are you sure you want to delete project '${id}'?`)) return;

    try {
      await BrokerDOM.getBroker().call<ProjectDeleteResult>('sys.projects.delete', { id });
      await this.refreshData();
    } catch (err) {
      this.logger.error('Failed to delete project', err);
    }
  }
}
