// FILE: src/scripts/apply_const_003.ts
import 'dotenv/config';
import { bootstrapMeshT } from '../boot';
import { IServiceBroker } from '@flybyme/isomorphic-core';
import { ConstitutionalRule, ProposeRuleResult } from '../domains/sys.governance/governance.schema';

async function main(): Promise<void> {
  // Boot minimal kernel
  const app = await bootstrapMeshT({
    nodeID: 'migration-script',
    role: 'worker',
    dbAdapter: 'mock',
  });

  const broker = app.getProvider<IServiceBroker>('broker');

  try {
    await app.registry.waitForService('sys.governance', 10000);
    console.log('Governance service found. Checking CONST-003...');

    const constitution = await broker.call<ConstitutionalRule[]>('sys.governance.getActiveConstitution', {});
    const exists = constitution.some(r => r.text.includes('CONST-003'));

    if (exists) {
      console.log('CONST-003 already ratified.');
    } else {
      console.log('Proposing CONST-003...');
      const rule = {
        text: "CONST-003: If a tool execution fails due to a schema validation or syntax error, you MUST immediately analyze the error output and retry the tool call with corrected parameters. You are forbidden from pivoting to a different tool (like fs_write) until the current tool schema succeeds.",
        domain: "global",
        severity: "HARD",
        proposedBy: "admin",
      };

      const proposed = await broker.call<ProposeRuleResult>('sys.governance.proposeRule', rule);
      console.log(`Rule proposed with ID: ${proposed.ruleId}. Ratifying...`);

      await broker.call('sys.governance.ratifyRule', {
        ruleId: proposed.ruleId,
        approved: true,
        reviewedBy: 'admin',
        reviewNotes: 'Emergency constitutional fix for tool pivoting.',
      });

      console.log('CONST-003 ratified successfully.');
    }
  } catch (err) {
    console.error('Migration failed:', (err as Error).message);
  } finally {
    await app.stop();
    process.exit(0);
  }
}

main();
