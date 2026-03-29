// FILE: src/ui/pages/MemoryExplorerPage.ts
import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardHeader, CardBody,
  Section, Button, SmallText, Badge,
  Table, TableHead, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  FormControl,
  IBaseUIProps
} from '@flybyme/isomorphic-ui';
import { MemoryEntry, QueryMemoryResult } from '../../domains/sys.int.chroma/chroma.schema';

export class MemoryExplorerPage extends BrokerPage {
  constructor(props: IBaseUIProps = {}) {
    super('div', { className: 'container-fluid p-4', ...props });
  }

  getPageConfig() {
    return { title: 'Memory Explorer' };
  }

  getSEO() {
    return {
      defaultTitle: 'Memory Explorer',
      titleTemplate: '%s | MeshT'
    };
  }

  async onEnter(): Promise<void> {
    await this.refreshMemories();
  }

  // ── Layout Declarations ─────────────────────────────────────
  get headerActions() {
    return [
      new Button({
        text: '+ Inject Memory',
        className: 'btn btn-sm btn-success',
        onClick: () => this.showInjectModal(),
      }),
    ];
  }

  // ── Modals ─────────────────────────────────────────────────
  private showInjectModal(): void {
    BrokerDOM.getStateService().set('ui.memory.showInject', true);
  }

  private injectMemoryModal(): ComponentChild {
    return new Modal({
      id: 'inject-memory-modal',
      show: BrokerDOM.getStateService().getValue<boolean>('ui.memory.showInject'),
      onClose: () => BrokerDOM.getStateService().set('ui.memory.showInject', false),
      children: [
        new ModalHeader({ title: 'Inject Memory' }),
        new ModalBody({
          children: [
            new Section({
              className: 'mb-3', children: [
                new SmallText({ text: 'Content', className: 'd-block fw-bold mb-1' }),
                new FormControl({
                  type: 'textarea',
                  className: 'form-control',
                  rows: 5,
                  placeholder: 'Enter memory content...',
                  onInput: (e: Event) => BrokerDOM.getStateService().set('ui.memory.injectContent', (e.target as HTMLTextAreaElement).value),
                }),
              ]
            }),
            new Section({
              className: 'mb-3', children: [
                new SmallText({ text: 'Tags (comma-separated)', className: 'd-block fw-bold mb-1' }),
                new FormControl({
                  type: 'text',
                  className: 'form-control',
                  placeholder: 'e.g. architecture, pattern, debug',
                  onInput: (e: Event) => BrokerDOM.getStateService().set('ui.memory.injectTags', (e.target as HTMLInputElement).value),
                }),
              ]
            }),
          ],
        }),
        new ModalFooter({
          children: [
            new Button({
              text: 'Cancel',
              className: 'btn btn-secondary',
              onClick: () => BrokerDOM.getStateService().set('ui.memory.showInject', false),
            }),
            new Button({
              text: 'Store',
              className: 'btn btn-success',
              onClick: () => this.submitInjectMemory(),
            }),
          ],
        }),
      ],
    });
  }

  // ── Data Operations ─────────────────────────────────────────
  private async refreshMemories(): Promise<void> {
    try {
      const result = await BrokerDOM.getBroker().call<QueryMemoryResult>(
        'sys.int.chroma.list_all', {}, { timeout: 10000 }
      );
      BrokerDOM.getStateService().set('memory.list', result.results);
    } catch {
      BrokerDOM.getStateService().set('memory.list', []);
    }
  }

  private async searchMemories(): Promise<void> {
    const query = BrokerDOM.getStateService().getValue<string>('ui.memory.searchQuery') || '';
    if (!query.trim()) {
      await this.refreshMemories();
      return;
    }
    try {
      const result = await BrokerDOM.getBroker().call<QueryMemoryResult>(
        'sys.int.chroma.query_memory', { query, limit: 20 }, { timeout: 10000 }
      );
      BrokerDOM.getStateService().set('memory.list', result.results);
    } catch {
      // leave current state
    }
  }

  private async submitInjectMemory(): Promise<void> {
    const state = BrokerDOM.getStateService();
    const content = state.getValue<string>('ui.memory.injectContent') || '';
    const tagsStr = state.getValue<string>('ui.memory.injectTags') || '';

    if (!content.trim()) return;

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    try {
      await BrokerDOM.getBroker().call('sys.int.chroma.store_memory', {
        content,
        metadata: { tags, source: 'operator', createdAt: Date.now() },
      }, { timeout: 10000 });
    } catch (err) {
      console.error('[MemoryExplorer] Inject failed:', err);
    }

    state.set('ui.memory.showInject', false);
    state.set('ui.memory.injectContent', '');
    state.set('ui.memory.injectTags', '');
    await this.refreshMemories();
  }

  private async deleteMemory(id: string): Promise<void> {
    try {
      await BrokerDOM.getBroker().call('sys.int.chroma.delete_memory', { id }, { timeout: 10000 });
    } catch (err) {
      console.error('[MemoryExplorer] Delete failed:', err);
    }
    await this.refreshMemories();
  }

