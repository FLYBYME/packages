# `PersonasPage`

This page is for managing the agent **Personas** available to the grid, which are stored in `sys.personas`.

## Core Features

1.  **List Personas**: Displays a gallery of all registered personas as `Card` components.
2.  **Persona Details**: Each card shows the persona's alias, role, traits, and status (`active` or `dormant`).
3.  **Activate/Deactivate**: A button on each card to toggle the persona's status by calling `sys.personas.activate` or `sys.personas.deactivate`.
4.  **Configuration Modal**: An "Edit" button opens a modal that displays the full configuration of a persona, including its system prompt and allowed tools. This is currently a read-only view.
5.  **Create New Persona**: A button that opens a modal with a form to define and register a new persona by calling `sys.personas.create`.

## How It Works

*   The page fetches all personas from `sys.personas.list` upon entering.
*   The "Activate" and "Deactivate" buttons directly call the respective actions and then refresh the list to show the updated status.
*   The "Edit" button populates the configuration modal by fetching the full persona blueprint via `sys.personas.getBlueprint`.
