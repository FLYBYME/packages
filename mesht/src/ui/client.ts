// FILE: src/ui/client.ts
import { MeshUI } from '@flybyme/isomorphic-ui';
import { MeshTManifest } from './mesht.manifest';

/**
 * [MeshT Console] Client Entry Point
 * Orchestrates the reactive UI, Mesh networking, and state management.
 */
MeshUI.bootstrap(MeshTManifest).catch(err => {
  console.error('[MeshUI] Critical Bootstrap Failure:', err);
});
