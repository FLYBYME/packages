import { 
  BrokerPage, ComponentChild, BrokerDOM, 
  Row, Col, Heading, NodeStatusCard
} from '@flybyme/isomorphic-ui';
import { TopologyGraph } from '../components/TopologyGraph';

export class SwarmGridPage extends BrokerPage {
  private topologyGraph = new TopologyGraph();

  public getSEO() { return { defaultTitle: 'Swarm' }; }
  public getPageConfig() { return { title: 'Swarm' }; }

  constructor() {
    super('div', { className: 'container-fluid py-4 bg-light' });
  }

  public async onEnter(): Promise<void> {
    this.logger.info('Swarm Grid entered. Visualizing node topology.');
  }

  public build(): ComponentChild[] {
    const state = BrokerDOM.getStateService();
    const nodes = state.getValue<Record<string, unknown>>('$registry.nodes') || {};
    const nodeIds = Object.keys(nodes).sort();

    return [
      new Heading(2, { text: 'Swarm Intelligence Grid', className: 'mb-4' }),
      
      // Phase 4: Live Topology Visualizer
      new Row({
        className: 'mb-4',
        children: new Col({
          span: 12,
          children: [
            new Heading(5, { text: 'Mesh Topology', className: 'mb-2 text-muted uppercase small fw-bold' }),
            this.topologyGraph
          ]
        })
      }),

      new Heading(5, { text: 'Node Registry', className: 'mb-3 text-muted uppercase small fw-bold' }),
      new Row({
        children: nodeIds.map(nodeId => new Col({
          span: 4,
          className: 'mb-4',
          children: new NodeStatusCard({ nodeId, showMetrics: true })
        }))
      })
    ];
  }
}
