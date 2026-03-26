import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardHeader, CardBody, Heading, SmallText,
  Box, Badge, Button
} from '@flybyme/isomorphic-ui';
import {
  ChatMessage,
  CognitionLog,
  ToolTraceEntry,
  DispatcherCognitionProgressEvent,
} from '../../domains/sys.dispatcher/dispatcher.schema';
import { AuditLog } from '../../domains/sys.audit/audit.schema';

export class DirectiveTracePage extends BrokerPage {
  private unsubs: Array<() => void> = [];

  public getSEO() { return { defaultTitle: 'Directive Trace' }; }
  public getPageConfig() { return { title: 'Directive Trace' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4' });
  }

  public async onEnter(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    const state = BrokerDOM.getStateService();
    const broker = BrokerDOM.getBroker();

    state.set('trace.directiveID', id);
    state.set('trace.loading', true);
    state.set('trace.progress', []);

    try {
      const history = await broker.call<CognitionLog[]>('sys.dispatcher.cognition_history', { id, limit: 100 });
      history.sort((a, b) => a.createdAt - b.createdAt);
      state.set('trace.history', history);
    } catch (err) {
      this.logger.error('Failed to fetch trace history', err);
    }

    try {
      const auditLogs = await broker.call<AuditLog[]>('sys.audit.query', { directiveId: id, limit: 50 });
      const sorted = auditLogs.sort((a, b) => a.timestamp - b.timestamp);
      state.set('trace.audit', sorted);
    } catch (err) {
      this.logger.warn('Failed to fetch audit trace', err);
      state.set('trace.audit', []);
    } finally {
      state.set('trace.loading', false);
    }

    const progressSub = broker.on('sys.dispatcher.cognition_progress', (event: DispatcherCognitionProgressEvent) => {
      if (event.directiveId !== id) return;
      const existing = state.getValue<DispatcherCognitionProgressEvent[]>('trace.progress') || [];
      const updated = [...existing, event].slice(-20);
      state.set('trace.progress', updated);
    });
    this.unsubs.push(progressSub);
  }

  public async onLeave(): Promise<void> {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const id = state.getValue<string>('trace.directiveID') || 'Unknown';
    const history = state.getValue<CognitionLog[]>('trace.history') || [];
    const progress = state.getValue<DispatcherCognitionProgressEvent[]>('trace.progress') || [];
    const auditLogs = state.getValue<AuditLog[]>('trace.audit') || [];
    const loading = state.getValue<boolean>('trace.loading');

    if (loading) {
      return [new Box({ className: 'p-5 text-center text-muted', children: 'Loading trace...' })];
    }

    const sections: ComponentChild[] = [];

    if (progress.length > 0) {
      sections.push(new Box({
        className: 'd-flex flex-column gap-3 mb-4',
        children: progress.map((event) => this.buildProgressRow(event)),
      }));
    }

    if (auditLogs.length > 0) {
      sections.push(new Box({
        className: 'mb-4',
        children: [
          new Heading(5, { text: 'Audit Timeline', className: 'mb-3 fw-bold text-uppercase small' }),
          new Box({
            className: 'd-flex flex-column gap-3',
            children: auditLogs.map((audit) => this.buildAuditEntry(audit))
          })
        ]
      }));
    }

    sections.push(new Box({
      className: 'd-flex justify-content-between align-items-center mb-4',
      children: [
        new Heading(4, { text: `Cognition Trace: ${id}` }),
        new Button({
          text: 'Back to Directives',
          variant: 'outline-secondary',
          onClick: () => BrokerDOM.getRouter()?.navigate('/directives')
        })
      ]
    }));

    if (history.length === 0) {
      const hint = auditLogs.length > 0
        ? 'No finalized cognition trace recorded yet. Check the audit timeline above for live progress.'
        : `No cognition history found for directive: ${id}`;
      sections.push(new Box({ className: 'p-5 text-center text-muted', children: hint }));
    } else {
      sections.push(new Box({
        className: 'd-flex flex-column gap-4',
        children: history.map((log, index) => this.buildTraceCard(log, index + 1))
      }));
    }

    return sections;
  }

  private buildTraceCard(log: CognitionLog, cycleNum: number): ComponentChild {
    const isError = log.status === 'error' || log.status === 'timeout';
    
    let messages: ChatMessage[] = [];
    if (log.messageTrace) {
      try { messages = JSON.parse(log.messageTrace); } catch { /* ignore */ }
    }

    let tools: ToolTraceEntry[] = [];
    if (log.toolTrace) {
      try { tools = JSON.parse(log.toolTrace); } catch { /* ignore */ }
    }

    return new Card({
      className: `border-${isError ? 'danger' : 'secondary'}`,
      children: [
        new CardHeader({
          className: `bg-${isError ? 'danger text-white' : 'light'} d-flex justify-content-between align-items-center`,
          children: [
            new Box({
              children: [
                new Badge({ text: `Cycle ${cycleNum}`, variant: isError ? 'light' : 'primary', className: 'me-2 text-dark' }),
                new SmallText({ text: log.objective, className: 'fw-bold' })
              ]
            }),
            new SmallText({ text: `${new Date(log.createdAt).toLocaleTimeString()} (${log.latencyMs}ms)`, className: isError ? 'text-white-50' : 'text-muted' })
          ]
        }),
        new CardBody({
          className: 'p-0',
          children: [
            // 1. Raw Message Trace
            messages.length > 0 ? new Box({
              className: 'p-3 border-bottom',
              children: [
                new Heading(6, { text: 'Message Trace', className: 'text-muted mb-3 uppercase small fw-bold' }),
                new Box({
                  className: 'd-flex flex-column gap-3',
                  children: messages.map(msg => this.buildMessageBubble(msg))
                })
              ]
            }) : null,

            // 2. Tool Trace
            tools.length > 0 ? new Box({
              className: 'p-3 border-bottom bg-light',
              children: [
                new Heading(6, { text: 'Tool Execution Trace', className: 'text-muted mb-3 uppercase small fw-bold' }),
                new Box({
                  className: 'd-flex flex-column gap-3',
                  children: tools.map(t => this.buildToolBubble(t))
                })
              ]
            }) : null,

            // 3. Final Result / Verdict
            new Box({
              className: 'p-3',
              children: [
                new Heading(6, { text: `Final Verdict: ${log.verdict}`, className: `mb-2 ${isError ? 'text-danger' : 'text-success'} fw-bold` }),
                new Box({
                  tag: 'pre',
                  className: 'bg-dark text-light p-3 rounded small mb-0 overflow-auto',
                  style: { maxHeight: '300px', whiteSpace: 'pre-wrap' },
                  children: log.response || log.errorMessage || 'No response recorded.'
                })
              ]
            })
          ]
        })
      ]
    });
  }

  private buildMessageBubble(msg: ChatMessage): ComponentChild {
    const isAssistant = msg.role === 'assistant';
    const isSystem = msg.role === 'system';
    const isTool = msg.role === 'tool';
    
    let colorClass = 'bg-secondary text-white'; // user
    let title = 'User';
    
    if (isAssistant) { colorClass = 'bg-primary text-white'; title = 'Assistant'; }
    if (isSystem) { colorClass = 'bg-dark text-white'; title = 'System Prompt'; }
    if (isTool) { colorClass = 'bg-info text-dark'; title = `Tool Result: ${msg.name}`; }

    let content = msg.content;
    if (isAssistant && msg.tool_calls) {
       content += '\n\n[Tool Calls]:\n' + JSON.stringify(msg.tool_calls, null, 2);
    }

    return new Box({
      className: `p-3 rounded shadow-sm ${colorClass}`,
      children: [
        new SmallText({ text: title, className: 'fw-bold d-block mb-2 uppercase' }),
        new Box({
          tag: 'pre',
          className: 'mb-0 small',
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'monospace' },
          children: content
        })
      ]
    });
  }

