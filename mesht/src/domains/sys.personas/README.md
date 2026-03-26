# `sys.personas` - The Agent Definition Service

This service manages the library of **Personas**, which are the specialized, LLM-based agents that perform the actual reasoning within the grid.

## Core Responsibilities

1.  **Persona Storage**: Maintain a database of all available personas.
2.  **Blueprint Resolution**: Provide a `getBlueprint` action that assembles everything an agent needs to operate: its core system prompt, its role, its personality traits, its allowed toolset, and its preferred LLM.
3.  **Lifecycle Management**: Allow for the creation, activation, and deactivation of personas.

## How It Works

Before `sys.dispatcher` can execute a cognition loop, it first calls `sys.personas.getBlueprint` with a persona alias (e.g., `ralph_core`). This service fetches the persona's definition from the database, resolves its `allowedTools` against the `sys.tools` registry, and resolves its preferred LLM against the `sys.catalog`. It returns a complete "package" that the dispatcher can use to construct the final prompt and configure the LLM call.

## Key Actions

*   `sys.personas.create`: Defines a new persona.
*   `sys.personas.getBlueprint`: Retrieves the complete, resolved definition for a persona.
*   `sys.personas.activate` / `deactivate`: Toggles the operational status of a persona.
*   `sys.personas.list`: Lists all available personas.
