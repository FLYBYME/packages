// FILE: src/ui/mesht.manifest.ts

import { SiteManifest } from '@flybyme/isomorphic-core';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DirectivesPage } from './pages/DirectivesPage';
import { DirectiveTracePage } from './pages/DirectiveTracePage';
import { PersonasPage } from './pages/PersonasPage';
import { SwarmGridPage } from './pages/SwarmGridPage';
import { GovernancePage } from './pages/GovernancePage';
import { MemoryExplorerPage } from './pages/MemoryExplorerPage';
import { ToolsPage } from './pages/ToolsPage';
import { ToolWorkbenchPage } from './pages/ToolWorkbenchPage';
import { SpecialistConsolePage } from './pages/SpecialistConsolePage';
import { CatalogPage } from './pages/CatalogPage';
import { ArtifactsPage } from './pages/ArtifactsPage';
import { TelemetryPage } from './pages/TelemetryPage';
import { GitflowPage } from './pages/GitflowPage';

/**
 * MeshT Console Manifest
 */
export const MeshTManifest: SiteManifest = {
  app: {
    id: 'mesht-console',
    name: 'MeshT Operations Grid',
    shortName: 'MeshT',
    namespace: 'mesht',
    themeColor: '#0ea5e9',
    background: '#0f172a',
    display: 'standalone',
    icons: [],
    seo: {
      defaultTitle: 'MeshT Console',
      titleTemplate: '%s | MeshT',
      defaultDescription: 'Autonomous Engineering Grid Operations'
    }
  },
  assets: {
    globalStyles: [
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css'
    ]
  },
  build: {
    minify: false,
    sourcemap: true,
    srcDir: '.',
    entryPoint: './src/ui/client.ts',
    ssr: false
  },
  mesh: {
    network: {
      endpoints: [{ url: 'ws://localhost:5020', type: 'ws', priority: 1 }]
    },
    telemetry: {
      logLevel: 'warn',
      logging: {
        enabled: true,
        drains: ['mesh', 'console']
      },
      metrics: {
        enabled: true,
        console: { enabled: false, intervalMs: 60000 }
      },
      tracing: {
        enabled: false,
        exporters: ['console']
      }
    }
  },
  routing: {
    notFoundComponent: DashboardPage,
    errorBoundaryComponent: DashboardPage,
    routes: [
      { path: '/', component: DashboardPage },
      { path: '/projects', component: ProjectsPage },
      { path: '/directives', component: DirectivesPage },
      { path: '/gitflow', component: GitflowPage },
      { path: '/directive-trace', component: DirectiveTracePage },
      { path: '/personas', component: PersonasPage },
      { path: '/swarm', component: SwarmGridPage },
      { path: '/governance', component: GovernancePage },
      { path: '/memory', component: MemoryExplorerPage },
      { path: '/tools', component: ToolsPage },
      { path: '/workbench', component: ToolWorkbenchPage },
      { path: '/specialists', component: SpecialistConsolePage },
      { path: '/catalog', component: CatalogPage },
      { path: '/artifacts', component: ArtifactsPage },
      { path: '/telemetry', component: TelemetryPage }
    ]
  },
  navigation: {
    main: [
      { label: 'Dashboard', path: '/', icon: 'activity' },
      { label: 'Telemetry', path: '/telemetry', icon: 'radio' },
      { label: 'Projects', path: '/projects', icon: 'folder' },
      {
        label: 'Operations',
        icon: 'layers',
        children: [
          { label: 'Directives', path: '/directives', icon: 'list' },
          { label: 'Gitflow', path: '/gitflow', icon: 'git-branch' },
          { label: 'Artifacts', path: '/artifacts', icon: 'archive' },
          { label: 'Personas', path: '/personas', icon: 'users' },
          { label: 'Swarm', path: '/swarm', icon: 'grid' },
          { label: 'Governance', path: '/governance', icon: 'shield' },
        ]
      },
      {
        label: 'Development',
        icon: 'code',
        children: [
          { label: 'Workbench', path: '/workbench', icon: 'tool' },
          { label: 'Specialists', path: '/specialists', icon: 'terminal' },
          { label: 'Model Catalog', path: '/catalog', icon: 'cpu' },
          { label: 'Capabilities', path: '/tools', icon: 'settings' },
          { label: 'Memory', path: '/memory', icon: 'database' },
        ]
      }
    ],
    userMenu: []
  },
  state: {
    stores: []
  },
  security: {
    unauthorizedRedirectPath: '/'
  },
  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en']
  },
  initialState: {
    system: { status: 'idle', tickInterval: 0 },
    metrics: { directivesProcessed: 0, activeNodes: 0 },
    directives: { running: {}, queued: [], completed: [] },
    personas: [],
    nodes: {}
  }
};

export default MeshTManifest;
