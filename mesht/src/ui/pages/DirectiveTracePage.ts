import {
  BrokerPage, ComponentChild, BrokerDOM,
  Card, CardHeader, CardBody, Heading, SmallText,
  Section, Badge, Button
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
    super('div', { fluid: true, py: 4 });
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
      return [new Section({ padding: 5, textAlign: 'center', color: 'muted', children: 'Loading trace...' })];
    }

    const sections: ComponentChild[] = [];

    if (progress.length > 0) {
      sections.push(new Section({
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        mb: 4,
        children: progress.map((event) => this.buildProgressRow(event)),
      }));
    }

    if (auditLogs.length > 0) {
      sections.push(new Section({
        mb: 4,
        children: [
          new Heading(5, { text: 'Audit Timeline', mb: 3, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 6 }),
          new Section({
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            children: auditLogs.map((audit) => this.buildAuditEntry(audit))
          })
        ]
      }));
    }

    sections.push(new Section({
      display: 'flex',
      justifyContent: 'between',
      alignItems: 'center',
      mb: 4,
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
      sections.push(new Section({ padding: 5, textAlign: 'center', color: 'muted', children: hint }));
    } else {
      sections.push(new Section({
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
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
      borderColor: isError ? 'danger' : 'secondary',
      children: [
        new CardHeader({
          background: isError ? 'danger' : 'light',
          color: isError ? 'white' : undefined,
          display: 'flex',
          justifyContent: 'between',
          alignItems: 'center',
          children: [
            new Section({
              children: [
                new Badge({ text: `Cycle ${cycleNum}`, variant: isError ? 'light' : 'primary', mr: 2, color: 'dark' }),
                new SmallText({ text: log.objective, fontWeight: 'bold' })
              ]
            }),
            new SmallText({ text: `${new Date(log.createdAt).toLocaleTimeString()} (${log.latencyMs}ms)`, color: isError ? 'white-50' : 'muted' })
          ]
        }),
        new CardBody({
          padding: 0,
          children: [
            // 1. Raw Message Trace
            messages.length > 0 ? new Section({
              padding: 3,
              borderBottom: true,
              children: [
                new Heading(6, { text: 'Message Trace', color: 'muted', mb: 3, textTransform: 'uppercase', fontSize: 6, fontWeight: 'bold' }),
                new Section({
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  children: messages.map(msg => this.buildMessageBubble(msg))
                })
              ]
            }) : null,

            // 2. Tool Trace
            tools.length > 0 ? new Section({
              padding: 3,
              borderBottom: true,
              background: 'light',
              children: [
                new Heading(6, { text: 'Tool Execution Trace', color: 'muted', mb: 3, textTransform: 'uppercase', fontSize: 6, fontWeight: 'bold' }),
                new Section({
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  children: tools.map(t => this.buildToolBubble(t))
                })
              ]
            }) : null,

            // 3. Final Result / Verdict
            new Section({
              padding: 3,
              children: [
                new Heading(6, { text: `Final Verdict: ${log.verdict}`, mb: 2, color: isError ? 'danger' : 'success', fontWeight: 'bold' }),
                new Section({
                  tagName: 'pre',
                  background: 'dark',
                  color: 'light',
                  padding: 3,
                  rounded: true,
                  fontSize: 6,
                  mb: 0,
                  overflow: 'auto',
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
    
    let background = 'secondary'; // user
    let color = 'white';
    let title = 'User';
    
    if (isAssistant) { background = 'primary'; color = 'white'; title = 'Assistant'; }
    if (isSystem) { background = 'dark'; color = 'white'; title = 'System Prompt'; }
    if (msg.role === 'tool') { background = 'info'; color = 'dark'; title = `Tool Result: ${msg.name}`; }

    let content = msg.content;
    if (isAssistant && msg.tool_calls) {
       content += '\n\n[Tool Calls]:\n' + JSON.stringify(msg.tool_calls, null, 2);
    }

    return new Section({
      padding: 3,
      rounded: true,
      shadow: 'sm',
      background,
      color,
      children: [
        new SmallText({ text: title, fontWeight: 'bold', display: 'block', mb: 2, textTransform: 'uppercase' }),
        new Section({
          tagName: 'pre',
          mb: 0,
          fontSize: 6,
          fontFamily: 'monospace',
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 },
          children: content
        })
      ]
    });
  }

  private buildToolBubble(tool: ToolTraceEntry): ComponentChild {
    const isError = tool.status === 'error';
    return new Section({
      padding: 3,
      rounded: true,
      border: true,
      borderColor: isError ? 'danger' : 'info',
      background: 'white',
      children: [
        new SmallText({ text: `Tool Call: ${tool.tool}`, fontWeight: 'bold', display: 'block', mb: 2, color: isError ? 'danger' : 'info' }),
        new Section({
          mb: 2,
          children: [
            new SmallText({ text: 'Arguments:', display: 'block', color: 'muted', mb: 1 }),
            new Section({
              tagName: 'pre',
              background: 'light',
              padding: 2,
              rounded: true,
              fontSize: 6,
              mb: 0,
              children: JSON.stringify(tool.args, null, 2)
            })
          ]
        }),
        new Section({
          children: [
            new SmallText({ text: 'Result:', display: 'block', color: 'muted', mb: 1 }),
            new Section({
              tagName: 'pre',
              background: isError ? 'danger' : 'dark',
              color: isError ? 'white' : 'success',
              padding: 2,
              rounded: true,
              fontSize: 6,
              mb: 0,
              overflow: 'auto',
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
    return new Section({
      padding: 3,
      rounded: true,
      border: true,
      borderColor: 'secondary',
      background: 'white',
      shadow: 'sm',
      children: [
        new SmallText({ text: `${new Date(event.timestamp).toLocaleTimeString()} · ${stageLabel}`, color: 'muted', fontSize: 6, mb: 1 }),
        new SmallText({ text: event.detail, fontWeight: 'bold', display: 'block', mb: 1 }),
        new SmallText({
          text: event.toolCallsMade ? `Tools run: ${event.toolCallsMade}` : 'Tools pending',
          color: 'muted',
          fontSize: 6,
          mb: 0
        })
      ]
    });
  }

  private buildAuditEntry(entry: AuditLog): ComponentChild {
    const when = new Date(entry.timestamp).toLocaleTimeString();
    const payload = entry.payload ?? {};
    const stage = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>).stage : undefined;
    const detail = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>).detail : undefined;
    const summary = (detail || stage || 'Audit event recorded.') as string;
    const payloadPreview = typeof payload === 'object' && payload !== null
      ? JSON.stringify(payload, null, 2)
      : String(payload);

    return new Section({
      border: true,
      rounded: true,
      shadow: 'sm',
      padding: 3,
      background: 'white',
      children: [
        new Section({
          display: 'flex',
          justifyContent: 'between',
          alignItems: 'center',
          mb: 2,
          children: [
            new SmallText({ text: entry.changeType, textTransform: 'uppercase', fontSize: 6, fontWeight: 'bold', color: 'dark' }),
            new SmallText({ text: when, color: 'muted', fontSize: 6 })
          ]
        }),
        new SmallText({ text: summary, color: 'muted', mb: 2, fontSize: 6 }),
        new Section({
          tagName: 'pre',
          background: 'dark',
          color: 'light',
          rounded: true,
          padding: 2,
          fontSize: 6,
          mb: 0,
          style: { maxHeight: '220px', overflow: 'auto', whiteSpace: 'pre-wrap' },
          children: payloadPreview
        })
      ]
    });
  }
}
