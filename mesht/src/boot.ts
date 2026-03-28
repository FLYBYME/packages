// FILE: src/boot.ts
// MeshT Kernel — Unified Entry Point
// Boots the isomorphic-core kernel, wires system domains, connects mesh.

import {
  createMeshApp,
  BrokerModule,
  IMeshApp,
} from '@flybyme/isomorphic-core';
import { RegistryModule } from '@flybyme/isomorphic-registry';
import {
  NetworkModule,
  NetworkModuleOptions,
  WSTransport,
  JSONSerializer,
  BaseTransport,
} from '@flybyme/isomorphic-mesh';
import { TelemetryModule } from '@flybyme/isomorphic-telemetry';
import { DatabaseModule } from '@flybyme/isomorphic-database';
import * as fs from 'fs/promises';
import * as path from 'path';

// ─── Phase 1 — Foundation Domains ───────────────────────────────
import { AuditService } from './domains/sys.audit/audit.service';
import { ProjectsService } from './domains/sys.projects/projects.service';
import { ArtifactsService } from './domains/sys.artifacts/artifacts.service';
import { CatalogService } from './domains/sys.catalog/catalog.service';
import { PersonasService } from './domains/sys.personas/personas.service';
import { GovernanceService } from './domains/sys.governance/governance.service';

// ─── Phase 2 — Directive Engine ─────────────────────────────────
import { DirectivesService } from './domains/sys.directives/directives.service';
import { GitflowService } from './domains/sys.gitflow/gitflow.service';
import { DispatcherService } from './domains/sys.dispatcher/dispatcher.service';

// ─── Phase 3 — Tool & Engineering Layer ─────────────────────────
import { ToolsService } from './domains/sys.tools/tools.service';
import { ForgeService } from './domains/sys.forge/forge.service';
import { EngService } from './domains/sys.eng/eng.service';

// ─── Phase 4 — Scheduler / Orchestrator ─────────────────────────
import { SchedulerService } from './domains/sys.scheduler/scheduler.service';

// ─── Phase 5 — Human Interface Layer
import { InterfaceService } from './domains/sys.interface/interface.service';

// ─── Phase 6 — Intelligence Suite ───────────────────────────────
import { RadarService } from './domains/sys.int.radar/radar.service';
import { ChromaService } from './domains/sys.int.chroma/chroma.service';

// ─── Phase 7 — Swarm Intelligence ───────────────────────────────
import { SwarmService } from './domains/sys.swarm/swarm.service';

// ─── Phase 8 — Governance & Security ────────────────────────────
import { AuthService } from './domains/sys.auth/auth.service';

// ─── Phase 9 — Operations Console (UI) ──────────────────────────
import { UIService } from './domains/sys.ui/ui.service';
import { IServiceSchema } from '@flybyme/isomorphic-core';

// ─── Configuration ──────────────────────────────────────────────

export interface MeshTConfig {
  nodeID?: string;
  port?: number;
  role?: 'gateway' | 'worker' | 'agent';
  bootstrapNodes?: string[];
  transports?: BaseTransport[];
  dbAdapter?: "sqlite" | "mock" | "nedb";
  dbPath?: string;
  autoStartScheduler?: boolean;
  mesh?: {
    network?: Partial<NetworkModuleOptions>;
    telemetry?: Record<string, unknown>;
  };
}

// ─── Bootstrap ──────────────────────────────────────────────────

/**
 * Boots a fully wired MeshT node.
 *
 * Initialization sequence (per spec §9):
 * 1. Storage Init — Database adapter
 * 2. Kernel Boot — MeshApp + ServiceBroker
 * 3. Domain Injection — Phase 1-4: All sys.* domains
 * 4. Mesh Connection — Transports + registry announcement
 * 5. Scheduler Start — Heartbeat loop (optional)
 */
export async function bootstrapMeshT(config: MeshTConfig = {}): Promise<IMeshApp> {
  const nodeID =
    config.nodeID ||
    process.env.MESHT_NODE_ID ||
    `mesht-${Math.random().toString(36).substring(2, 7)}`;

  const port = config.port ?? (Number(process.env.MESHT_PORT) || 5020);

  // ── 1. Modules ──────────────────────────────────────────────
  const brokerModule = new BrokerModule();
  const registryModule = new RegistryModule({ bucketSize: 20 });

  const serializer = new JSONSerializer();
  const defaultTransports = [new WSTransport(serializer, port)];

  const networkModule = new NetworkModule({
    transports: config.transports || defaultTransports,
    bootstrapNodes: config.bootstrapNodes,
    port: config.role === 'worker' ? undefined : port,
    ...config.mesh?.network,
  });

  const telemetryModule = new TelemetryModule({
    isSink: config.role === 'gateway',
    ...config.mesh?.telemetry,
    logging: {
      enabled: true,
      level: 1,
      drains: ['mesh', 'console'],
    },
  });

  // ── 2. Storage Init ─────────────────────────────────────────
  const dbDir = config.dbPath ?? path.join(process.cwd(), '.mesh', 'db');
  await fs.mkdir(dbDir, { recursive: true });

  const databaseModule = new DatabaseModule({
    adapterType: 'nedb',
    adapterConfig: {
      filename: path.join(dbDir, 'mesht'),
      inMemoryOnly: config.dbAdapter === 'mock'
    },
    enforceTenancy: false
  });

  // ── 3. Compose Kernel ───────────────────────────────────────
  const app = createMeshApp({
    ...config,
    nodeID,
    modules: [
      telemetryModule,
      brokerModule,
      registryModule,
      networkModule,
      databaseModule
    ],
  });

  // ── 4. Start Kernel ─────────────────────────────────────────
  await app.start();
  app.logger.info(`[MeshT] Kernel booted — NodeID: ${app.nodeID}, Port: ${port}`);

  // ── 5. Domain Injection ─────────────────────────────────────

  const allDomains: IServiceSchema[] = [
    // Phase 9 — UI
    new UIService(app.logger),
    // Phase 1 — Foundation
    new AuditService(app.logger),
    new ProjectsService(app.logger),
    new ArtifactsService(app.logger),
    new CatalogService(app.logger),
    new PersonasService(app.logger),
    new GovernanceService(app.logger),

    // Phase 2 — Directive Engine
    new DirectivesService(app.logger),
    new GitflowService(app.logger),
    new DispatcherService(app.logger),

    // Phase 3 — Tools & Engineering
    new ToolsService(app.logger),
    new ForgeService(app.logger),
    new EngService(app.logger),

    // Phase 4 — Scheduler
    new SchedulerService(app.logger),

    // Phase 5 — Interface
    new InterfaceService(app.logger),

    // Phase 6 — Intelligence Suite
    new RadarService(app.logger),
    new ChromaService(app.logger),

    // Phase 7 — Swarm
    new SwarmService(app.logger),

    // Phase 8 — Auth
    new AuthService(app.logger),

  ];

  for (const domain of allDomains) {
    await app.registerService(domain);
    app.logger.info(`[MeshT] ✓ ${domain.name}`);
  }

  app.logger.info(`[MeshT] All ${allDomains.length} domains loaded. Node is fully operational.`);

  return app;
}