  // ── Build ──────────────────────────────────────────────────
  build(): ComponentChild[] {
    const memories = BrokerDOM.getStateService().getValue<MemoryEntry[]>('memory.list') || [];
    const expandedId = BrokerDOM.getStateService().getValue<string>('ui.memory.expandedId');

    return [
      // Header
      new Section({
        className: 'd-flex justify-content-between align-items-center mb-4',
        children: [
          new Section({ tag: 'h2', className: 'text-dark mb-0', children: 'Vector Memory Explorer' }),
        ],
      }),
      // Search Bar
      new Card({
        className: 'mb-4 shadow-sm',
        children: [
          new CardBody({
            children: [
              new Section({
                className: 'd-flex gap-2',
                children: [
                  new FormControl({
                    type: 'text',
                    className: 'form-control',
                    placeholder: 'Search memories by keyword...',
                    onInput: (e: Event) => BrokerDOM.getStateService().set('ui.memory.searchQuery', (e.target as HTMLInputElement).value),
                    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') this.searchMemories(); },
                  }),
                  new Button({
                    text: 'Search',
                    className: 'btn btn-primary',
                    onClick: () => this.searchMemories(),
                  }),
                  new Button({
                    text: 'Reset',
                    className: 'btn btn-outline-secondary',
                    onClick: () => this.refreshMemories(),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Results Table
      new Card({
        className: 'shadow-sm',
        children: [
          new CardHeader({
            children: [
              new Section({
                className: 'd-flex justify-content-between align-items-center',
                children: [
                  new SmallText({ text: `${memories.length} memories`, className: 'fw-bold' }),
                ],
              }),
            ],
          }),
          new CardBody({
            className: 'p-0',
            children: memories.length === 0
              ? [new Section({ className: 'p-4 text-center text-muted', children: 'No memories stored yet. Use "Inject Memory" to add entries.' })]
              : [
                new Table({
                  className: 'table table-hover table-sm mb-0',
                  children: [
                    new TableHead({
                      children: [
                        new TableRow({
                          children: [
                            new TableCell({ tag: 'th', children: 'Score' }),
                            new TableCell({ tag: 'th', children: 'Content' }),
                            new TableCell({ tag: 'th', children: 'Tags' }),
                            new TableCell({ tag: 'th', children: 'Created' }),
                            new TableCell({ tag: 'th', children: 'Actions' }),
                          ],
                        }),
                      ],
                    }),
                    new TableBody({
                      children: memories.flatMap(m => {
                        const rows: ComponentChild[] = [
                          new TableRow({
                            className: 'cursor-pointer' + (expandedId === m.id ? ' table-active' : ''),
                            onClick: () => {
                              const current = BrokerDOM.getStateService().getValue<string>('ui.memory.expandedId');
                              BrokerDOM.getStateService().set('ui.memory.expandedId', current === m.id ? null : m.id);
                            },
                            children: [
                              new TableCell({
                                children: m.similarityScore != null
                                  ? new Badge({ text: `${(m.similarityScore * 100).toFixed(0)}%`, className: 'bg-info' })
                                  : new SmallText({ text: '—', className: 'text-muted' }),
                              }),
                              new TableCell({
                                children: m.content.length > 80 ? m.content.slice(0, 80) + '…' : m.content,
                              }),
                              new TableCell({
                                children: (m.metadata?.tags as string[] || []).map(
                                  (t: string) => new Badge({ text: t, className: 'bg-secondary me-1' })
                                ),
                              }),
                              new TableCell({
                                children: m.metadata?.createdAt
                                  ? new Date(m.metadata.createdAt as number).toLocaleString()
                                  : '—',
                              }),
                              new TableCell({
                                children: [
                                  new Button({
                                    text: '×',
                                    className: 'btn btn-sm btn-outline-danger',
                                    onClick: (e: Event) => { e.stopPropagation(); this.deleteMemory(m.id); },
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ];

                        // Expanded audit view
                        if (expandedId === m.id) {
                          rows.push(
                            new TableRow({
                              children: [
                                new TableCell({
                                  colSpan: 5,
                                  className: 'bg-light p-3',
                                  children: [
                                    new SmallText({ text: 'Full Content:', className: 'fw-bold d-block mb-1' }),
                                    new Section({
                                      tag: 'pre',
                                      className: 'bg-dark text-white p-2 rounded small',
                                      style: { maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap' },
                                      children: m.content,
                                    }),
                                    new SmallText({ text: 'Metadata:', className: 'fw-bold d-block mt-2 mb-1' }),
                                    new Section({
                                      tag: 'pre',
                                      className: 'bg-dark text-white p-2 rounded small',
                                      style: { maxHeight: '100px', overflow: 'auto' },
                                      children: JSON.stringify(m.metadata, null, 2),
                                    }),
                                  ],
                                }),
                              ],
                            })
                          );
                        }
                        return rows;
                      }),
                    }),
                  ],
                }),
              ],
          }),
        ],
      }),
      // Inject Modal
      this.injectMemoryModal(),
    ];
  }
}
