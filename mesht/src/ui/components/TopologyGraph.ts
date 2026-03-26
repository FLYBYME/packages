// FILE: src/ui/components/TopologyGraph.ts
import {
  BrokerComponent, ComponentChild, BrokerDOM,
  IBaseUIProps
} from '@flybyme/isomorphic-ui';

interface NodePos {
  id: string;
  x: number;
  y: number;
  type: string;
  pulse: number;
}

interface RegistryNode {
  type?: string;
}

/**
 * TopologyGraph — A Canvas-based live visualizer for the MeshT swarm.
 * Animates nodes, heartbeats, and delegation flows.
 */
export class TopologyGraph extends BrokerComponent {
  private canvasRef?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private nodes: NodePos[] = [];
  private animationId?: number;

  constructor(props: IBaseUIProps = {}) {
    super('div', {
      className: 'topology-graph-container bg-dark rounded border shadow-sm overflow-hidden',
      style: { height: '500px', position: 'relative', background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)' },
      ...props
    });
  }

  override onMount(): void {
    super.onMount();
    const el = this.element;
    if (!el) return;

    this.canvasRef = document.createElement('canvas');
    this.canvasRef.style.width = '100%';
    this.canvasRef.style.height = '100%';
    el.appendChild(this.canvasRef);

    const context = this.canvasRef.getContext('2d');
    if (!context) return;
    this.ctx = context;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.startAnimation();
  }

  override dispose(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    super.dispose();
  }

  private resize() {
    if (!this.canvasRef || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvasRef.width = this.canvasRef.clientWidth * dpr;
    this.canvasRef.height = this.canvasRef.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private startAnimation() {
    const render = () => {
      this.updateNodes();
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private updateNodes() {
    const state = BrokerDOM.getStateService();
    const registry = state.getValue<Record<string, RegistryNode>>('$registry.nodes') || {};
    const ids = Object.keys(registry);

    // Sync node list
    this.nodes = ids.map((id, index) => {
      const existing = this.nodes.find(n => n.id === id);
      const angle = (index / ids.length) * Math.PI * 2;
      const radius = 150;
      const centerX = (this.canvasRef?.clientWidth || 0) / 2;
      const centerY = (this.canvasRef?.clientHeight || 0) / 2;

      return {
        id,
        type: registry[id].type || 'Worker',
        x: existing?.x || centerX + Math.cos(angle) * radius,
        y: existing?.y || centerY + Math.sin(angle) * radius,
        pulse: (existing?.pulse || 0) + 0.05
      };
    });
  }

  private draw() {
    if (!this.ctx || !this.canvasRef) return;
    const w = this.canvasRef.clientWidth;
    const h = this.canvasRef.clientHeight;

    this.ctx.clearRect(0, 0, w, h);

    // Draw grid background
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, h);
      this.ctx.stroke();
    }
    for (let j = 0; j < h; j += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, j);
      this.ctx.lineTo(w, j);
      this.ctx.stroke();
    }

    // Draw edges (connections to center/gateway)
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    this.ctx.lineWidth = 2;
    const centerX = w / 2;
    const centerY = h / 2;

    this.nodes.forEach(node => {
      this.ctx!.beginPath();
      this.ctx!.moveTo(centerX, centerY);
      this.ctx!.lineTo(node.x, node.y);
      this.ctx!.stroke();
    });

    // Draw Nodes
    this.nodes.forEach(node => {
      const isGateway = node.type === 'Gateway';
      const color = isGateway ? '#0ea5e9' : '#10b981';
      
      // Pulse effect
      const p = (Math.sin(node.pulse) + 1) / 2;
      this.ctx!.fillStyle = color + '22';
      this.ctx!.beginPath();
      this.ctx!.arc(node.x, node.y, 20 + p * 10, 0, Math.PI * 2);
      this.ctx!.fill();

      // Main Circle
      this.ctx!.fillStyle = color;
      this.ctx!.beginPath();
      this.ctx!.arc(node.x, node.y, 10, 0, Math.PI * 2);
      this.ctx!.fill();

      // Label
      this.ctx!.fillStyle = '#f8fafc';
      this.ctx!.font = 'bold 12px Inter, sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.fillText(node.id, node.x, node.y + 25);
      this.ctx!.font = '10px Inter, sans-serif';
      this.ctx!.fillStyle = '#94a3b8';
      this.ctx!.fillText(node.type, node.x, node.y + 38);
    });

    // Draw Center (Orchestrator/Gateway hub)
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('MESH HUB', centerX, centerY + 30);
  }

  build(): ComponentChild | ComponentChild[] {
    return []; // Canvas is managed via DOM ref in onMount
  }
}
