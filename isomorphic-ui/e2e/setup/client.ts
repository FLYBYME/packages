import { MeshUI, VirtualRouter } from '../../src';
import { TestManifest } from './test.manifest';

MeshUI.bootstrap(TestManifest);
(window as any).MeshUI = MeshUI;
(window as any).MeshUI.router = VirtualRouter;
