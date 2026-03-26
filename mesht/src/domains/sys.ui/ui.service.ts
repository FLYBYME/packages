import { ILogger, IServiceBroker, IServiceSchema, IMeshApp } from '@flybyme/isomorphic-core';
import { DeliveryService } from '@flybyme/isomorphic-cdn';
import { CompilerService, ManifestService } from '@flybyme/isomorphic-compiler';
import * as path from 'path';

/**
 * UIService — The MeshT Operations Console Host.
 * 
 * This domain manages the localized CDN (DeliveryService) and the
 * UI Compiler. It bootstraps the 'mesht-console' application
 * and serves it on port 3000.
 */
export class UIService implements IServiceSchema {
  public readonly name = 'sys.ui';
  public logger!: ILogger;
  public broker!: IServiceBroker;

  private delivery: DeliveryService;
  private compiler: CompilerService;
  private manifest: ManifestService;
  private assetOutputPath: string = process.env.MESH_ASSET_OUTPUT_PATH || '.builds';

  constructor(_logger: ILogger) {
    this.logger = _logger;
    this.delivery = new DeliveryService();
    this.compiler = new CompilerService();
    this.manifest = new ManifestService();
  }

  async onInit(app: IMeshApp): Promise<void> {
    this.broker = app.getProvider<IServiceBroker>('broker');
    this.logger = app.getProvider<ILogger>('logger') || app.logger;
  }

  /**
   * Post-registration hook to start internal services.
   */
  async started(): Promise<void> {
    this.logger.info(`[sys.ui] Initializing UI Stack (CDN + Compiler)...`);

    // 1. Register sub-services for mesh-wide access if needed
    await this.broker.registerService(this.delivery);
    await this.broker.registerService(this.compiler);
    await this.broker.registerService(this.manifest);

    // 2. Trigger initial build of the MeshT Console
    const manifestPath = path.join(process.cwd(), 'src/ui/mesht.manifest.ts');
    this.logger.info(`[sys.ui] Building console from: ${manifestPath}`);

    try {
      await this.broker.call('mesh.compiler.build_from_path', {
        manifestPath,
        watch: true,
        outputPath: this.assetOutputPath
      });
      this.logger.info(`[sys.ui] Dashboard build initiated successfully.`);
    } catch (err) {
      this.logger.error(`[sys.ui] Failed to initiate UI build: ${(err as Error).message}`);
    }

    this.logger.info(`[sys.ui] Dashboard available at http://localhost:3000`);
  }
}

export default UIService;
