import {
  BrokerPage, ComponentChild, BrokerDOM,
  Row, Col, Card, CardHeader, CardBody,
  Heading, Badge, Accordion, AccordionItem, SmallText, Section,
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  FormLabel, FormControl, Button
} from '@flybyme/isomorphic-ui';
import { AuditLog } from '../../domains/sys.audit/audit.schema';
import { ConstitutionalRule, Governance } from '../../domains/sys.governance/governance.schema';
import { AuditTrailTable } from '../components/AuditTrailTable';

export class GovernancePage extends BrokerPage {
  private createRuleModal?: Modal;

  public getSEO() { return { defaultTitle: 'Governance', titleTemplate: '%s | MeshT' }; }
  public getPageConfig() { return { title: 'Governance' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4' });
    this.initModal();
  }

  private initModal() {
    this.createRuleModal = new Modal({
      id: 'createRuleModal',
      children: [
        new ModalHeader({ children: new ModalTitle({ text: 'Propose Constitutional Rule' }) }),
        new ModalBody({
          children: [
            new FormLabel({ text: 'Rule ID' }),
            new FormControl({ 
              id: 'newRuleId', 
              placeholder: 'e.g. GR-2026-001',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newRule.id', (e.target as HTMLInputElement).value) 
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Rule Text' }),
            new FormControl({ 
              id: 'newRuleText', 
              type: 'textarea', 
              rows: 4,
              placeholder: 'Agents must always prioritize state consistency...',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newRule.text', (e.target as HTMLTextAreaElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Severity' }),
            new FormControl({ 
              id: 'newRuleSeverity', 
              type: 'select',
              options: [
                { value: 'SOFT', label: 'Soft (Guideline)' },
                { value: 'HARD', label: 'Hard (Constraint)' }
              ],
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newRule.severity', (e.target as HTMLSelectElement).value)
            }),
            new Section({ className: 'mt-3' }),
            new FormLabel({ text: 'Domain' }),
            new FormControl({ 
              id: 'newRuleDomain', 
              placeholder: 'e.g. engineering',
              onInput: (e: Event) => BrokerDOM.getStateService().set('ui.newRule.domain', (e.target as HTMLInputElement).value)
            }),
          ]
        }),
        new ModalFooter({
          children: [
            new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createRuleModal?.hide() }),
            new Button({ variant: 'primary', text: 'Propose', onClick: () => this.submitRule() })
          ]
        })
      ]
    });
  }

  public async onEnter(_params: Record<string, unknown>): Promise<void> {
    this.setHeaderActions([
      new Button({
        variant: 'primary',
        text: '+ Proposed Rule',
        onClick: () => this.createRuleModal?.show()
      })
    ]);

    await this.refresh();
  }

  private async refresh() {
    const broker = BrokerDOM.getBroker();
    const state = BrokerDOM.getStateService();

    try {
      // 1. Fetch Constitution
      const results = await broker.call<Governance[]>('sys.governance.list', {});
      const rules = results?.[0]?.constitution || [];
      state.set('governance.constitution', rules);

      // 2. Fetch Audit Trail
      const auditLogs = await broker.call<AuditLog[]>('sys.audit.query', { limit: 50 });
      state.set('audit_full', auditLogs);
    } catch (err) {
      this.logger.error('Failed to refresh governance data', err);
    }
  }

  private async submitRule() {
    const state = BrokerDOM.getStateService();
    const ruleId = state.getValue<string>('ui.newRule.id');
    const text = state.getValue<string>('ui.newRule.text');
    const severity = state.getValue<string>('ui.newRule.severity') || 'SOFT';
    const domain = state.getValue<string>('ui.newRule.domain');

    if (!ruleId || !text || !domain) return;

    try {
      // Propose adding a rule
      await BrokerDOM.getBroker().call('sys.governance.propose', {
        type: 'ADD_RULE',
        rule: { ruleId, text, severity, domain, proposedBy: 'operator' }
      });
      this.createRuleModal?.hide();
      await this.refresh();
    } catch (err) {
      this.logger.error('Proposal error', err);
    }
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const rules = state.getValue<ConstitutionalRule[]>('governance.constitution') || [];
    const logs = state.getValue<AuditLog[]>('audit_full') || [];

    return [
      new Heading(2, { text: 'Governance & Audit', className: 'mb-4' }),
      new Row({
        children: [
          // Constitution Section
          new Col({
            span: 12,
            className: 'mb-4',
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: 'Constitutional Ledger', className: 'mb-0' }) }),
                new CardBody({
                  children: rules.length > 0 ? new Accordion({
                    id: 'constitutionAccordion',
                    children: rules.map(r => new AccordionItem({
                      id: r.ruleId,
                      header: new Section({
                        tagName: 'fragment',
                        children: [
                          new Badge({ variant: r.severity === 'HARD' ? 'danger' : 'warning', text: r.severity, className: 'me-2' }),
                          new SmallText({ text: r.ruleId, className: 'fw-bold me-2' }),
                          new SmallText({ text: r.text.slice(0, 50) + '...' })
                        ]
                      }),
                      children: [
                        new Section({ text: r.text, className: 'mb-2' }),
                        new SmallText({ text: `Proposed By: ${r.proposedBy} | Domain: ${r.domain}`, className: 'text-muted' })
                      ]
                    }))
                  }) : new SmallText({ text: 'No constitutional rules active.', className: 'text-muted' })
                })
              ]
            })
          }),
          // Expanded Audit Trail
          new Col({
            span: 12,
            children: new Card({
              children: [
                new CardHeader({ children: new Heading(5, { text: 'Immutable Audit Trail', className: 'mb-0' }) }),
                new CardBody({
                  children: new AuditTrailTable({
                    pageSize: 10,
                    data: logs
                  })
                })
              ]
            })
          })
        ]
      }),
      this.createRuleModal!
    ];
  }
}
