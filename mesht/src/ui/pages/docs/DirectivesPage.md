# `DirectivesPage`

This page is the main operational view for managing and monitoring all active, paused, and pending tasks (directives) in the grid.

## Core Features

1.  **Directive DataTable**: Displays a real-time table of all directives, showing key information like ID, Title, Project, Status, Current FSM Node, and Assigned Persona.
2.  **Manual Controls**: Provides a set of buttons for each directive to manually intervene in its lifecycle:
    *   **Inspect**: Opens the `LiveInspector` modal.
    *   **Trace**: Navigates to the `DirectiveTracePage` for a deep dive into the agent's reasoning.
    *   **Pause**: Pauses a `running` directive.
    *   **Resume**: Resumes a `paused` directive.
    *   **Cancel**: Terminates a directive.
3.  **Create Directive**: A modal form that allows for the creation of a new, detailed directive with a specific title, objective, and project context.

## How It Works

*   The page fetches all directives from `sys.directives.list` on enter and subscribes to events like `sys.directives.created` and `sys.directives.step_completed` to keep the data table live without polling.
*   The action buttons (`Pause`, `Resume`, etc.) make direct RPC calls to the corresponding actions in `sys.directives`.
*   The **Inspect** button sets a global state variable (`ui.selectedDirectiveID`) which causes the `LiveInspector` modal to become visible and start fetching data for that specific directive.
*   The **Trace** button navigates to the trace page, passing the directive ID as a query parameter.
