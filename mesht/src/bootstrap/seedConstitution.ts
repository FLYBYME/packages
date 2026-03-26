// FILE: src/bootstrap/seedConstitution.ts
import { IServiceBroker } from '@flybyme/isomorphic-core';
import { ProposeRuleResult } from '../domains/sys.governance/governance.schema';

/**
 * Seeds the Constitutional Ledger with default rules.
 * Spec §7.2: Directive Alpha and Directive Beta.
 */
export async function seedConstitution(broker: IServiceBroker): Promise<void> {
  const rules = [
    {
      text: "Directive Alpha: NEVER delete .git histories.",
      domain: "sys.eng",
      severity: "HARD",
      proposedBy: "admin",
    },
    {
      text: "Directive Beta: No agent may execute a shell command containing rm -rf outside the sys.eng.sandbox.",
      domain: "sys.eng",
      severity: "HARD",
      proposedBy: "admin",
    },
    {
      text: "CONST-003: If a tool execution fails due to a schema validation or syntax error, you MUST immediately analyze the error output and retry the tool call with corrected parameters. You are forbidden from pivoting to a different tool (like fs_write) until the current tool schema succeeds.",
      domain: "global",
      severity: "HARD",
      proposedBy: "admin",
    },
    {
      text: "GOV-VCS-01: Version control is an orchestration-level concern. The Orchestrator automatically branches, checkpoints, and merges your code. You are strictly forbidden from executing ANY version control commands (git init, git branch, git commit, git push) via shell tools.",
      domain: "sys.eng",
      severity: "HARD",
      proposedBy: "admin",
    },
  ];

  for (const rule of rules) {
    try {
      const proposed = await broker.call<ProposeRuleResult>('sys.governance.proposeRule', rule);
      await broker.call('sys.governance.ratifyRule', {
        ruleId: proposed.ruleId,
        approved: true,
        reviewedBy: 'admin',
        reviewNotes: 'Genesis constitutional directive.',
      });
    } catch {
      // Duplicate bootstrap proposals are ignored for now.
    }
  }
}
