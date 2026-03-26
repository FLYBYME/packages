import { MeshUI } from '@flybyme/isomorphic-ui';
import { TaskerManifest } from './tasker.manifest';

/**
 * [MeshTasker] Entry Point
 * Using the zero-config MeshUI framework orchestrator.
 * All dependencies, state, and routing are derived from the Manifest.
 */
MeshUI.bootstrap(TaskerManifest);

