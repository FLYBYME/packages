// FILE: src/run.ts
// MeshT — Main Entry Point
// Boots a MeshT gateway node with all Phase 1 system domains.

import 'dotenv/config';
import { bootstrapMeshT } from './boot';
import { IServiceBroker } from '@flybyme/isomorphic-core';
import { Persona } from './domains/sys.personas/personas.schema';
import { CatalogModel } from './domains/sys.catalog/catalog.schema';
import { runFullBootstrap } from './bootstrap/setup';

async function main(): Promise<void> {
  const app = await bootstrapMeshT({
    nodeID: process.env.MESHT_NODE_ID || 'mesht-gateway',
    port: Number(process.env.MESHT_PORT) || 5020,
    role: 'gateway',
    dbAdapter: 'nedb',
    dbPath: process.env.MESHT_DB_PATH || './data/mesht.db',
    bootstrapNodes: process.env.MESHT_BOOTSTRAP_NODES
      ? process.env.MESHT_BOOTSTRAP_NODES.split(',')
      : [],
  });

  const broker = app.getProvider<IServiceBroker>('broker');

  // ── Bootstrap constitutional directives ──────────────────────
  // Wait for governance service to be available, then seed default rules
  try {
    await app.registry.waitForService('sys.governance', 5000);
    app.logger.info(`[MeshT] Governance domain available. Seeding genesis data...`);

    // 1. Run all bootstrap seeds
    await runFullBootstrap(broker);

    // 2. Start human interface REPL if requested
    if (app.config.role === 'gateway') {
      await broker.call('sys.interface.start_repl', {});
    }
  } catch (err) {
    app.logger.warn(`[MeshT] Genesis seeding/REPL failed: ${(err as Error).message}`);
  }

  // ── Event Logging (telemetry) ────────────────────────────────
  broker.on('sys.personas.created', (data: Persona) => {
    app.logger.info(`[EVENT] Persona created: ${data.alias} (${data.role})`);
  });

  broker.on('sys.artifacts.registered', (data: { id: string, type: string }) => {
    app.logger.info(`[EVENT] Artifact registered: ${data.id} (${data.type})`);
  });


  broker.on('sys.governance.rule_ratified', (data: { ruleId: string, severity: "HARD" | "SOFT", proposedBy: string }) => {
    app.logger.info(`[EVENT] Rule ratified: ${data.ruleId} (${data.severity})`);
  });

  broker.on('sys.catalog.model_enabled', (data: CatalogModel) => {
    app.logger.info(`[EVENT] Model enabled: ${data.alias} (${data.providerId})`);
  });

  // ── Status Report ────────────────────────────────────────────
  app.logger.info(`╔════════════════════════════════════════════════════════╗`);
  app.logger.info(`║  MeshT v1.2 — Autonomous Engineering Grid             ║`);
  app.logger.info(`║  Phase 1: Kernel + Core System Domains                ║`);
  app.logger.info(`║                                                        ║`);
  app.logger.info(`║  Domains:                                              ║`);
  app.logger.info(`║    ✓ sys.audit       — Immutable Ledger                ║`);
  app.logger.info(`║    ✓ sys.artifacts   — Protocol & Capability Registry  ║`);
  app.logger.info(`║    ✓ sys.catalog     — LLM Model Catalog               ║`);
  app.logger.info(`║    ✓ sys.personas    — Persona Matrix                  ║`);
  app.logger.info(`║    ✓ sys.governance  — Constitutional Ledger           ║`);
  app.logger.info(`║                                                        ║`);
  app.logger.info(`║  Node: ${app.nodeID.padEnd(47)}║`);
  app.logger.info(`╚════════════════════════════════════════════════════════╝`);

  // ── Graceful Shutdown ────────────────────────────────────────
  process.on('SIGINT', async () => {
    app.logger.warn(`[MeshT] Shutting down...`);
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    app.logger.warn(`[MeshT] SIGTERM received, shutting down...`);
    await app.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[MeshT] Fatal error:', err);
  process.exit(1);
});
