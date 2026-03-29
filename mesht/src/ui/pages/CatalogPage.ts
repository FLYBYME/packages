// FILE: src/ui/pages/CatalogPage.ts
import { 
  BrokerPage, ComponentChild, BrokerDOM, Row, Col, 
  Card, CardHeader, CardBody, Heading, SmallText,
  Button, DataTable, Badge, Section, FormControl, FormLabel, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  Spinner
} from '@flybyme/isomorphic-ui';
import { CatalogModel } from '../../domains/sys.catalog/catalog.schema';

export class CatalogPage extends BrokerPage {
  private createModal?: Modal;

  constructor() {
    super('div', { className: 'container-fluid py-4' });
    this.initCreateModal();
  }

  public getSEO() {
    return { defaultTitle: 'Model Catalog' };
  }

  public getPageConfig() {
    return { title: 'Catalog' };
  }

  public async onEnter(): Promise<void> {
    await this.refresh();
  }

  private async refresh() {
    const state = BrokerDOM.getStateService();
    const broker = BrokerDOM.getBroker();

    try {
      const models = await broker.call<CatalogModel[]>('sys.catalog.find', { query: {} });
      state.set('catalog.models', models);
    } catch (err) {
      this.logger.error('Failed to fetch catalog', err);
    }
  }

