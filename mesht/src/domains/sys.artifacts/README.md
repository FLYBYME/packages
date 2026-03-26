# `sys.artifacts` - The Protocol & Capability Registry

This service is the library of "blueprints" for the entire grid. It stores the definitions for both complex, multi-step tasks (Protocols) and single, atomic functions (Capabilities).

## Core Concepts

*   **Protocols**: A formal definition of a Finite State Machine (FSM). It defines a graph of nodes (states) and edges (transitions) that a directive will follow. Each node can invoke a specific **Persona** to reason and decide which edge to take.
*   **Capabilities**: The definition of a single tool that can be used by a Persona (e.g., `fs_read`, `git_status`). The capability defines the tool's name, description, and input parameters, but the implementation logic is handled by another service (like `sys.eng`).

## Core Responsibilities

1.  **Storage**: Persist all FSM manifests and tool definitions.
2.  **Validation**: Provide an action to validate that a protocol manifest is well-formed.
3.  **Resolution**: Allow other services (like `sys.directives`) to retrieve a protocol manifest by its ID during directive creation.

## Key Actions

*   `sys.artifacts.register`: Adds a new protocol or capability to the registry.
*   `sys.artifacts.get`: Retrieves a single artifact by its ID.
*   `sys.artifacts.find`: Lists all artifacts.
*   `sys.artifacts.validate`: Checks an FSM manifest for structural integrity.
