import { IContext, ILogger, IServiceBroker, IServiceSchema, IMeshApp } from '@flybyme/isomorphic-core';
import {
  EntityLookupParams,
  EntityLookupParamsSchema,
  LookupEntityResult,
  ScanProjectParams,
  ScanProjectParamsSchema,
  ScanProjectResult,
} from './radar.schema';
import { ExecResult } from '../sys.eng/eng.schema';

import './radar.contract';

/**
 * RadarService — The Grid Scanner.
 *
 * Scans the filesystem for architectural patterns and entities.
 * Maps the relationship between domains and personas.
 */
export class RadarService implements IServiceSchema {
  public readonly name = 'sys.int.radar';
  public logger: ILogger;
  public broker!: IServiceBroker;

  public actions = {
    scan_project: {
      params: ScanProjectParamsSchema,
      handler: this.scanProject.bind(this),
    },
    lookup_entity: {
      params: EntityLookupParamsSchema,
      handler: this.lookupEntity.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    this.logger = _logger;
  }

  async onInit(app: IMeshApp): Promise<void> {
    this.broker = app.getProvider<IServiceBroker>('broker');
    this.logger = app.getProvider<ILogger>('logger') || app.logger;
  }

  /**
   * Scans the project directory for interesting entities.
   * Maps service names and their provider location.
   */
  async scanProject(ctx: IContext<ScanProjectParams>): Promise<ScanProjectResult> {
    const { targetDir } = ScanProjectParamsSchema.parse(ctx.params);
    this.logger.info(`[sys.int.radar] Scanning project: ${targetDir}`);

    // Call shell_exec to get the project tree
    const treeRes = await ctx.call<ExecResult>('sys.eng.shell_exec', {
      command: `tree -L 3 ${targetDir}`,
      workDir: '.',
    });

    // Detect services via grep
    const findServices = await ctx.call<ExecResult>('sys.eng.shell_exec', {
      command: `grep -r "class .*Service" src/domains/ | grep ".service.ts"`,
      workDir: '.',
    });

    const entities = findServices.stdout.split('\n')
      .filter(l => l.trim())
      .map(line => {
        const parts = line.split(':');
        return { path: parts[0], definition: parts[1] };
      });

    return {
      tree: treeRes.stdout,
      entities,
    };
  }

  async lookupEntity(ctx: IContext<EntityLookupParams>): Promise<LookupEntityResult> {
    const { query } = EntityLookupParamsSchema.parse(ctx.params);
    this.logger.info(`[sys.int.radar] Looking up entity: ${query}`);

    const res = await ctx.call<ExecResult>('sys.eng.shell_exec', {
      command: `grep -rn "${query}" src/ --include="*.ts"`,
      workDir: '.',
    });

    const results = res.stdout.split('\n')
      .filter(l => l.trim())
      .map(line => {
        const [path, lineNo, ...content] = line.split(':');
        return { path, line: Number(lineNo), content: content.join(':') };
      });

    return { results };
  }
}

export default RadarService;