  private initCreateModal() {
    const state = BrokerDOM.getStateService();
    this.createModal = new Modal({
      id: 'enableModelModal',
      children: [
        new ModalHeader({ 
          children: new ModalTitle({ 
            text: '$state.catalog.ui.editingId ? "Edit Model" : "Enable New Model"' 
          }) 
        }),
        new ModalBody({
          children: [
            new Row({
              children: [
                new Col({
                  span: 6,
                  children: [
                    new FormLabel({ text: 'Alias (Logical Name)' }),
                    new FormControl({
                      id: 'model-alias',
                      placeholder: 'e.g. gpt-4o-mini',
                      value: '$state.catalog.form.alias',
                      onInput: (e: Event) => state.set('catalog.form.alias', (e.target as HTMLInputElement).value)
                    })
                  ]
                }),
                new Col({
                  span: 6,
                  children: [
                    new FormLabel({ text: 'Provider ID' }),
                    new FormControl({
                      id: 'model-provider',
                      placeholder: 'openai, ollama, anthropic...',
                      value: '$state.catalog.form.providerId',
                      onInput: (e: Event) => state.set('catalog.form.providerId', (e.target as HTMLInputElement).value)
                    })
                  ]
                })
              ]
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Actual Model Name' }),
            new FormControl({
              id: 'model-name',
              placeholder: 'e.g. gpt-4o-mini-2024-07-18',
              value: '$state.catalog.form.modelName',
              onInput: (e: Event) => state.set('catalog.form.modelName', (e.target as HTMLInputElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Base URL (Optional)' }),
            new FormControl({
              id: 'model-url',
              placeholder: 'https://api.openai.com/v1',
              value: '$state.catalog.form.baseURL',
              onInput: (e: Event) => state.set('catalog.form.baseURL', (e.target as HTMLInputElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'API Key (Optional)' }),
            new FormControl({
              id: 'model-key',
              type: 'password',
              value: '$state.catalog.form.apiKey',
              onInput: (e: Event) => state.set('catalog.form.apiKey', (e.target as HTMLInputElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Max Context Tokens' }),
            new FormControl({
              id: 'model-context',
              type: 'number',
              value: '$state.catalog.form.maxContextTokens',
              onInput: (e: Event) => state.set('catalog.form.maxContextTokens', Number((e.target as HTMLInputElement).value))
            })
          ]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createModal?.hide() }),
            new Button({ 
              variant: 'primary', 
              text: '$state.catalog.ui.editingId ? "Update Model" : "Enable Model"', 
              onClick: () => this.submitModel() 
            })
          ]
        })
      ]
    });
  }

  private onAdd() {
    const state = BrokerDOM.getStateService();
    state.set('catalog.ui.editingId', null);
    state.set('catalog.form.alias', '');
    state.set('catalog.form.providerId', '');
    state.set('catalog.form.modelName', '');
    state.set('catalog.form.baseURL', '');
    state.set('catalog.form.apiKey', '');
    state.set('catalog.form.maxContextTokens', 128000);
    this.createModal?.show();
  }

  private onEdit(model: CatalogModel) {
    const state = BrokerDOM.getStateService();
    state.set('catalog.ui.editingId', model.id);
    state.set('catalog.form.alias', model.alias);
    state.set('catalog.form.providerId', model.providerId);
    state.set('catalog.form.modelName', model.modelName);
    state.set('catalog.form.baseURL', model.baseURL || '');
    state.set('catalog.form.apiKey', model.apiKey || '');
    state.set('catalog.form.maxContextTokens', model.maxContextTokens);
    this.createModal?.show();
  }

  private async submitModel() {
    const state = BrokerDOM.getStateService();
    const editingId = state.getValue<string>('catalog.ui.editingId');
    
    const alias = state.getValue<string>('catalog.form.alias');
    const providerId = state.getValue<string>('catalog.form.providerId');
    const modelName = state.getValue<string>('catalog.form.modelName');
    const baseURL = state.getValue<string>('catalog.form.baseURL');
    const apiKey = state.getValue<string>('catalog.form.apiKey');
    const maxContextTokens = state.getValue<number>('catalog.form.maxContextTokens') || 128000;

    if (!alias || !providerId || !modelName) return;

    try {
      if (editingId) {
        await BrokerDOM.getBroker().call('sys.catalog.updateModel', {
          id: editingId,
          alias, providerId, modelName, baseURL, apiKey, maxContextTokens
        });
      } else {
        await BrokerDOM.getBroker().call('sys.catalog.enable', {
          alias, providerId, modelName, baseURL, apiKey, maxContextTokens
        });
      }
      this.createModal?.hide();
      await this.refresh();
    } catch (err) {
      this.logger.error('Submit failed', err);
    }
  }

  private async deleteModel(alias: string) {
    if (!confirm(`Remove model '${alias}' from catalog?`)) return;
    try {
      await BrokerDOM.getBroker().call('sys.catalog.deleteModel', { alias });
      await this.refresh();
    } catch (err) {
      this.logger.error('Delete failed', err);
    }
  }

  private async pingModel(alias: string) {
    const state = BrokerDOM.getStateService();
    state.set(`catalog.ui.pinging.${alias}`, true);

    try {
      await BrokerDOM.getBroker().call('sys.catalog.ping', { alias });
      await this.refresh();
    } catch (err) {
      this.logger.error('Ping failed', err);
    } finally {
      state.set(`catalog.ui.pinging.${alias}`, false);
    }
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const models = state.getValue<CatalogModel[]>('catalog.models') || [];
    const pingingMap = state.getValue<Record<string, boolean>>('catalog.ui.pinging') || {};

    return [
      new Row({
        children: [
          new Col({
            span: 12,
            children: new Card({
              children: [
                new CardHeader({
                  className: 'd-flex justify-content-between align-items-center',
                  children: [
                    new Heading(5, { text: 'Model Registry', className: 'mb-0' }),
                    new Button({
                      variant: 'primary',
                      size: 'sm',
                      text: '+ Enable Model',
                      onClick: () => this.onAdd()
                    })
                  ]
                }),
                new CardBody({
                  children: new DataTable<CatalogModel>({
                    columns: [
                      { key: 'alias', label: 'Alias' },
                      { key: 'providerId', label: 'Provider' },
                      { key: 'modelName', label: 'Backend Name' },
                      { 
                        key: 'maxContextTokens', 
                        label: 'Context',
                        render: (row: CatalogModel) => new SmallText({ text: `${Math.round(row.maxContextTokens / 1024)}k` })
                      },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (row: CatalogModel) => new Badge({
                          text: row.status.toUpperCase(),
                          variant: row.status === 'active' ? 'success' : (row.status === 'error' ? 'danger' : 'warning')
                        })
                      },
                      {
                        key: 'alias',
                        label: 'Actions',
                        render: (row: CatalogModel) => {
                          const isPinging = pingingMap[row.alias];
                          return new Section({
                            className: 'd-flex gap-1',
                            children: [
                              new Button({
                                size: 'sm',
                                variant: 'outline-info',
                                text: isPinging ? 'Pinging...' : 'Ping',
                                disabled: isPinging,
                                children: isPinging ? new Spinner({ size: 'sm', className: 'me-1' }) : undefined,
                                onClick: () => this.pingModel(row.alias)
                              }),
                              new Button({
                                size: 'sm',
                                variant: 'outline-primary',
                                text: 'Edit',
                                disabled: isPinging,
                                onClick: () => this.onEdit(row)
                              }),
                              new Button({
                                size: 'sm',
                                variant: 'outline-danger',
                                text: 'Delete',
                                disabled: isPinging,
                                onClick: () => this.deleteModel(row.alias)
                              })
                            ]
                          });
                        }
                      }
                    ],
                    data: models
                  })
                })
              ]
            })
          })
        ]
      }),
      this.createModal!
    ];
  }
}
