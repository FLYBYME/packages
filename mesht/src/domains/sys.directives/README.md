# `sys.directives` - The Task Lifecycle Engine

This is one of the most critical services in the grid. It manages the lifecycle of all **Directives**, from creation to completion. It is the source of truth for the current state of any given task.

## Core Responsibilities

1.  **Directive Management**: Provides full CRUD (Create, Read, Update, Delete) operations for directives.
2.  **State Machine Execution**: Implements the `step` action, which is the core function that advances a directive from one node to the next in its FSM protocol.
3.  **Locking**: Manages concurrency by providing `acquireLock` and `releaseLock` actions, ensuring that only one scheduler or node can work on a specific directive at a time.
4.  **Context Management**: Stores and allows modification of the `stateContext`, which is the shared memory or "scratchpad" for a directive's execution.

## How It Works

`sys.scheduler` queries this service to find directives that need work. When it finds one, it calls `sys.directives.step`. The `step` action then looks up the directive's current FSM node, finds the corresponding logic in the artifact manifest, and invokes the appropriate persona via `sys.dispatcher`. Based on the persona's `verdict`, it updates the directive's `currentNode` and `history` and releases the lock.

## Key Actions

*   `sys.directives.create`: Creates a new directive.
*   `sys.directives.get`: Retrieves a single directive.
*   `sys.directives.listByStatus`: Lists directives matching a specific status (e.g., 'running', 'paused').
*   `sys.directives.step`: Advances a directive one step in its FSM.
*   `sys.directives.updateContext`: Merges new data into a directive's `stateContext`.
*   `sys.directives.acquireLock` / `releaseLock`: Manages distributed locks.
*   `sys.directives.cancel`: Terminates a directive's execution.
