# `sys.audit` - The Historian

The `sys.audit` service provides a domain-agnostic, immutable audit trail for all significant events within the MeshT grid. It acts as the system's historian, logging every action taken by any node or agent.

## Core Responsibilities

1.  **Immutable Logging**: To record every important mutation, RPC call, or state transition that occurs in the mesh.
2.  **Traceability**: To provide a clear, chronological history of events for debugging, security analysis, and operational review.
3.  **Data Source**: To serve as the primary data source for UI components like the `AuditTrailTable`.

## How It Works

Any service in the mesh can call the `sys.audit.log` action to record an event. The logger captures:
*   **Timestamp**: When the event occurred.
*   **Actor**: Who or what initiated the action (Node ID, Persona ID).
*   **Domain & Action**: The service and action that were called (e.g., `sys.tools.invoke`).
*   **Payload**: The parameters that were passed to the action.
*   **Status**: Whether the action succeeded or failed.

The service uses a simple, append-only persistence strategy, making it a reliable source of truth.

## Key Actions

*   `sys.audit.log`: Records a new audit entry.
*   `sys.audit.query`: Retrieves a list of audit entries based on a filter.
*   `sys.audit.purge`: Archives or removes old log entries based on a retention policy.
