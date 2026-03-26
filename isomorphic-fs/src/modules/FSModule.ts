import { IMeshModule, IMeshApp, ILogger, IServiceBroker, IServiceSchema } from '@flybyme/isomorphic-core';
import { MeshFileSystem } from '../core/MeshFileSystem';
import { NodeFSProvider } from '../providers/NodeFSProvider';
import { FSService } from '../fs.service';
import * as path from 'path';
import * as os from 'os';

export interface FSModuleOptions {
    rootDir?: string;
    mounts?: Record<string, string>; // path -> provider name/nodeID? 
}

/**
 * FSModule — Connects the File System stack to the MeshApp context.
 */
export class FSModule implements IMeshModule {
    public readonly name = 'fs';
    public logger!: ILogger;
    public serviceBroker!: IServiceBroker;
    
    private vfs!: MeshFileSystem;
    private localProvider!: NodeFSProvider;

    constructor(private options: FSModuleOptions = {}) {}

    onInit(app: IMeshApp): void {
        this.logger = app.getProvider<ILogger>('logger') || app.logger;
        this.serviceBroker = app.getProvider<IServiceBroker>('broker');

        this.vfs = new MeshFileSystem();
        
        // 1. Initialize Local Provider
        const root = this.options.rootDir || path.join(os.homedir(), '.mesh', 'data');
        this.localProvider = new NodeFSProvider(root);
        this.vfs.setDefaultProvider(this.localProvider);

        // 2. Register Service
        const service = new FSService(this.vfs);
        app.registerService(service as unknown as IServiceSchema);

        // 3. Register Providers for DI
        app.registerProvider('fs:vfs', this.vfs);
        app.registerProvider('fs:local', this.localProvider);
        
        this.logger.info(`[FSModule] File system initialized at ${root}`);
    }

    async onStart(): Promise<void> { }
    async onStop(): Promise<void> { }
}
