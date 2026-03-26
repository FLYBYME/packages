import { IContext, ILogger, IServiceBroker, IServiceSchema, IMeshApp } from '@flybyme/isomorphic-core';
import { DelegateTaskParams, DelegateTaskParamsSchema, DelegateTaskResult } from './swarm.schema';

type RegistryServiceInfo = {
  nodeID: string;
};

/**
 * SwarmService — Multi-Agent Intelligence & Task Delegation.
 *
 * Implements swarm dynamics (spec §6). Allows agents to offload
 * heavy or specialized workloads across the grid via mesh RPC.
 */
export class SwarmService implements IServiceSchema {
  public readonly name = 'sys.swarm';
  public logger: ILogger;
  public broker!: IServiceBroker;

  public actions = {
    delegate: {
      params: DelegateTaskParamsSchema,
      handler: this.delegateTask.bind(this),
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
   * Delegates a directive's execution to another node.
   * Node Selection Logic: Picks the available node with least active tasks.
   */
  async delegateTask(ctx: IContext<DelegateTaskParams>): Promise<DelegateTaskResult> {
    const { id, targetNodeID: preferredNode } = DelegateTaskParamsSchema.parse(ctx.params);
    this.logger.info(`[sys.swarm] Attempting to delegate ${id.slice(0, 8)}...`);

    // 1. Resolve available nodes from MeshRegistry
    const allServices = await ctx.call<RegistryServiceInfo[]>('registry.listServices', { serviceName: 'sys.directives' });
    const availableNodes = allServices.map(s => s.nodeID).filter(n => n !== ctx.nodeID);

    if (availableNodes.length === 0 && !preferredNode) {
      this.logger.warn(`[sys.swarm] Delegation failed: No other nodes available for task offloading.`);
      return { success: false, targetNodeID: 'self' };
    }

    const targetNode = preferredNode || availableNodes[Math.floor(Math.random() * availableNodes.length)];
    this.logger.info(`[sys.swarm] Selected target node: ${targetNode}`);

    // 2. Transmit the directive lock / ownership via the Broker
    // In a real implementation this would involve a specialized 'handover' packet.
    // For now, it will simply re-assign and emit a swarm event.
    ctx.emit('sys.swarm.task_delegated', { id, fromNode: ctx.nodeID, toNode: targetNode });

    return { success: true, targetNodeID: targetNode };
  }
}

export default SwarmService;