  private buildToolBubble(tool: ToolTraceEntry): ComponentChild {
    const isError = tool.status === 'error';
    return new Box({
      className: `p-3 rounded border border-${isError ? 'danger' : 'info'} bg-white`,
      children: [
        new SmallText({ text: `Tool Call: ${tool.tool}`, className: `fw-bold d-block mb-2 text-${isError ? 'danger' : 'info'}` }),
        new Box({
          className: 'mb-2',
          children: [
            new SmallText({ text: 'Arguments:', className: 'd-block text-muted mb-1' }),
            new Box({
              tag: 'pre',
              className: 'bg-light p-2 rounded small mb-0',
              children: JSON.stringify(tool.args, null, 2)
            })
          ]
        }),
        new Box({
          children: [
            new SmallText({ text: 'Result:', className: 'd-block text-muted mb-1' }),
            new Box({
              tag: 'pre',
              className: `${isError ? 'bg-danger text-white' : 'bg-dark text-success'} p-2 rounded small mb-0 overflow-auto`,
              style: { maxHeight: '200px' },
              children: isError ? tool.error : JSON.stringify(tool.result, null, 2)
            })
          ]
        })
      ]
    });
  }

  private buildProgressRow(event: DispatcherCognitionProgressEvent): ComponentChild {
    const stageLabel = event.stage.replace('_', ' ');
    return new Box({
      className: 'p-3 rounded border border-secondary bg-white shadow-sm',
      children: [
        new SmallText({ text: `${new Date(event.timestamp).toLocaleTimeString()} · ${stageLabel}`, className: 'text-muted small mb-1' }),
        new SmallText({ text: event.detail, className: 'fw-bold d-block mb-1' }),
        new SmallText({
          text: event.toolCallsMade ? `Tools run: ${event.toolCallsMade}` : 'Tools pending',
          className: 'text-muted small mb-0'
        })
      ]
    });
  }

  private buildAuditEntry(entry: AuditLog): ComponentChild {
    const when = new Date(entry.timestamp).toLocaleTimeString();
    const payload = entry.payload ?? {};
    const stage = typeof payload === 'object' && payload !== null ? (payload as any).stage : undefined;
    const detail = typeof payload === 'object' && payload !== null ? (payload as any).detail : undefined;
    const summary = detail || stage || 'Audit event recorded.';
    const payloadPreview = typeof payload === 'object' && payload !== null
      ? JSON.stringify(payload, null, 2)
      : String(payload);

    return new Box({
      className: 'border rounded shadow-sm p-3 bg-white',
      children: [
        new Box({
          className: 'd-flex justify-content-between align-items-center mb-2',
          children: [
            new SmallText({ text: entry.changeType, className: 'text-uppercase small fw-bold text-dark' }),
            new SmallText({ text: when, className: 'text-muted small' })
          ]
        }),
        new SmallText({ text: summary, className: 'text-muted mb-2 small' }),
        new Box({
          tag: 'pre',
          className: 'bg-dark text-light rounded p-2 small mb-0',
          style: { maxHeight: '220px', overflow: 'auto', whiteSpace: 'pre-wrap' },
          children: payloadPreview
        })
      ]
    });
  }
}
