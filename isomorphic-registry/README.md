# isomorphic-registry

A standalone, isomorphic service and node registry for decentralized networks. This library provides core primitives for tracking network topology, managing service lifecycles with dependency resolution, and multi-strategy load balancing.

## Features

- **Isomorphic**: Works in Node.js and modern Browsers.
- **Service Discovery**: Track nodes and their hosted services across the mesh.
- **Dependency Resolution**: Automatically pause/resume services based on available network dependencies.
- **Load Balancing**: Multiple strategies including Round Robin, Latency-aware, and CPU-aware selection.
- **Kademlia DHT**: Optional XOR-distance based routing for large-scale networks.
- **Strictly Typed**: Zero `any` usage with full Zod schema validation.

## Installation

```bash
npm install isomorphic-registry
```

## Quick Start

```typescript
import { ServiceRegistry, RoundRobinBalancer, ILogger } from '@flybyme/isomorphic-registry';

const logger: ILogger = { ... };
const registry = new ServiceRegistry('my-node-id', logger, {
    balancer: new RoundRobinBalancer(),
    preferLocal: true
});

// Register a node discovered via gossip/network
registry.registerNode({
    nodeID: 'remote-node',
    type: 'worker',
    namespace: 'default',
    addresses: ['ws://10.0.0.5:4000'],
    services: [
        { name: 'users', actions: { 'find': { visibility: 'public' } } }
    ],
    nodeSeq: 1,
    hostname: 'worker-1',
    timestamp: Date.now(),
    available: true
});

// Select the best node for an action
const node = registry.selectNode('users.find');
if (node) {
    console.log(`Call users.find on ${node.nodeID} at ${node.addresses[0]}`);
}
```

## Lifecycle Management

```typescript
import { ServiceLifecycle, ServiceInitializer } from '@flybyme/isomorphic-registry';

const lifecycle = new ServiceLifecycle(registry, logger);

const myService = ServiceInitializer.createInstance({
    name: 'orders',
    dependencies: ['users'], // Only runs if 'users' service is available in the mesh
    started: async () => { console.log('Orders service started'); },
    paused: async () => { console.log('Orders service paused (dependency lost)'); }
}, logger);

lifecycle.registerService(myService);
await lifecycle.startAll();
```

## License

MIT
