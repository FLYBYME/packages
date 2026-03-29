import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardHeader, CardBody, Heading, SmallText,
  Section, Badge, DataTable, Button, Modal, ModalHeader, ModalTitle, ModalBody, FormLabel, FormControl, ModalFooter, Row, Col, FormSelect
} from '@flybyme/isomorphic-ui';
import { Artifact, FSMNode, Edge } from '../../domains/sys.artifacts/artifacts.schema';
import {
  ArtifactBuilderManifestState,
  ArtifactRegisterPayload,
  ArtifactRegisterPayloadSchema,
  ArtifactBuilderState,
} from '../ui.schema';
import { JSONObject } from '../../shared/json.schema';

class MutableBox extends Section {
  public updateChildren(children: ComponentChild[]): void {
    this.setProps({ children });
  }
}

export class ArtifactsPage extends BrokerPage {
  private createModal!: Modal;
  private builderContainer!: MutableBox; // A stable container that won't destroy the modal when updated

  public getSEO() { return { defaultTitle: 'Artifacts Registry' }; }
  public getPageConfig() { return { title: 'Artifacts' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4 h-100 d-flex flex-column' });
    this.initStableModal();
  }

  public async onEnter(): Promise<void> {
    this.refresh();
  }

  private async refresh() {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();
    try {
      const artifacts = await broker.call<Artifact[]>('sys.artifacts.find', {});
      state.set('artifacts.list', artifacts);
    } catch (err) {
      this.logger.error('Failed to load artifacts', err);
    }
  }

  private initBuilderState() {
    const state = BrokerDOM.getStateService();
    state.set('ui.builder.editingId', null);
    state.set('ui.builder.createdAt', undefined);
    state.set('ui.builder.activeTab', 'general');
    state.set('ui.builder.type', 'protocol');
    state.set('ui.builder.name', '');
    state.set('ui.builder.description', '');
    state.set('ui.builder.version', '1.0.0');
    state.set('ui.builder.author', 'operator');
    state.set('ui.builder.tags', 'core, custom');

    state.set('ui.builder.schemaStr', '{\n  "type": "object",\n  "properties": {}\n}');
    state.set('ui.builder.manifest', {
      initialNodeId: '',
      sharedMemorySchemaStr: '{\n  "objective": "string"\n}',
      circuitBreakers: { maxTransitions: 50, globalTimeoutMs: 1800000 },
      nodes: [],
      edges: []
    } satisfies ArtifactBuilderManifestState);

    state.set('ui.builder.rawJson', '');
  }

  // ==========================================================================
  // STABLE MODAL INITIALIZATION (Fixes the Tab Closing Bug)
  // ==========================================================================
  private initStableModal() {
    // This container is stable, but its interior children will be updated during build()
    this.builderContainer = new MutableBox({ id: 'artifact-builder-container', children: [] });

    this.createModal = new Modal({
      id: 'createArtifactModal',
      size: 'xl',
      children: [
        new ModalHeader({
          onClose: () => this.createModal?.hide(),
          children: new ModalTitle({ text: 'Artifact Forge (Builder)' })
        }),
        new ModalBody({
          className: 'bg-light',
          children: [this.builderContainer]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createModal?.hide() }),
            new Button({ variant: 'primary', text: 'Save Artifact', onClick: () => this.submitArtifact() })
          ]
        })
      ]
    });
  }

  private editArtifact(artifact: Artifact) {
    const state = BrokerDOM.getStateService();
    state.set('ui.builder.editingId', artifact.id);
    state.set('ui.builder.createdAt', artifact.metadata?.createdAt);
    state.set('ui.builder.activeTab', 'general');
    state.set('ui.builder.type', artifact.type);
    state.set('ui.builder.name', artifact.name);
    state.set('ui.builder.description', artifact.description);
    state.set('ui.builder.version', artifact.metadata?.version || '1.0.0');
    state.set('ui.builder.author', artifact.metadata?.author || 'operator');
    state.set('ui.builder.tags', (artifact.metadata?.tags || []).join(', '));

    if (artifact.type === 'protocol' && artifact.manifest) {
      state.set('ui.builder.manifest', {
        initialNodeId: artifact.manifest.initialNodeId,
        sharedMemorySchemaStr: JSON.stringify(artifact.manifest.sharedMemorySchema || {}, null, 2),
        circuitBreakers: artifact.manifest.circuitBreakers,
        nodes: structuredClone(artifact.manifest.nodes || []),
        edges: structuredClone(artifact.manifest.edges || [])
      });
      state.set('ui.builder.schemaStr', '{\n  "type": "object",\n  "properties": {}\n}');
    } else if (artifact.type === 'capability') {
      state.set('ui.builder.schemaStr', JSON.stringify(artifact.schema || {}, null, 2));
    }

    state.set('ui.builder.rawJson', JSON.stringify(artifact, null, 2));
    this.createModal?.show();
  }

  private async deleteArtifact(id: string) {
    if (!confirm(`Are you sure you want to delete artifact ${id}? This may break dependent personas.`)) return;
    try {
      await BrokerDOM.getBroker().call('sys.artifacts.remove', { id });
      this.refresh();
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  }

  private buildTabsNav(): ComponentChild {
    const state = BrokerDOM.getStateService();
    const builder = this.getBuilderState(state);
    const activeTab = builder.activeTab;
    const type = builder.type;

    const tabs = [
      { id: 'general', label: 'General Info' },
      ...(type === 'protocol' ? [
        { id: 'nodes', label: `Nodes (${builder.manifest.nodes.length})` },
        { id: 'edges', label: `Edges (${builder.manifest.edges.length})` }
      ] : []),
      { id: 'raw', label: 'Raw JSON (Advanced)' }
    ];

    return new Section({
      className: 'nav nav-tabs',
      children: tabs.map(tab => new Section({
        className: 'nav-item cursor-pointer',
        children: new Section({
          className: `nav-link ${activeTab === tab.id ? 'active fw-bold' : 'text-muted'}`,
          text: tab.label,
          onClick: (e: Event) => {
            e.preventDefault(); // Prevent bubbling that might trigger modal close
            e.stopPropagation();
            BrokerDOM.getStateService().set('ui.builder.activeTab', tab.id);
          }
        })
      }))
    });
  }

  private buildTabContent(): ComponentChild {
    const activeTab = this.getBuilderState(BrokerDOM.getStateService()).activeTab;

    switch (activeTab) {
      case 'general': return this.buildGeneralTab();
      case 'nodes': return this.buildNodesTab();
      case 'edges': return this.buildEdgesTab();
      case 'raw': return this.buildRawTab();
      default: return new Section({});
    }
  }

  // --- General Tab ---
  private buildGeneralTab(): ComponentChild {
    const type = this.getBuilderState(BrokerDOM.getStateService()).type;

    return new Row({
      children: [
        new Col({
          span: 8, children: [
            new Row({
              children: [
                new Col({
                  span: 6, children: [
                    new FormLabel({ text: 'Artifact Type' }),
                    new FormSelect({
                      value: '$state.ui.builder.type',
                      onChange: (e: Event) => BrokerDOM.getStateService().set('ui.builder.type', (e.target as HTMLSelectElement).value),
                      children: [
                        new Section({ tagName: 'option', value: 'protocol', text: 'Protocol (FSM Workflow)' }),
                        new Section({ tagName: 'option', value: 'capability', text: 'Capability (Atomic Tool)' })
                      ]
                    })
                  ]
                }),
                new Col({
                  span: 6, children: [
                    new FormLabel({ text: 'Artifact Name' }),
                    new FormControl({
                      type: 'text',
                      placeholder: 'e.g. secure_audit_loop',
                      value: '$state.ui.builder.name',
                      onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.name', (e.target as HTMLInputElement).value)
                    })
                  ]
                })
              ]
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Description' }),
            new FormControl({
              type: 'textarea', rows: 3, placeholder: 'What does this artifact do?', value: '$state.ui.builder.description',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.description', (e.target as HTMLTextAreaElement).value)
            }),

            type === 'capability' ? new Section({
              className: 'mt-3', children: [
                new FormLabel({ text: 'Capability Input Schema (JSON)' }),
                new FormControl({
                  type: 'textarea', rows: 8, className: 'font-monospace small', value: '$state.ui.builder.schemaStr',
                  onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.schemaStr', (e.target as HTMLTextAreaElement).value)
                })
              ]
            }) : new Section({
              className: 'mt-3', children: [
                new Row({
                  children: [
                    new Col({
                      span: 6, children: [
                        new FormLabel({ text: 'Initial Node ID' }),
                        new FormControl({
                          type: 'text', placeholder: 'e.g. INVESTIGATE', value: '$state.ui.builder.manifest.initialNodeId',
                          onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.manifest.initialNodeId', (e.target as HTMLInputElement).value)
                        })
                      ]
                    }),
                    new Col({
                      span: 3, children: [
                        new FormLabel({ text: 'Max Transitions' }),
                        new FormControl({
                          type: 'number', value: '$state.ui.builder.manifest.circuitBreakers.maxTransitions',
                          onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.manifest.circuitBreakers.maxTransitions', Number((e.target as HTMLInputElement).value))
                        })
                      ]
                    }),
                    new Col({
                      span: 3, children: [
                        new FormLabel({ text: 'Timeout (ms)' }),
                        new FormControl({
                          type: 'number', value: '$state.ui.builder.manifest.circuitBreakers.globalTimeoutMs',
                          onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.manifest.circuitBreakers.globalTimeoutMs', Number((e.target as HTMLInputElement).value))
                        })
                      ]
                    })
                  ]
                }),
                new Section({ className: 'mt-3' }),
                new FormLabel({ text: 'Shared Memory Schema (JSON)' }),
                new FormControl({
                  type: 'textarea', rows: 6, className: 'font-monospace small', value: '$state.ui.builder.manifest.sharedMemorySchemaStr',
                  onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.manifest.sharedMemorySchemaStr', (e.target as HTMLTextAreaElement).value)
                })
              ]
            })

          ]
        }),
        new Col({
          span: 4, children: [
            new Card({
              children: [
                new CardHeader({ children: new Heading(6, { text: 'Metadata', className: 'mb-0' }) }),
                new CardBody({
                  children: [
                    new FormLabel({ text: 'Version' }),
                    new FormControl({ type: 'text', value: '$state.ui.builder.version', onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.version', (e.target as HTMLInputElement).value) }),
                    new Section({ className: 'mt-2' }),
                    new FormLabel({ text: 'Author' }),
                    new FormControl({ type: 'text', value: '$state.ui.builder.author', onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.author', (e.target as HTMLInputElement).value) }),
                    new Section({ className: 'mt-2' }),
                    new FormLabel({ text: 'Tags (comma separated)' }),
                    new FormControl({ type: 'text', value: '$state.ui.builder.tags', onInput: (e: Event) => BrokerDOM.getStateService().set('ui.builder.tags', (e.target as HTMLInputElement).value) })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
  }

  // --- Nodes Tab ---
  private buildNodesTab(): ComponentChild {
    const nodes = this.getBuilderState(BrokerDOM.getStateService()).manifest.nodes;

    return new Section({
      children: [
        new Section({
          className: 'd-flex gap-2 mb-3', children: [
            new Button({ type: 'button', size: 'sm', variant: 'primary', text: '+ Add Persona Node', onClick: (e: Event) => { e.preventDefault(); this.addNode('persona'); } }),
            new Button({ type: 'button', size: 'sm', variant: 'warning', text: '+ Add Gate Node', onClick: (e: Event) => { e.preventDefault(); this.addNode('gate'); } }),
            new Button({ type: 'button', size: 'sm', variant: 'success', text: '+ Add Terminal Node', onClick: (e: Event) => { e.preventDefault(); this.addNode('terminal'); } })
          ]
        }),
        new Section({ className: 'd-flex flex-column gap-3', children: nodes.map((node, i) => this.buildNodeCard(node, i)) })
      ]
    });
  }

  private addNode(type: 'persona' | 'gate' | 'terminal') {
    const s = BrokerDOM.getStateService();
    const nodes = s.getValue<FSMNode[]>('ui.builder.manifest.nodes') || [];
    const newNode = this.createDefaultNode(type, nodes.length + 1);
    s.set('ui.builder.manifest.nodes', [...nodes, newNode]);
  }

  private updateNode(index: number, node: FSMNode) {
    const s = BrokerDOM.getStateService();
    const nodes = s.getValue<FSMNode[]>('ui.builder.manifest.nodes') || [];
    s.set('ui.builder.manifest.nodes', nodes.map((currentNode, currentIndex) => currentIndex === index ? node : currentNode));
  }

  private buildNodeCard(node: FSMNode, index: number): ComponentChild {
    const headerColor = node.type === 'persona' ? 'bg-primary text-white' : node.type === 'gate' ? 'bg-warning text-dark' : 'bg-success text-white';

    return new Card({
      children: [
        new CardHeader({
          className: `d-flex justify-content-between align-items-center ${headerColor}`, children: [
            new Section({
              children: [
                new Badge({ variant: 'light', className: 'text-dark me-2', text: node.type.toUpperCase() }),
                new Section({ tag: 'span', className: 'fw-bold', text: node.nodeId })
              ]
            }),
            new Button({
              type: 'button', size: 'sm', variant: 'outline-light', text: 'Remove', onClick: (e: Event) => {
                e.preventDefault();
                const s = BrokerDOM.getStateService();
                const nodes = s.getValue<FSMNode[]>('ui.builder.manifest.nodes') || [];
                s.set('ui.builder.manifest.nodes', nodes.filter((_, i) => i !== index));
              }
            })
          ]
        }),
        new CardBody({
          children: [
            new Row({
              children: [
                new Col({
                  span: 4, children: [
                    new FormLabel({ text: 'Node ID' }),
                    new FormControl({ type: 'text', value: node.nodeId, onInput: (e: Event) => this.updateNode(index, { ...node, nodeId: (e.target as HTMLInputElement).value }) })
                  ]
                }),
                ...(node.type === 'persona' ? [
                  new Col({
                    span: 4, children: [
                      new FormLabel({ text: 'Persona ID' }),
                      new FormControl({ type: 'text', value: node.personaId, onInput: (e: Event) => this.updateNode(index, { ...node, personaId: (e.target as HTMLInputElement).value }) })
                    ]
                  }),
                  new Col({
                    span: 12, className: 'mt-2', children: [
                      new FormLabel({ text: 'Node Objective' }),
                      new FormControl({ type: 'textarea', rows: 2, value: node.nodeObjective, onInput: (e: Event) => this.updateNode(index, { ...node, nodeObjective: (e.target as HTMLTextAreaElement).value }) })
                    ]
                  })
                ] : []),
                ...(node.type === 'gate' ? [
                  new Col({
                    span: 4, children: [
                      new FormLabel({ text: 'Evaluator Type' }),
                      new FormSelect({
                        value: node.evaluatorType, onChange: (e: Event) => this.updateNode(index, { ...node, evaluatorType: (e.target as HTMLSelectElement).value as typeof node.evaluatorType }),
                        children: [new Section({ tagName: 'option', value: 'static_logic', text: 'Static Logic' }), new Section({ tagName: 'option', value: 'judge_persona', text: 'Judge Persona' })]
                      })
                    ]
                  }),
                  new Col({
                    span: 4, children: [
                      new FormLabel({ text: 'Context Path' }),
                      new FormControl({ type: 'text', value: node.contextPath, onInput: (e: Event) => this.updateNode(index, { ...node, contextPath: (e.target as HTMLInputElement).value }) })
                    ]
                  })
                ] : []),
                ...(node.type === 'terminal' ? [
                  new Col({
                    span: 4, children: [
                      new FormLabel({ text: 'Resolution' }),
                      new FormSelect({
                        value: node.resolution, onChange: (e: Event) => this.updateNode(index, { ...node, resolution: (e.target as HTMLSelectElement).value as typeof node.resolution }),
                        children: [new Section({ tagName: 'option', value: 'SUCCESS', text: 'SUCCESS' }), new Section({ tagName: 'option', value: 'FAILURE', text: 'FAILURE' })]
                      })
                    ]
                  }),
                  new Col({
                    span: 12, className: 'mt-2', children: [
                      new FormLabel({ text: 'Output Template' }),
                      new FormControl({ type: 'text', value: node.outputTemplate, onInput: (e: Event) => this.updateNode(index, { ...node, outputTemplate: (e.target as HTMLInputElement).value }) })
                    ]
                  })
                ] : [])
              ]
            })
          ]
        })
      ]
    });
  }

  // --- Edges Tab ---
  private buildEdgesTab(): ComponentChild {
    const edges = this.getBuilderState(BrokerDOM.getStateService()).manifest.edges;

    return new Section({
      children: [
        new Section({
          className: 'd-flex gap-2 mb-3', children: [
            new Button({
              type: 'button', size: 'sm', variant: 'primary', text: '+ Add Edge', onClick: (e: Event) => {
                e.preventDefault();
                const s = BrokerDOM.getStateService();
                const currentEdges = s.getValue<Edge[]>('ui.builder.manifest.edges') || [];
                s.set('ui.builder.manifest.edges', [...currentEdges, { fromNode: '', toNode: '', trigger: 'DONE' }]);
              }
            }),
          ]
        }),
        new Section({ className: 'd-flex flex-column gap-2', children: edges.map((edge, i) => this.buildEdgeRow(edge, i)) })
      ]
    });
  }

  private updateEdge(index: number, key: string, value: string) {
    const s = BrokerDOM.getStateService();
    const edges = s.getValue<Edge[]>('ui.builder.manifest.edges') || [];
    s.set('ui.builder.manifest.edges', edges.map((edge, edgeIndex) => edgeIndex === index ? { ...edge, [key]: value } : edge));
  }

  private buildEdgeRow(edge: Edge, index: number): ComponentChild {
    return new Card({
      className: 'p-2', children: new Row({
        alignItems: 'end', children: [
          new Col({
            span: 3, children: [
              new FormLabel({ text: 'From Node' }),
              new FormControl({ type: 'text', value: edge.fromNode, onInput: (e: Event) => this.updateEdge(index, 'fromNode', (e.target as HTMLInputElement).value) })
            ]
          }),
          new Col({
            span: 3, children: [
              new FormLabel({ text: 'Trigger (Verdict)' }),
              new FormControl({ type: 'text', value: edge.trigger, onInput: (e: Event) => this.updateEdge(index, 'trigger', (e.target as HTMLInputElement).value) })
            ]
          }),
          new Col({ span: 1, className: 'text-center pb-2 text-muted', children: '➔' }),
          new Col({
            span: 3, children: [
              new FormLabel({ text: 'To Node' }),
              new FormControl({ type: 'text', value: edge.toNode, onInput: (e: Event) => this.updateEdge(index, 'toNode', (e.target as HTMLInputElement).value) })
            ]
          }),
          new Col({
            span: 2, className: 'text-end', children: [
              new Button({
                type: 'button', variant: 'outline-danger', text: '🗑', onClick: (e: Event) => {
                  e.preventDefault();
                  const s = BrokerDOM.getStateService();
                  const edges = s.getValue<Edge[]>('ui.builder.manifest.edges') || [];
                  s.set('ui.builder.manifest.edges', edges.filter((_, i) => i !== index));
                }
              })
            ]
          })
        ]
      })
    });
  }

  // --- Raw Tab ---
  private buildRawTab(): ComponentChild {
    return new Section({
      children: [
        new SmallText({ text: 'Paste an entire JSON payload matching RegisterArtifactParamsSchema to override the builder.', className: 'text-muted d-block mb-2' }),
        new FormControl({
          tag: 'textarea', id: 'artifactJson', value: '$state.ui.builder.rawJson',
          onChange: (e: Event) => BrokerDOM.getStateService().set('ui.builder.rawJson', (e.target as HTMLTextAreaElement).value),
          style: { height: '400px', fontFamily: 'monospace' }
        })
      ]
    });
  }

  // --- Submission ---
  private async submitArtifact() {
    const state = BrokerDOM.getStateService();
    const builder = this.getBuilderState(state);

    let payload: ArtifactRegisterPayload;

    if (builder.rawJson && builder.rawJson.trim().length > 0 && builder.activeTab === 'raw') {
      let parsedPayload: JSONObject;
      try {
        const rawPayload = JSON.parse(builder.rawJson);
        if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
          alert('Raw artifact payload must be a JSON object.');
          return;
        }
        parsedPayload = rawPayload;
      } catch {
        alert('Invalid JSON in Raw tab.');
        return;
      }
      const parsed = ArtifactRegisterPayloadSchema.safeParse(parsedPayload);
      if (!parsed.success) {
        alert('Raw artifact payload does not match the artifact schema.');
        return;
      }
      payload = parsed.data;
    } else {
      payload = {
        name: builder.name,
        type: builder.type,
        description: builder.description,
        metadata: {
          version: builder.version,
          author: builder.author,
          tags: builder.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          // vvv Add this conditional spread vvv
          ...(builder.createdAt ? { createdAt: builder.createdAt } : {})
        }
      };

      if (builder.type === 'protocol') {
        let parsedMemSchema: JSONObject = {};
        try { parsedMemSchema = JSON.parse(builder.manifest.sharedMemorySchemaStr); }
        catch { alert('Invalid JSON in Shared Memory Schema'); return; }

        payload.manifest = {
          initialNodeId: builder.manifest.initialNodeId,
          sharedMemorySchema: parsedMemSchema,
          circuitBreakers: builder.manifest.circuitBreakers,
          nodes: builder.manifest.nodes,
          edges: builder.manifest.edges
        };
      } else {
        try { payload.schema = JSON.parse(builder.schemaStr); }
        catch { alert('Invalid JSON in Input Schema'); return; }
      }
    }

    try {
      if (builder.editingId) {
        await BrokerDOM.getBroker().call('sys.artifacts.update', { id: builder.editingId, ...payload });
      } else {
        await BrokerDOM.getBroker().call('sys.artifacts.register', payload);
      }
      this.createModal?.hide();
      this.refresh();
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    }
  }

  // ==========================================================================
  // RENDER LIFECYCLE
  // ==========================================================================
  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const artifacts = state.getValue<Artifact[]>('artifacts.list') || [];

    // Dynamically inject updated UI into the stable container
    const newContent = [
      this.buildTabsNav(),
      new Section({
        className: 'p-3 bg-white border border-top-0', children: [
          this.buildTabContent()
        ]
      })
    ];

    // Safely update children on the stable VDOM container
    this.builderContainer.updateChildren(newContent);

    return [
      new Section({
        className: 'd-flex justify-content-between align-items-center mb-4',
        children: [
          new Heading(4, { text: 'Artifacts Registry' }),
          new Button({
            variant: 'primary',
            text: '+ Forge Artifact',
            onClick: () => {
              this.initBuilderState();
              this.createModal?.show();
            }
          })
        ]
      }),
      new Card({
        className: 'flex-grow-1 border-0 shadow-sm overflow-hidden',
        children: [
          new CardBody({
            className: 'p-0',
            children: new DataTable<Artifact>({
              columns: [
                { key: 'id', label: 'ID', render: (row: Artifact) => new Section({ tag: 'code', children: row.id.slice(0, 16) + '...' }) },
                { key: 'type', label: 'Type', render: (row: Artifact) => new Badge({ text: row.type.toUpperCase(), variant: row.type === 'protocol' ? 'primary' : 'secondary' }) },
                { key: 'name', label: 'Name', render: (row: Artifact) => new Section({ className: 'fw-bold', children: row.name }) },
                { key: 'version', label: 'Version', render: (row: Artifact) => new SmallText({ text: `v${row.metadata?.version || '1.0'}` }) },
                { key: 'description', label: 'Description', render: (row: Artifact) => new SmallText({ text: row.description.slice(0, 50) + (row.description.length > 50 ? '...' : ''), className: 'text-muted' }) },
                {
                  key: 'actions', label: 'Actions', render: (row: Artifact) => new Section({
                    className: 'd-flex gap-1',
                    children: [
                      new Button({ size: 'sm', variant: 'outline-primary', text: 'Edit', onClick: () => this.editArtifact(row) }),
                      new Button({ size: 'sm', variant: 'outline-danger', text: 'Delete', onClick: () => this.deleteArtifact(row.id) }),
                      new Button({
                        size: 'sm', variant: 'outline-secondary', text: 'Source',
                        onClick: () => {
                          const win = window.open('', '_blank');
                          win?.document.write(`<pre style="background:#1e1e1e; color:#d4d4d4; padding:20px;">${JSON.stringify(row, null, 2)}</pre>`);
                        }
                      })
                    ]
                  })
                }
              ],
              data: artifacts
            })
          })
        ]
      }),
      // Return the stable modal instance instead of creating a new one
      this.createModal
    ];
  }

  private getBuilderState(state = BrokerDOM.getStateService()): ArtifactBuilderState {
    return state.getValue<ArtifactBuilderState>('ui.builder') || {
      editingId: null,
      activeTab: 'general',
      type: 'protocol',
      name: '',
      description: '',
      version: '1.0.0',
      author: 'operator',
      tags: '',
      schemaStr: '',
      manifest: {
        initialNodeId: '',
        sharedMemorySchemaStr: '',
        circuitBreakers: { maxTransitions: 50, globalTimeoutMs: 1800000 },
        nodes: [],
        edges: [],
      },
      rawJson: '',
    };
  }

  private createDefaultNode(type: 'persona' | 'gate' | 'terminal', index: number): FSMNode {
    const nodeId = `node_${index}`;
    if (type === 'persona') {
      return {
        type,
        nodeId,
        personaId: 'ralph_core',
        nodeObjective: 'Progress the task.',
        capabilityWhitelist: [],
        inputMapping: {},
        outputMapping: {},
      };
    }
    if (type === 'gate') {
      return {
        type,
        nodeId,
        evaluatorType: 'static_logic',
        contextPath: 'status',
        inputMapping: {},
        outputMapping: {},
      };
    }
    return {
      type,
      nodeId,
      resolution: 'SUCCESS',
      outputTemplate: 'Task completed.',
    };
  }
}
