# `sys.swarm` - Multi-Agent Task Delegation

This service provides basic capabilities for multi-node task delegation, allowing a directive that starts on one node to be handed off to another.

## Core Responsibilities

1.  **Node Discovery**: Use the `registry.listServices` action to find other nodes in the mesh that are capable of handling directives.
2.  **Node Selection**: Provide simple logic (currently random selection) to choose a target node for delegation.
3.  **Task Handover**: Emit a `sys.swarm.task_delegated` event to signal that a directive's ownership should be transferred.

## How It Works

This is a very simple and experimental service. It does not implement a robust distributed locking or handover protocol. When `delegateTask` is called, it simply finds another available node and emits an event. A more complete implementation would involve a consensus algorithm or a two-phase commit to ensure the target node has formally accepted ownership before the source node releases its lock.

## Key Actions

*   `sys.swarm.delegateTask`: Selects a target node and emits an event to signal a task handover.
*   `sys.swarm.status`: Returns basic statistics about the swarm.
