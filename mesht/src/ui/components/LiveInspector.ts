// FILE: src/ui/components/LiveInspector.ts
import {
  BrokerComponent, ComponentChild, BrokerDOM,
  Box, Heading, SmallText,
  Button, IBaseUIProps
} from '@flybyme/isomorphic-ui';

import {
  Artifact, FSMManifest
} from '../../domains/sys.artifacts/artifacts.schema';
import { Directive } from '../../domains/sys.directives/directives.schema';
import {
  CognitionLog,
  DispatcherCognitionFinishedEventSchema,
  DispatcherCognitionStartedEventSchema,
  DispatcherToolCalledEventSchema,
} from '../../domains/sys.dispatcher/dispatcher.schema';
import { GitflowTab } from './GitflowTab';
import { InspectorLogEntry } from '../ui.schema';
import { z } from 'zod';

/**
 * LiveInspector — Real-time FSM & Terminal side-panel with SVG X-Ray.
 * Listens for mesh events and updates the visual trace of an active directive.
 */
export class LiveInspector extends BrokerComponent {
  private unsubscribe: (() => void)[] = [];
  private activeID: string = '';
  private readonly directiveBinding: string;

  constructor(props: IBaseUIProps & { directiveID: string } = { directiveID: '' }) {
    super('div', {
      className: 'h-100 d-flex flex-column ' + (props.className || ''),
      ...props
    });
    this.directiveBinding = props.directiveID;
  }

  override async onMount(): Promise<void> {
    super.onMount();
    
    // Resolve directiveID if it is a state binding
    const rawID = this.directiveBinding;
    if (typeof rawID === 'string' && rawID.startsWith('$state.')) {
      const path = rawID.replace('$state.', '');
      BrokerDOM.getStateService().subscribe(path, (newID) => {
        if (typeof newID === 'string' && newID.length > 0) this.refresh(newID);
      });
      const currentID = BrokerDOM.getStateService().getValue<string>(path);
      if (currentID) this.refresh(currentID);
    } else if (rawID) {
      this.refresh(rawID);
    }

    // Default tab
    if (!BrokerDOM.getStateService().getValue('ui.inspector.activeTab')) {
      BrokerDOM.getStateService().set('ui.inspector.activeTab', 'fsm');
    }
  }

  private async refresh(id: string) {
    this.activeID = id;
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    // Clean up previous subs
    this.unsubscribe.forEach(u => u());
    this.unsubscribe = [];

    // 1. Initial Data Fetch
    try {
      const directive = await broker.call<Directive>('sys.directives.get', { id });
      state.set(`ui.inspector.${id}.currentNode`, directive.currentNode);
      
      const artifact = await broker.call<Artifact>('sys.artifacts.get', { id: directive.artifactId });
      if (artifact.manifest) {
        state.set(`ui.inspector.${id}.manifest`, artifact.manifest);
      }

      // Fetch past cognition logs
      try {
        const history = await broker.call<CognitionLog[]>('sys.dispatcher.cognition_history', { id, limit: 100 });
        const pastLogs: InspectorLogEntry[] = [];
        history.sort((a, b) => a.createdAt - b.createdAt).forEach(log => {
          pastLogs.push({ type: 'thought', content: `Thinking: ${log.objective}...`, timestamp: log.createdAt - log.latencyMs });
          if (log.response) {
            pastLogs.push({ type: 'verdict', content: `Verdict: ${log.verdict}`, timestamp: log.createdAt });
            pastLogs.push({ type: 'thought', content: log.response, timestamp: log.createdAt });
          }
        });
        state.set(`ui.inspector.${id}.logs`, pastLogs);
      } catch (err) {
        console.warn('[Inspector] No past cognition history found', err);
      }

      this.update();
    } catch (err) {
      console.error('[Inspector] Failed to fetch initial state:', err);
    }

    // 2. Event Subscriptions
    this.unsubscribe.push(broker.on('sys.dispatcher.cognition_started', (data: z.infer<typeof DispatcherCognitionStartedEventSchema>) => {
      if (data.id !== id) return;
      this.appendLog('thought', `Thinking: ${data.objective}...`, data.timestamp);
    }));

    this.unsubscribe.push(broker.on('sys.dispatcher.tool_called', (data: z.infer<typeof DispatcherToolCalledEventSchema>) => {
      if (data.id !== id) return;
      this.appendLog('tool', `Tool: ${data.toolName}(${JSON.stringify(data.arguments)})`, data.timestamp);
    }));

    this.unsubscribe.push(broker.on('sys.dispatcher.cognition_finished', (data: z.infer<typeof DispatcherCognitionFinishedEventSchema>) => {
      if (data.id !== id) return;
      this.appendLog('verdict', `Verdict: ${data.verdict}`, data.timestamp);
      this.appendLog('thought', data.response, data.timestamp);
    }));

    this.unsubscribe.push(broker.on('sys.directives.step_completed', (data: { id: string; toNode: string }) => {
      if (data.id !== id) return;
      state.set(`ui.inspector.${id}.currentNode`, data.toNode);
      this.update();
    }));
  }

