# `DashboardPage`

This is the main landing page for the MeshT Operations Grid. It provides a high-level, at-a-glance overview of the system's status and recent activity.

## Core Features

1.  **Metric Cards**: Displays key operational metrics:
    *   **Grid Status**: The current state of the `sys.scheduler` (e.g., `running`, `paused`, `idle`).
    *   **Active Project**: The currently active project workspace from `sys.projects`.
    *   **Mesh Nodes**: The number of connected nodes in the peer-to-peer network.
2.  **Quick Directive Form**: A simple form to quickly submit a new high-level objective to the grid without needing to fill out all the details of a formal directive. It calls `sys.interface.submit`.
3.  **Recent Audit Trail**: Shows a table of the last 10-15 significant events that have occurred across the grid, powered by the `AuditTrailTable` component which fetches data from `sys.audit`.
4.  **Header Actions**: Provides global buttons in the main application header for critical system-wide actions, such as:
    *   **Manual Tick**: Manually triggers one heartbeat of the `sys.scheduler`.
    *   **Start/Stop Scheduler**: Globally starts or stops the grid's autonomous operation.

## How It Works

*   On page enter (`onEnter`), the dashboard makes several parallel calls to different services (`sys.scheduler.status`, `sys.audit.query`, `sys.projects.status`, etc.) to populate its initial state.
*   It uses reactive state bindings (`$state.system.status`) so that the metric cards and other UI elements update automatically when the underlying data changes, without needing a full page refresh.