  override dispose(): void {
    this.unsubscribe.forEach(u => u());
    super.dispose();
  }

  private appendLog(type: 'thought' | 'tool' | 'verdict', content: string, timestamp: number) {
    const state = BrokerDOM.getStateService();
    const id = this.activeID;
    if (!id) return;
    const logs = state.getValue<InspectorLogEntry[]>(`ui.inspector.${id}.logs`) || [];
    logs.push({ type, content, timestamp });
    state.set(`ui.inspector.${id}.logs`, [...logs]);
    this.update();
  }

  build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const id = this.activeID;
    if (!id) return [];

    const activeTab = state.getValue<string>('ui.inspector.activeTab') || 'fsm';
    const logs = state.getValue<InspectorLogEntry[]>(`ui.inspector.${id}.logs`) || [];
    const currentNode = state.getValue<string>(`ui.inspector.${id}.currentNode`) || 'unknown';
    const manifest = state.getValue<FSMManifest>(`ui.inspector.${id}.manifest`);

    return [
      // Header
      new Box({
        className: 'p-3 border-bottom d-flex justify-content-between align-items-center bg-white',
        children: [
          new Box({
            children: [
              new Heading(6, { text: 'Directive Inspector', className: 'mb-0 text-info uppercase small fw-bold' }),
              new SmallText({ text: `ID: ${id.slice(0, 8)}`, className: 'text-muted font-monospace' }),
            ]
          }),
          new Box({
            className: 'd-flex gap-2',
            children: [
              new Button({
                size: 'sm',
                variant: activeTab === 'fsm' ? 'primary' : 'outline-primary',
                text: 'FSM Inspector',
                onClick: () => BrokerDOM.getStateService().set('ui.inspector.activeTab', 'fsm')
              }),
              new Button({
                size: 'sm',
                variant: activeTab === 'git' ? 'primary' : 'outline-primary',
                text: 'Version Control',
                onClick: () => BrokerDOM.getStateService().set('ui.inspector.activeTab', 'git')
              }),
              new Button({
                text: '✕',
                className: 'btn-close ms-2',
                onClick: () => BrokerDOM.getStateService().set('ui.selectedDirectiveID', null)
              })
            ]
          })
        ]
      }),
      activeTab === 'fsm' ? this.buildFSMView(manifest, currentNode, logs) : new GitflowTab({ directiveId: id })
    ];
  }

  private buildFSMView(manifest: FSMManifest | undefined, currentNode: string, logs: InspectorLogEntry[]): ComponentChild {
    return new Box({
      className: 'flex-grow-1 d-flex flex-column overflow-hidden',
      children: [
        // FSM Visualizer (SVG Graph)
        new Box({
          className: 'p-0 border-bottom bg-black overflow-hidden position-relative',
          style: { height: '300px' },
          children: [
            this.renderSVGGraph(manifest, currentNode),
            new Box({
              className: 'position-absolute bottom-0 start-0 p-2 bg-dark bg-opacity-75',
              children: new SmallText({ text: `Current Node: ${currentNode}`, className: 'text-info small' })
            })
          ]
        }),
        // Terminal Stream
        new Box({
          className: 'flex-grow-1 p-0 bg-dark overflow-hidden d-flex flex-column',
          children: [
            new Box({
              className: 'p-2 bg-secondary bg-opacity-25 border-bottom border-secondary d-flex justify-content-between',
              children: [
                new SmallText({ text: 'Cognition Stream', className: 'text-muted x-small' }),
                new SmallText({ text: 'ONLINE', className: 'text-success fw-bold blink x-small' }),
              ]
            }),
            new Box({
              className: 'flex-grow-1 p-3 overflow-auto font-monospace',
              style: { color: '#10b981', fontSize: '11px', lineHeight: '1.4' },
              children: logs.length > 0 ? logs.map((log) => this.buildLogRow(log)) : [
                new Box({ className: 'text-muted italic', text: 'Waiting for cognition...' })
              ]
            })
          ]
        })
      ]
    });
  }

  private renderSVGGraph(manifest: FSMManifest | undefined, currentNode: string): ComponentChild {
    if (!manifest) {
      return new Box({ className: 'd-flex h-100 align-items-center justify-content-center text-muted', children: 'Loading protocol manifest...' });
    }

    const nodes = manifest.nodes || [];
    const edges = manifest.edges || [];
    
    // Simple vertical layout logic
    const rowHeight = 80;
    const centerX = 250;

    const svgElements: string[] = [];

    // Draw Edges
    edges.forEach(edge => {
      const fromIdx = nodes.findIndex(n => n.nodeId === edge.fromNode);
      const toIdx = nodes.findIndex(n => n.nodeId === edge.toNode);
      if (fromIdx === -1 || toIdx === -1) return;

      const y1 = (fromIdx + 0.5) * rowHeight + 40;
      const y2 = (toIdx + 0.5) * rowHeight + 40;
      
      svgElements.push(`<line x1="${centerX}" y1="${y1}" x2="${centerX}" y2="${y2}" stroke="#334155" stroke-width="2" marker-end="url(#arrowhead)" />`);
    });

    // Draw Nodes
    nodes.forEach((node, idx) => {
      const isCurrent = node.nodeId === currentNode;
      const y = (idx + 0.5) * rowHeight + 40;
      const rectW = 140;
      const rectH = 40;
      const color = isCurrent ? '#0ea5e9' : '#475569';
      const glow = isCurrent ? 'filter="url(#glow)" stroke="#38bdf8" stroke-width="3"' : 'stroke="#1e293b" stroke-width="1"';

      svgElements.push(`
        <rect x="${centerX - rectW / 2}" y="${y - rectH / 2}" width="${rectW}" height="${rectH}" rx="4" fill="${color}" ${glow} />
        <text x="${centerX}" y="${y}" fill="white" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${node.nodeId}</text>
        <text x="${centerX}" y="${y + 11}" fill="${isCurrent ? '#bae6fd' : '#94a3b8'}" font-size="8" text-anchor="middle">${node.type.toUpperCase()}</text>
      `);
    });

    const totalHeight = Math.max(300, nodes.length * rowHeight + 80);

    return new Box({
      className: 'overflow-auto w-100 h-100',
      children: new Box({
        tagName: 'svg',
        style: { width: '100%', minHeight: `${totalHeight}px` },
        dangerouslySetInnerHTML: `
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
            </marker>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          ${svgElements.join('')}
        `
      })
    });
  }

  private buildLogRow(log: InspectorLogEntry): ComponentChild {
    const color = log.type === 'tool' ? '#38bdf8' : log.type === 'verdict' ? '#facc15' : '#10b981';
    return new Box({
      className: 'mb-2 opacity-transition',
      children: [
        new SmallText({ 
          text: `[${new Date(log.timestamp).toLocaleTimeString()}] `, 
          className: 'text-muted me-1' 
        }),
        new Box({
          tag: 'span',
          style: { color },
          children: log.content
        })
      ]
    });
  }
}
